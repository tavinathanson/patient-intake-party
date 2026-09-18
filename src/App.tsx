import { Fragment, useEffect, useRef, useState } from 'react';
import { Chess, type Square as ChessSquare } from 'chess.js';
import { ChessBoard } from './ChessBoard';
import { IntakePanel } from './IntakePanel';
import { createEngine } from './engine';
import {
  EMPTY_ANSWERS,
  FIELDS,
  PATIENT,
  type Answers,
  type Engine,
  type FieldId,
  type Square,
} from './contracts';
import './App.css';

const ENGINE_MOVETIME_MS = 600;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const UCI_MOVE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

/** a8, b8, … h8, a7, … h1 — the order the starting letters are laid out in. */
const SQUARES_A8_TO_H1: Square[] = [8, 7, 6, 5, 4, 3, 2, 1].flatMap((rank) =>
  [...'abcdefgh'].map((file) => `${file}${rank}`),
);

type Letters = Record<Square, string>;

function initialLetters(): Letters {
  return Object.fromEntries(SQUARES_A8_TO_H1.map((sq, i) => [sq, ALPHABET[i % ALPHABET.length]]));
}

/** Fisher–Yates shuffle of the current 64 letters (same multiset, new squares). */
function shuffleLetters(current: Letters): Letters {
  const pool = SQUARES_A8_TO_H1.map((sq) => current[sq]);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return Object.fromEntries(SQUARES_A8_TO_H1.map((sq, i) => [sq, pool[i]]));
}

type EngineStatus = 'loading' | 'ready' | 'thinking' | 'error' | 'stopped';

type Outcome =
  | { kind: 'playing'; inCheck: boolean }
  | { kind: 'checkmate'; winner: 'w' | 'b' }
  | { kind: 'draw'; reason: string };

function outcomeOf(game: Chess): Outcome {
  if (game.isCheckmate()) return { kind: 'checkmate', winner: game.turn() === 'w' ? 'b' : 'w' };
  if (game.isStalemate()) return { kind: 'draw', reason: 'stalemate' };
  if (game.isInsufficientMaterial()) return { kind: 'draw', reason: 'insufficient material' };
  if (game.isThreefoldRepetition()) return { kind: 'draw', reason: 'threefold repetition' };
  if (game.isDrawByFiftyMoves()) return { kind: 'draw', reason: 'the fifty-move rule' };
  return { kind: 'playing', inCheck: game.inCheck() };
}

