// Stockfish 19 (lite, single-threaded WASM) running in a classic Web Worker.
// The worker script and its .wasm are copied to public/stockfish/ by
// `npm run copy-engine`; the worker finds the .wasm next to itself.
import type { CreateEngine, Engine } from './contracts';

const ENGINE_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`;
const READY_TIMEOUT_MS = 20_000;
const DEFAULT_MOVETIME_MS = 700;
const SEARCH_GRACE_MS = 10_000;
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

type Phase = 'booting' | 'ready' | 'failed' | 'disposed';

interface Search {
  resolve(move: string | null): void;
  reject(err: Error): void;
  timer: ReturnType<typeof setTimeout> | undefined;
  /** True once `position`/`go` were sent; only then does a `bestmove` belong to it. */
  started: boolean;
}

export const createEngine: CreateEngine = (): Engine => {
  let phase: Phase = 'booting';
  let terminalError: Error | null = null;
  let worker: Worker | null = null;
  let search: Search | null = null;
  let sawUciok = false;
  let readyTimer: ReturnType<typeof setTimeout> | undefined;
  let readyHandlers: { resolve(): void; reject(err: Error): void } | null = null;

  const readyPromise = new Promise<void>((resolve, reject) => {
    readyHandlers = { resolve, reject };
  });
  // Callers may never call ready(); a boot failure must not surface as an
  // unhandled rejection. Callers that do call ready() still see the rejection.
  readyPromise.catch(() => {});

  function rejectTerminal<T>(): Promise<T> {
    const message = terminalError?.message ?? 'Stockfish engine is not available';
    return Promise.reject(new Error(message));
  }

  /** Terminates the worker and rejects all pending work. Runs at most once. */
  function shutdown(next: 'failed' | 'disposed', err: Error): void {
    if (phase === 'failed' || phase === 'disposed') return;
    phase = next;
    terminalError = err;
    clearTimeout(readyTimer);
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      worker = null;
    }
    const ready = readyHandlers;
    readyHandlers = null;
    ready?.reject(err);
    const pending = search;
    search = null;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
  }

  function fail(detail: string): void {
    shutdown('failed', new Error(`Stockfish engine failed: ${detail}`));
  }

  function send(command: string): void {
    if (!worker) return;
    try {
      worker.postMessage(command);
    } catch (e) {
      fail(`could not send "${command}" (${e instanceof Error ? e.message : String(e)})`);
    }
  }

  function onBestMove(line: string): void {
    const pending = search;
    if (!pending || !pending.started) return; // stale or unsolicited; ignore
    const token = line.split(/\s+/)[1];
    if (token === '(none)' || token === '0000') {
      search = null;
      clearTimeout(pending.timer);
      pending.resolve(null);
    } else if (token !== undefined && UCI_MOVE.test(token)) {
      search = null;
      clearTimeout(pending.timer);
      pending.resolve(token);
    } else {
      fail(`unexpected engine output "${line}"`);
    }
  }

  function onLine(line: string): void {
    if (phase === 'booting') {
      if (line === 'uciok' && !sawUciok) {
        sawUciok = true;
        send('ucinewgame');
        send('isready');
      } else if (line === 'readyok' && sawUciok) {
        phase = 'ready';
        clearTimeout(readyTimer);
        const ready = readyHandlers;
        readyHandlers = null;
        ready?.resolve();
      }
      return;
    }
    if (phase === 'ready' && (line === 'bestmove' || line.startsWith('bestmove '))) {
      onBestMove(line);
    }
    // `info ...` and every other line are ignored.
  }

  try {
    worker = new Worker(ENGINE_URL);
  } catch (e) {
    fail(`could not start worker (${e instanceof Error ? e.message : String(e)})`);
  }

  if (worker) {
    worker.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return;
      for (const raw of ev.data.split(/\r?\n/)) {
        const line = raw.trim();
        if (line) onLine(line);
        if (phase === 'failed' || phase === 'disposed') return;
      }
    };
    worker.onerror = (ev: ErrorEvent) => {
      fail(`worker error (${ev.message || 'script or WASM failed to load'})`);
    };
    worker.onmessageerror = () => {
      fail('worker sent a message that could not be deserialized');
    };
    readyTimer = setTimeout(() => {
      if (phase === 'booting') fail(`no uciok/readyok within ${READY_TIMEOUT_MS} ms`);
    }, READY_TIMEOUT_MS);
    send('uci');
  }

  return {
    ready(): Promise<void> {
      if (phase === 'failed' || phase === 'disposed') return rejectTerminal();
      return readyPromise;
    },

    bestMove(moves: string[], movetimeMs: number = DEFAULT_MOVETIME_MS): Promise<string | null> {
      if (phase === 'failed' || phase === 'disposed') return rejectTerminal();
      if (search) {
        return Promise.reject(new Error('Stockfish search already in progress'));
      }
      if (!Array.isArray(moves)) {
        return Promise.reject(new Error('bestMove: moves must be an array of UCI strings'));
      }
      const badIndex = moves.findIndex((m) => typeof m !== 'string' || !UCI_MOVE.test(m));
      if (badIndex !== -1) {
        return Promise.reject(
          new Error(`bestMove: invalid UCI move at index ${badIndex}: ${JSON.stringify(moves[badIndex])}`),
        );
      }
      if (typeof movetimeMs !== 'number' || !Number.isFinite(movetimeMs) || movetimeMs <= 0) {
        return Promise.reject(new Error(`bestMove: invalid movetime ${String(movetimeMs)}`));
      }
      const movetime = Math.max(1, Math.round(movetimeMs));
      const position = moves.length ? `position startpos moves ${moves.join(' ')}` : 'position startpos';

      return new Promise<string | null>((resolve, reject) => {
        const pending: Search = { resolve, reject, timer: undefined, started: false };
        search = pending;
        readyPromise.then(
          () => {
            // Disposed or failed while waiting: shutdown() already rejected it.
            if (search !== pending || phase !== 'ready') return;
            pending.started = true;
            pending.timer = setTimeout(() => {
              if (search === pending) fail(`no bestmove within ${movetime + SEARCH_GRACE_MS} ms`);
            }, movetime + SEARCH_GRACE_MS);
            send(position);
            send(`go movetime ${movetime}`);
          },
          () => {
            // Boot failed or engine disposed: shutdown() already rejected it.
          },
        );
      });
    },

    dispose(): void {
      shutdown('disposed', new Error('Stockfish engine was disposed'));
      phase = 'disposed';
    },
  };
};
