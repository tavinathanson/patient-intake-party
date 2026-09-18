// Shared interfaces for CHECKMATE CHECK-IN. Every module codes against these;
// change them only through the coordinator.

/** Board square in algebraic notation, lowercase: "a8" ... "h1". */
export type Square = string;

// ---------------------------------------------------------------------------
// 1. Engine (src/engine.ts)
// ---------------------------------------------------------------------------

/**
 * A single Stockfish instance running in a Web Worker.
 *
 * - `ready()` resolves once the engine has answered `uciok` and `readyok`.
 *   It rejects if the worker fails to load or does not answer in time.
 * - `bestMove(moves, movetimeMs)` searches the position reached by playing
 *   `moves` (UCI strings such as "e2e4" or "e7e8q") from the standard start
 *   position. Resolves with a UCI move, or `null` when the engine reports no
 *   legal move. Only one search runs at a time; a call made while a search is
 *   pending rejects.
 * - `dispose()` terminates the worker and rejects every pending promise.
 *   A disposed engine is never reused; create a new one after a game reset.
 */
export interface Engine {
  ready(): Promise<void>;
  bestMove(moves: string[], movetimeMs?: number): Promise<string | null>;
  dispose(): void;
}

export type CreateEngine = () => Engine;

// ---------------------------------------------------------------------------
// 2. Board (src/ChessBoard.tsx)
// ---------------------------------------------------------------------------

export interface ChessBoardProps {
  /** Current position. White is always at the bottom. */
  fen: string;
  /** Uppercase A–Z letter for every one of the 64 squares, keyed "a1".."h8". */
  letters: Record<Square, string>;
  selectedSquare: Square | null;
  legalTargets: Square[];
  lastMove: { from: Square; to: Square } | null;
  /** When true, clicks are ignored and the board looks inert. */
  disabled: boolean;
  onSquareClick(square: Square): void;
}

// ---------------------------------------------------------------------------
// 3. Intake panel (src/IntakePanel.tsx)
// ---------------------------------------------------------------------------

export interface IntakePanelProps {
  /** Answer text per field id; every FIELDS id is present. */
  answers: Record<FieldId, string>;
  activeField: FieldId;
  onSelectField(id: FieldId): void;
  onSpace(): void;
  onBackspace(): void;
  onSubmit(): void;
  /** When true, every control is inert (after Submit). */
  disabled: boolean;
}

// ---------------------------------------------------------------------------
// 4. Fields
// ---------------------------------------------------------------------------

export const FIELDS = [
  { id: 'name', question: 'What is your name?' },
  { id: 'reason', question: 'What brings you in today?' },
  { id: 'medications', question: 'What medications do you take?' },
  { id: 'allergies', question: 'Any allergies?' },
] as const;

export type FieldId = (typeof FIELDS)[number]['id'];

export type Answers = Record<FieldId, string>;

export const EMPTY_ANSWERS: Answers = {
  name: '',
  reason: '',
  medications: '',
  allergies: '',
};

// ---------------------------------------------------------------------------
// Scenario (synthetic patient from patients/strained-back)
// ---------------------------------------------------------------------------

export const PATIENT = {
  name: 'Kiwi Parsnip',
  ageSex: '44 / M',
  visit: 'Walk-in, blank chart',
  bookedFor: '“back pain, want a PT referral”',
} as const;