function questionFor(id: FieldId): string {
  return FIELDS.find((f) => f.id === id)!.question;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default function App() {
  // chess.js is the authoritative game state. The instance lives for a whole
  // game so its history can detect threefold repetition.
  const [initialGame] = useState(() => new Chess());
  const gameRef = useRef(initialGame);
  const uciHistoryRef = useRef<string[]>([]);
  const engineRef = useRef<Engine | null>(null);
  // Bumped whenever the engine is replaced or play stops; replies carrying an
  // older generation are ignored.
  const generationRef = useRef(0);
  // Held from the moment a human move is accepted until Black's reply lands.
  const moveLockRef = useRef(false);
  const submittedRef = useRef(false);

  const [fen, setFen] = useState(() => gameRef.current.fen());
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'playing', inCheck: false });
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('loading');
  const [engineError, setEngineError] = useState<string | null>(null);

  const [letters, setLettersState] = useState<Letters>(initialLetters);
  const lettersRef = useRef(letters);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [activeField, setActiveFieldState] = useState<FieldId>('name');
  const activeFieldRef = useRef(activeField);
  const [lastTyped, setLastTyped] = useState<{ letter: string; field: FieldId } | null>(null);
  const [legalMovesPlayed, setLegalMovesPlayed] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const summaryButtonRef = useRef<HTMLButtonElement>(null);

  function setLetters(next: Letters) {
    lettersRef.current = next;
    setLettersState(next);
  }

  function setActiveField(id: FieldId) {
    activeFieldRef.current = id;
    setActiveFieldState(id);
  }

  function clearSelection() {
    setSelectedSquare(null);
    setLegalTargets([]);
  }

  function failEngine(err: unknown) {
    generationRef.current++;
    engineRef.current?.dispose();
    engineRef.current = null;
    setEngineError(errorMessage(err));
    setEngineStatus('error');
  }

  /** Asks the current engine for Black's reply to the current history. */
  function requestEngineReply() {
    const engine = engineRef.current;
    if (!engine) return;
    const generation = generationRef.current;
    setEngineStatus('thinking');
    engine.bestMove([...uciHistoryRef.current], ENGINE_MOVETIME_MS).then(
      (uci) => {
        if (generation !== generationRef.current) return;
        applyEngineMove(uci);
      },
      (err) => {
        if (generation !== generationRef.current) return;
        failEngine(err);
      },
    );
  }

  function applyEngineMove(uci: string | null) {
    const game = gameRef.current;
    const parsed = uci ? UCI_MOVE.exec(uci) : null;
    if (!uci || !parsed || game.turn() !== 'b') {
      failEngine(new Error(`Stockfish returned an unusable move: ${uci ?? '(none)'}`));
      return;
    }
    const [, from, to, promotion] = parsed;
    const legal = game
      .moves({ verbose: true })
      .some((m) => m.from === from && m.to === to && (m.promotion ?? '') === (promotion ?? ''));
    if (!legal) {
      failEngine(new Error(`Stockfish returned an illegal move: ${uci}`));
      return;
    }
    game.move({ from, to, promotion });
    uciHistoryRef.current.push(uci);
    setFen(game.fen());
    setLastMove({ from, to });
    setOutcome(outcomeOf(game));
    moveLockRef.current = false;
    setEngineStatus('ready');
  }

  /** Replaces the engine with a fresh instance; resumes Black's turn if owed. */
  function bootEngine() {
    const generation = ++generationRef.current;
    engineRef.current?.dispose();
    const engine = createEngine();
    engineRef.current = engine;
    setEngineError(null);
    setEngineStatus('loading');
    engine.ready().then(
      () => {
        if (generation !== generationRef.current) return;
        const game = gameRef.current;
        if (!game.isGameOver() && game.turn() === 'b') requestEngineReply();
        else setEngineStatus('ready');
      },
      (err) => {
        if (generation !== generationRef.current) return;
        failEngine(err);
      },
    );
  }

  /** Stops the engine and invalidates any reply still in flight. */
  function stopEngine() {
    generationRef.current++;
    engineRef.current?.dispose();
    engineRef.current = null;
  }

  useEffect(() => {
    bootEngine();
    return stopEngine;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (submitted) summaryButtonRef.current?.focus();
  }, [submitted]);

  const boardLive =
    !submitted && engineStatus === 'ready' && outcome.kind === 'playing' && fen.split(' ')[1] === 'w';

  function tryHumanMove(from: Square, to: Square) {
    // Lock synchronously, before anything else can run.
    if (moveLockRef.current) return;
    moveLockRef.current = true;
    const game = gameRef.current;
    let move;
    try {
      move = game.move({ from, to, promotion: 'q' });
    } catch {
      moveLockRef.current = false;
      clearSelection();
      return;
    }

    // Accepted: capture the field and the letter as they are right now.
    const field = activeFieldRef.current;
    const letter = lettersRef.current[move.to];
    setAnswers((prev) => ({ ...prev, [field]: prev[field] + letter }));
    setLastTyped({ letter, field });
    setLegalMovesPlayed((n) => n + 1);

    uciHistoryRef.current.push(move.from + move.to + (move.promotion ?? ''));
    clearSelection();
    setFen(game.fen());
    setLastMove({ from: move.from, to: move.to });
    const next = outcomeOf(game);
    setOutcome(next);
    if (next.kind !== 'playing') return; // game over: nothing to ask Stockfish
    requestEngineReply();
  }

  function handleSquareClick(square: Square) {
    if (!boardLive || moveLockRef.current || submittedRef.current) return;
    const game = gameRef.current;
    if (game.turn() !== 'w') return;

    if (selectedSquare && square !== selectedSquare && legalTargets.includes(square)) {
      tryHumanMove(selectedSquare, square);
      return;
    }
    const piece = game.get(square as ChessSquare);
    if (piece?.color === 'w' && square !== selectedSquare) {
      const targets = game.moves({ square: square as ChessSquare, verbose: true }).map((m) => m.to);
      setSelectedSquare(square);
      setLegalTargets([...new Set(targets)]);
      return;
    }
    clearSelection();
  }

  function resetBoard() {
    gameRef.current = new Chess();
    uciHistoryRef.current = [];
    moveLockRef.current = false;
    clearSelection();
    setFen(gameRef.current.fen());
    setLastMove(null);
    setOutcome({ kind: 'playing', inCheck: false });
  }

  /** New game, same answers and letters. */
  function rematch() {
    if (submittedRef.current) return;
    resetBoard();
    bootEngine();
  }

  /** Everything back to the first screen. */
  function fullReset() {
    submittedRef.current = false;
    setSubmitted(false);
    resetBoard();
    setAnswers(EMPTY_ANSWERS);
    setActiveField('name');
    setLetters(initialLetters());
    setLastTyped(null);
    setLegalMovesPlayed(0);
    bootEngine();
  }

  function retryEngine() {
    if (submittedRef.current) return;
    bootEngine();
  }

  const canReroll =
    !submitted && outcome.kind === 'playing' && engineStatus !== 'thinking' && fen.split(' ')[1] === 'w';

  function reroll() {
    if (!canReroll || moveLockRef.current || gameRef.current.turn() !== 'w') return;
    setLetters(shuffleLetters(lettersRef.current));
  }

  function handleSpace() {
    if (submittedRef.current) return;
    const field = activeFieldRef.current;
    setAnswers((prev) => ({ ...prev, [field]: prev[field] + ' ' }));
  }

  function handleBackspace() {
    if (submittedRef.current) return;
    const field = activeFieldRef.current;
    setAnswers((prev) => ({ ...prev, [field]: prev[field].slice(0, -1) }));
  }

  function handleSelectField(id: FieldId) {
    if (submittedRef.current) return;
    setActiveField(id);
  }

  function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    stopEngine();
    moveLockRef.current = true;
    clearSelection();
    setEngineStatus('stopped');
    setSubmitted(true);
  }

  // ---- presentation -------------------------------------------------------

  const nextQuestion = questionFor(activeField);
  const typedHint = lastTyped ? `You typed “${lastTyped.letter}” into “${questionFor(lastTyped.field)}”.` : null;

  let status: string;
  let statusLabel: string;
  let message: string;
  let hint: string;
  if (submitted) {
    status = 'submitted';
    statusLabel = 'FILED';
    message = 'Intake submitted. The battle is over.';
    hint = 'Your answers are in the summary.';
  } else if (engineStatus === 'error') {
    status = 'error';
    statusLabel = 'ENGINE DOWN';
    message = `Stockfish failed: ${engineError ?? 'unknown error'}`;
    hint = 'No fake moves here. Retry the engine to continue this game.';
  } else if (outcome.kind === 'checkmate') {
    status = 'checkmate';
    statusLabel = outcome.winner === 'w' ? 'DEFEATED' : 'CHECKMATE';
    message =
      outcome.winner === 'w'
        ? 'CHECKMATE! You beat Stockfish. The front desk is stunned.'
        : 'Checkmate. Stockfish wins this round.';
    hint = 'Your answers are safe. REMATCH keeps them; FULL RESET clears everything.';
  } else if (outcome.kind === 'draw') {
    status = 'draw';
    statusLabel = 'DRAW';
    message = `Draw by ${outcome.reason}.`;
    hint = 'Your answers are safe. REMATCH keeps them; FULL RESET clears everything.';
  } else if (engineStatus === 'loading') {
    status = 'loading';
    statusLabel = 'SUMMONING…';
    message = 'Summoning Stockfish…';
    hint = 'The board unlocks when the engine is ready.';
  } else if (engineStatus === 'thinking') {
    status = 'thinking';
    statusLabel = 'CASTING…';
    message = outcome.inCheck ? 'CHECK! Stockfish is thinking…' : 'Stockfish is thinking…';
    hint = [typedHint, "Black's moves type nothing."].filter(Boolean).join(' ');
  } else if (outcome.inCheck) {
    status = 'check';
    statusLabel = 'CHECK!';
    message = `CHECK! Save your king. Next letter goes to: ${nextQuestion}`;
    hint = typedHint ?? 'Pick a white piece, then a highlighted square.';
  } else {
    status = 'ready';
    statusLabel = 'YOUR TURN';
    message = `Your move. Next letter goes to: ${nextQuestion}`;
    hint = typedHint ?? 'Pick a white piece, then a highlighted square. You type the letter you land on.';
  }

  const gameOver = outcome.kind !== 'playing';
  const resultText =
    outcome.kind === 'checkmate'
      ? outcome.winner === 'w'
        ? 'Patient won by checkmate'
        : 'Stockfish won by checkmate'
      : outcome.kind === 'draw'
        ? `Draw by ${outcome.reason}`
        : 'Game in progress';

  return (
    <div className="app">
      <header className="app-header" inert={submitted}>
        <h1 className="app-title">CHECKMATE CHECK-IN</h1>
        <p className="app-subtitle">Every legal move earns one letter.</p>
        <div className="app-patient jrpg-window">
          <span className="app-patient-name">{PATIENT.name.toUpperCase()}</span>
          <span className="app-patient-meta">
            {PATIENT.ageSex} · {PATIENT.visit}
          </span>
          <span className="app-patient-meta">Booked for: {PATIENT.bookedFor}</span>
        </div>
      </header>
      <main className="app-main" inert={submitted}>
        <section className="app-battle" aria-label="Chess battle">
          <div className="app-enemy jrpg-window">
            <span className="app-enemy-name">STOCKFISH 19</span>
            <span className={`app-status app-status--${status}`}>{statusLabel}</span>
          </div>
          <div className="app-board-frame">
            <ChessBoard
              fen={fen}
              letters={letters}
              selectedSquare={selectedSquare}
              legalTargets={legalTargets}
              lastMove={lastMove}
              disabled={!boardLive}
              onSquareClick={handleSquareClick}
            />
          </div>
          <div className="app-message jrpg-window" role="status" aria-live="polite">
            <p className="app-message-text">{message}</p>
            <p className="app-message-hint">{hint}</p>
            <div className="app-controls">
              {engineStatus === 'error' && !submitted && (
                <button type="button" className="jrpg-btn jrpg-btn--primary" onClick={retryEngine}>
                  RETRY ENGINE
                </button>
              )}
              {gameOver && !submitted && (
                <button type="button" className="jrpg-btn jrpg-btn--primary" onClick={rematch}>
                  REMATCH
                </button>
              )}
              <button type="button" className="jrpg-btn" onClick={reroll} disabled={!canReroll}>
                REROLL LETTERS
              </button>
              <button type="button" className="jrpg-btn jrpg-btn--danger" onClick={fullReset}>
                FULL RESET
              </button>
            </div>
          </div>
        </section>
        <aside className="app-intake" aria-label="Intake form">
          <IntakePanel
            answers={answers}
            activeField={activeField}
            onSelectField={handleSelectField}
            onSpace={handleSpace}
            onBackspace={handleBackspace}
            onSubmit={handleSubmit}
            disabled={submitted}
          />
        </aside>
      </main>
      {submitted && (
        <div className="app-summary-backdrop">
          <section
            className="app-summary jrpg-window"
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-title"
          >
            <h2 id="summary-title" className="app-summary-title">
              INTAKE SUBMITTED
            </h2>
            <p className="app-summary-meta">
              {PATIENT.name} · {PATIENT.ageSex} · {legalMovesPlayed} legal{' '}
              {legalMovesPlayed === 1 ? 'move' : 'moves'} · {resultText}
            </p>
            <dl className="app-summary-list">
              {FIELDS.map((f) => (
                <Fragment key={f.id}>
                  <dt>{f.question}</dt>
                  <dd>
                    {answers[f.id].trim() ? (
                      answers[f.id]
                    ) : (
                      <em className="app-summary-empty">(left blank)</em>
                    )}
                  </dd>
                </Fragment>
              ))}
            </dl>
            <div className="app-summary-actions">
              <button
                ref={summaryButtonRef}
                type="button"
                className="jrpg-btn jrpg-btn--primary"
                onClick={fullReset}
              >
                START OVER
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
