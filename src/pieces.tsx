// Pixel-art chess piece sprites for the board. Each piece is drawn on a 16x16
// grid; the outline, the dark-piece rim and the ground shadow are derived from
// the silhouette at module load, so the grids below only hold the fill.
//
//   b = body, s = shade (right-hand side, lit from the top left),
//   d = detail line (eye, mitre slit), drawn in the outline colour.

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

const SIZE = 16;

const GRIDS: Record<PieceType, readonly string[]> = {
  p: [
    '................',
    '................',
    '................',
    '................',
    '.......bb.......',
    '......bbbs......',
    '......bbbs......',
    '.......bs.......',
    '.....bbbbss.....',
    '......bbbs......',
    '......bbbs......',
    '.....bbbbss.....',
    '....bbbbbbss....',
    '...bbbbbbbsss...',
    '................',
    '................',
  ],
  r: [
    '................',
    '................',
    '....bb.bb.bs....',
    '....bbbbbbss....',
    '.....bbbbss.....',
    '.....bbbbss.....',
    '.....bdddds.....',
    '.....bbbbss.....',
    '.....bbbbss.....',
    '.....bbbbss.....',
    '....bbbbbbss....',
    '...bbbbbbbbss...',
    '...bbbbbbbbss...',
    '..bbbbbbbbbbss..',
    '................',
    '................',
  ],
  n: [
    '................',
    '................',
    '......b.b.......',
    '.....bbbbbs.....',
    '....bdbbbbbs....',
    '...bbbbbbbbbs...',
    '..bbbbbbbbbbs...',
    '..bbbb.bbbbbbs..',
    '...bb...bbbbbs..',
    '........bbbbbs..',
    '.......bbbbbbs..',
    '......bbbbbbss..',
    '....bbbbbbbbs...',
    '...bbbbbbbbbss..',
    '................',
    '................',
  ],
  b: [
    '................',
    '.......bb.......',
    '......bbbs......',
    '.....bbbdbs.....',
    '.....bbdbbs.....',
    '.....bbbbbs.....',
    '......bbbs......',
    '.....bbbbss.....',
    '......bbbs......',
    '......bbbs......',
    '.....bbbbss.....',
    '....bbbbbbss....',
    '...bbbbbbbbss...',
    '...bbbbbbbbss...',
    '................',
    '................',
  ],
  q: [
    '................',
    '....b..bb..b....',
    '....bb.bb.bs....',
    '....bbbbbbbs....',
    '.....bbbbbs.....',
    '......bbbs......',
    '.....bbbbss.....',
    '......bbbs......',
    '......bbbs......',
    '......bbbs......',
    '.....bbbbss.....',
    '....bbbbbbss....',
    '...bbbbbbbbss...',
    '...bbbbbbbbss...',
    '................',
    '................',
  ],
  k: [
    '................',
    '.......bb.......',
    '......bbbs......',
    '.......bs.......',
    '....bbbbbbbs....',
    '...bbbbdbbbbs...',
    '...bbbbbbbbbs...',
    '....bbbbbbbs....',
    '.....bbbbbs.....',
    '......bbbs......',
    '.....bbbbss.....',
    '....bbbbbbss....',
    '...bbbbbbbbss...',
    '...bbbbbbbbss...',
    '................',
    '................',
  ],
};

interface SpriteLayers {
  shadow: string;
  rim: string;
  outline: string;
  body: string;
  shade: string;
  detail: string;
}

// Cells are addressed on a padded canvas (-1..16) so the rim may spill one
// pixel past the 16x16 design grid; the SVG viewBox covers the padding.
const LO = -1;
const HI = SIZE;

type Mask = (x: number, y: number) => boolean;

function pathOf(mask: Mask): string {
  let d = '';
  for (let y = LO; y <= HI; y++) {
    let x = LO;
    while (x <= HI) {
      if (!mask(x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (x <= HI && mask(x, y)) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  }
  return d;
}

function buildLayers(grid: readonly string[]): SpriteLayers {
  const cell = (x: number, y: number) => (x >= 0 && y >= 0 && x < SIZE && y < SIZE ? grid[y][x] : '.');
  const filled = (x: number, y: number) => cell(x, y) !== '.';
  const near4 = (x: number, y: number, test: Mask) =>
    test(x - 1, y) || test(x + 1, y) || test(x, y - 1) || test(x, y + 1);
  const near8 = (x: number, y: number, test: Mask) =>
    near4(x, y, test) || test(x - 1, y - 1) || test(x + 1, y - 1) || test(x - 1, y + 1) || test(x + 1, y + 1);

  const outline: Mask = (x, y) => !filled(x, y) && near4(x, y, filled);
  const solid: Mask = (x, y) => filled(x, y) || outline(x, y);
  const rim: Mask = (x, y) => !solid(x, y) && near8(x, y, solid);

  // Ground shadow: one row under the lowest outline row, shifted a pixel right.
  let base = 0;
  for (let y = 0; y < SIZE; y++) if (grid[y].includes('b')) base = y;
  const shadowRow = base + 2;
  const shadow: Mask = (x, y) => y === shadowRow && !solid(x, y) && (filled(x - 1, base) || filled(x, base));

  return {
    shadow: pathOf(shadow),
    rim: pathOf(rim),
    outline: pathOf(outline),
    body: pathOf((x, y) => cell(x, y) === 'b'),
    shade: pathOf((x, y) => cell(x, y) === 's'),
    detail: pathOf((x, y) => cell(x, y) === 'd'),
  };
}

const LAYERS = Object.fromEntries(
  (Object.keys(GRIDS) as PieceType[]).map((type) => [type, buildLayers(GRIDS[type])]),
) as Record<PieceType, SpriteLayers>;

const VIEWBOX = `${LO} ${LO} ${HI - LO + 1} ${HI - LO + 1}`;

export function PieceSprite({ type, color }: { type: PieceType; color: PieceColor }) {
  const layers = LAYERS[type];
  return (
    <svg
      className={`cb-piece cb-piece--${color === 'w' ? 'white' : 'black'}`}
      viewBox={VIEWBOX}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path className="cb-px-shadow" d={layers.shadow} />
      <path className="cb-px-rim" d={layers.rim} />
      <path className="cb-px-outline" d={layers.outline} />
      <path className="cb-px-body" d={layers.body} />
      <path className="cb-px-shade" d={layers.shade} />
      <path className="cb-px-detail" d={layers.detail} />
    </svg>
  );
}

/** Pixel diamond marking a quiet legal move on an empty square. */
const GEM = ['...o...', '..oho..', '.ohaao.', 'ohaaaao', '.oaaao.', '..oao..', '...o...'];

const gemPath = (ch: string) =>
  GEM.flatMap((row, y) => [...row].map((c, x) => (c === ch ? `M${x} ${y}h1v1h-1z` : ''))).join('');

const GEM_PATHS = { o: gemPath('o'), a: gemPath('a'), h: gemPath('h') };

export function MoveGem() {
  return (
    <svg className="cb-gem" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path className="cb-gem-o" d={GEM_PATHS.o} />
      <path className="cb-gem-a" d={GEM_PATHS.a} />
      <path className="cb-gem-h" d={GEM_PATHS.h} />
    </svg>
  );
}
