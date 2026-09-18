// Everything the app actually knows about your photo.
//
// It is all true, and none of it is medically meaningful. The seed makes the
// output deterministic: the same file always produces the same intake form.

export interface PhotoSignals {
  seed: number;
  hex: string;
  hueName: string;
  /** mean luma, 0-100 */
  brightness: number;
  /** luma standard deviation, 0-100 */
  contrast: number;
  /** e.g. "3:2" */
  ratio: string;
  orientation: 'portrait' | 'landscape' | 'square';
  w: number;
  h: number;
  kb: number;
  /** true when the browser refused to decode the image (HEIC, mostly) */
  decoded: boolean;
}

/** FNV-1a over a sample of the bytes, mixed with the name and size. */
function hashBytes(bytes: Uint8Array, name: string, size: number): number {
  let hash = 0x811c9dc5;
  const step = Math.max(1, Math.floor(bytes.length / 4096));
  for (let i = 0; i < bytes.length; i += step) {
    hash ^= bytes[i]!;
    hash = Math.imul(hash, 0x01000193);
  }
  for (const char of `${name}:${size}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function ratioOf(w: number, h: number): string {
  if (!w || !h) return 'unknown';
  const divisor = gcd(w, h);
  const [rw, rh] = [w / divisor, h / divisor];
  // 4032:3024 is fine; 4031:3023 is not, so fall back to one decimal place.
  return rw <= 40 && rh <= 40 ? `${rw}:${rh}` : `${(w / h).toFixed(2)}:1`;
}

const HUE_NAMES = [
  'red',
  'orange',
  'yellow',
  'chartreuse',
  'green',
  'spring green',
  'cyan',
  'azure',
  'blue',
  'violet',
  'magenta',
  'rose',
];

function hueName(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 12) return max < 90 ? 'near-black' : max > 190 ? 'near-white' : 'grey';
  let hue: number;
  if (max === r) hue = ((g - b) / (max - min)) * 60;
  else if (max === g) hue = ((b - r) / (max - min)) * 60 + 120;
  else hue = ((r - g) / (max - min)) * 60 + 240;
  return HUE_NAMES[Math.round(((hue + 360) % 360) / 30) % 12]!;
}

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/** Decode into a 64x64 canvas and average it. Cheap, and nobody can check our work. */
function pixelStats(bitmap: ImageBitmap) {
  const side = 64;
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(bitmap, 0, 0, side, side);
  const { data } = ctx.getImageData(0, 0, side, side);

  let r = 0;
  let g = 0;
  let b = 0;
  let luma = 0;
  let lumaSq = 0;
  const pixels = side * side;

  for (let i = 0; i < data.length; i += 4) {
    const [pr, pg, pb] = [data[i]!, data[i + 1]!, data[i + 2]!];
    r += pr;
    g += pg;
    b += pb;
    const l = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
    luma += l;
    lumaSq += l * l;
  }

  const mean = luma / pixels;
  const variance = Math.max(0, lumaSq / pixels - mean * mean);
  return {
    r: r / pixels,
    g: g / pixels,
    b: b / pixels,
    brightness: Math.round((mean / 255) * 100),
    contrast: Math.round((Math.sqrt(variance) / 128) * 100),
  };
}

export async function readPhoto(file: File): Promise<PhotoSignals> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const seed = hashBytes(bytes, file.name, file.size);
  const kb = Math.round(file.size / 1024);

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = null;
  }

  if (!bitmap) {
    // Undecodable (HEIC and friends). The form still gets filled in — with
    // complete confidence, obviously.
    return {
      seed,
      hex: `#${toHex(seed & 0xff)}${toHex((seed >> 8) & 0xff)}${toHex((seed >> 16) & 0xff)}`,
      hueName: 'indeterminate',
      brightness: seed % 100,
      contrast: (seed >> 7) % 100,
      ratio: 'unknown',
      orientation: 'square',
      w: 0,
      h: 0,
      kb,
      decoded: false,
    };
  }

  const { width: w, height: h } = bitmap;
  const stats = pixelStats(bitmap);
  bitmap.close();

  return {
    seed,
    hex: stats ? `#${toHex(stats.r)}${toHex(stats.g)}${toHex(stats.b)}` : '#808080',
    hueName: stats ? hueName(stats.r, stats.g, stats.b) : 'grey',
    brightness: stats?.brightness ?? 50,
    contrast: stats?.contrast ?? 50,
    ratio: ratioOf(w, h),
    orientation: w === h ? 'square' : w > h ? 'landscape' : 'portrait',
    w,
    h,
    kb,
    decoded: true,
  };
}
