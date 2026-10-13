/**
 * Generates src/app/favicon.ico from the Penman Empire dot-grid mark.
 *
 * The mark is the same 3x3 dot cluster used in the site header and footer:
 * leaf-green dots on opposing corners, with alternating white tones between.
 * It is rasterised here with 4x4 supersampling so the circles are smooth, then
 * wrapped in a PNG-embedded ICO (supported by every browser that matters).
 *
 * Run with:  node scripts/generate-favicon.mjs
 *
 * The output is committed, so this only needs re-running if the mark changes.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 32; // square, in pixels
const SS = 4; // supersampling factor per axis

const FOREST = [0x1e, 0x4d, 0x33];
const LEAF = [0x42, 0xa8, 0x5d];
const WHITE = [0xff, 0xff, 0xff];

/** Dots in a 32-unit design space, matching the 3x3 grid in the site header. */
const CENTRE = SIZE / 2;
const SPACING = SIZE * 0.203;
const DOT_RADIUS = SIZE * 0.072;
const CORNER_RADIUS = SIZE * 0.219;

const TONES = [
  { colour: LEAF, alpha: 1 },
  { colour: WHITE, alpha: 0.92 },
  { colour: WHITE, alpha: 0.45 },
  { colour: WHITE, alpha: 0.92 },
  { colour: WHITE, alpha: 0.45 },
  { colour: WHITE, alpha: 0.92 },
  { colour: WHITE, alpha: 0.45 },
  { colour: WHITE, alpha: 0.92 },
  { colour: LEAF, alpha: 1 },
];

const dots = TONES.map((tone, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return {
    cx: CENTRE + (col - 1) * SPACING,
    cy: CENTRE + (row - 1) * SPACING,
    ...tone,
  };
});

function insideRoundedRect(x, y) {
  const r = CORNER_RADIUS;
  const min = 0;
  const max = SIZE;
  if (x < min || x > max || y < min || y > max) return false;
  const cx = Math.min(Math.max(x, min + r), max - r);
  const cy = Math.min(Math.max(y, min + r), max - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function sample(x, y) {
  if (!insideRoundedRect(x, y)) return [0, 0, 0, 0];

  // Dots paint over the background, last write wins within a subsample.
  let colour = FOREST;
  let alpha = 1;
  for (const dot of dots) {
    const dx = x - dot.cx;
    const dy = y - dot.cy;
    if (dx * dx + dy * dy <= DOT_RADIUS * DOT_RADIUS) {
      colour = dot.colour;
      alpha = dot.alpha;
    }
  }
  return [colour[0], colour[1], colour[2], Math.round(alpha * 255)];
}

/* ── Rasterise with supersampling ────────────────────────────────────── */

const pixels = Buffer.alloc(SIZE * SIZE * 4);
for (let py = 0; py < SIZE; py += 1) {
  for (let px = 0; px < SIZE; px += 1) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let sy = 0; sy < SS; sy += 1) {
      for (let sx = 0; sx < SS; sx += 1) {
        const [pr, pg, pb, pa] = sample(px + (sx + 0.5) / SS, py + (sy + 0.5) / SS);
        const weight = pa / 255;
        r += pr * weight;
        g += pg * weight;
        b += pb * weight;
        a += pa;
      }
    }
    const n = SS * SS;
    const alphaAvg = a / n;
    const coverage = alphaAvg / 255 || 1;
    const offset = (py * SIZE + px) * 4;
    pixels[offset] = Math.round(r / n / coverage);
    pixels[offset + 1] = Math.round(g / n / coverage);
    pixels[offset + 2] = Math.round(b / n / coverage);
    pixels[offset + 3] = Math.round(alphaAvg);
  }
}

/* ── Minimal PNG encoder (RGBA, no interlace) ────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type: RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// Each scanline is prefixed with its filter byte (0 = none).
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y += 1) {
  const rowStart = y * (SIZE * 4 + 1);
  raw[rowStart] = 0;
  pixels.copy(raw, rowStart + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

/* ── Wrap the PNG in an ICO container ────────────────────────────────── */

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // one image

const entry = Buffer.alloc(16);
entry[0] = SIZE === 256 ? 0 : SIZE; // width
entry[1] = SIZE === 256 ? 0 : SIZE; // height
entry[2] = 0; // palette size
entry[3] = 0; // reserved
entry.writeUInt16LE(1, 4); // colour planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png.length, 8); // size of image data
entry.writeUInt32LE(header.length + entry.length, 12); // offset to image data

const ico = Buffer.concat([header, entry, png]);

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "favicon.ico");
writeFileSync(outPath, ico);
console.log(`Wrote ${outPath} (${ico.length} bytes, ${SIZE}x${SIZE})`);
