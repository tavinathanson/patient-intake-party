import { useMemo, type KeyboardEvent } from 'react';
import type { ChessBoardProps, Square } from './contracts';
import { MoveGem, PieceSprite, type PieceColor, type PieceType } from './pieces';
import './ChessBoard.css';

const FILES = 'abcdefgh';
const PIECE_TYPES = 'pnbrqk';
const PIECE_NAMES: Record<PieceType, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

/** Squares in reading order: a8 top-left ... h1 bottom-right (White at the bottom). */
const SQUARES: Square[] = Array.from({ length: 64 }, (_, i) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}`);

interface Piece {
  type: PieceType;
  color: PieceColor;
}

/** Reads the placement field of a FEN. Malformed input yields fewer pieces, never a throw. */
function parsePlacement(fen: string): Map<Square, Piece> {
  const pieces = new Map<Square, Piece>();
  const ranks = (fen ?? '').trim().split(/\s+/)[0].split('/');
  for (let r = 0; r < Math.min(ranks.length, 8); r++) {
    let file = 0;
    for (const ch of ranks[r]) {
      if (file > 7) break;
      if (ch >= '1' && ch <= '8') {
        file += Number(ch);
        continue;
      }
      const type = ch.toLowerCase();
      if (PIECE_TYPES.includes(type)) {
        pieces.set(`${FILES[file]}${8 - r}`, { type: type as PieceType, color: ch === type ? 'b' : 'w' });
      }
      file++;
    }
  }
  return pieces;
}

const ARROW_STEPS: Record<string, [number, number]> = {
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

export function ChessBoard(props: ChessBoardProps) {
  const { fen, letters, selectedSquare, legalTargets, lastMove, disabled, onSquareClick } = props;

  const pieces = useMemo(() => parsePlacement(fen), [fen]);
  const targets = useMemo(() => new Set(legalTargets), [legalTargets]);

  // Roving focus: one square is in the tab order, arrow keys move between squares.
  const tabStop = selectedSquare ?? 'e2';

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = ARROW_STEPS[event.key];
    const from = (event.target as HTMLElement).dataset?.square;
    if (!step || !from) return;
    const file = FILES.indexOf(from[0]) + step[0];
    const rank = Number(from[1]) + step[1];
    if (file < 0 || file > 7 || rank < 1 || rank > 8) return;
    event.preventDefault();
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-square="${FILES[file]}${rank}"]`)?.focus();
  }

  return (
    <div
      className={`cb-board${disabled ? ' cb-board--disabled' : ''}`}
      role="group"
      aria-label="Chess board"
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="cb-grid">
        {SQUARES.map((sq, i) => {
          const piece = pieces.get(sq);
          const letter = String(letters?.[sq] ?? '').toUpperCase();
          const isDark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          const isSelected = sq === selectedSquare;
          const isTarget = targets.has(sq);
          const isCapture = isTarget && piece !== undefined;
          const isLast = lastMove !== null && (sq === lastMove.from || sq === lastMove.to);

          const className = [
            'cb-sq',
            isDark ? 'cb-sq--dark' : 'cb-sq--light',
            isLast && 'cb-sq--last',
            isSelected && 'cb-sq--selected',
            isTarget && (isCapture ? 'cb-sq--capture' : 'cb-sq--move'),
          ]
            .filter(Boolean)
            .join(' ');

          const label = [
            sq,
            letter ? `letter ${letter}` : 'no letter',
            piece ? `${piece.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[piece.type]}` : 'empty',
            isSelected && 'selected',
            isTarget && (isCapture ? 'capture' : 'legal move'),
            isLast && 'last move',
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <button
              key={sq}
              type="button"
              className={className}
              data-square={sq}
              aria-label={label}
              disabled={disabled}
              tabIndex={sq === tabStop ? 0 : -1}
              onClick={() => {
                if (!disabled) onSquareClick(sq);
              }}
            >
              {isTarget && !isCapture && <MoveGem />}
              {piece && <PieceSprite type={piece.type} color={piece.color} />}
              {isCapture && <span className="cb-capture" aria-hidden="true" />}
              {letter && (
                <span className="cb-tile" aria-hidden="true">
                  {letter}
                </span>
              )}
              {isSelected && <span className="cb-cursor" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
