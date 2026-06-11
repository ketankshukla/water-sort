export interface Position { x: number; y: number }

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function clampPositions(p: Position[], bw: number, bh: number, tubeW: number, tubeH: number): Position[] {
  return p.map(({ x, y }) => ({
    x: Math.round(Math.max(4, Math.min(bw - tubeW - 4, x))),
    y: Math.round(Math.max(4, Math.min(bh - tubeH - 4, y))),
  }));
}

// Rows whose sizes are as even as possible, capped at `maxRows` rows.
function rowSizes(n: number, maxRows: number): number[] {
  const rows = Math.min(maxRows, n);
  const base = Math.floor(n / rows);
  let extra = n - base * rows;
  const sizes: number[] = [];
  for (let r = 0; r < rows; r++) sizes.push(base + (extra-- > 0 ? 1 : 0));
  return sizes;
}

// Square / grid block of up to 4 rows.
function gridLayout(n: number, bw: number, bh: number, tubeW: number, tubeH: number, seed: () => number): Position[] {
  const sizes = rowSizes(n, 4);
  const rows = sizes.length;
  const maxRow = Math.max(...sizes);
  // Spacing leaves room for the tap buffer (15px each side / 18px top) plus a
  // gap, so neighbouring tap zones never overlap.
  const cellW = Math.min(tubeW + 42, Math.floor((bw - 10) / maxRow));
  const cellH = Math.min(tubeH + 38, Math.floor((bh - 10) / rows));
  const startY = (bh - rows * cellH) / 2 + (cellH - tubeH) / 2;

  const out: Position[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = sizes[r];
    const startX = (bw - inRow * cellW) / 2 + (cellW - tubeW) / 2;
    for (let c = 0; c < inRow; c++) {
      out.push({
        x: startX + c * cellW,
        y: startY + r * cellH + (seed() - 0.5) * 4,
      });
    }
  }
  return out;
}

// Pyramid / triangle: narrow at the top, widest at the bottom.
function pyramidLayout(n: number, bw: number, bh: number, tubeW: number, tubeH: number, seed: () => number): Position[] {
  let rows = Math.ceil((-1 + Math.sqrt(1 + 8 * n)) / 2);
  const sizes: number[] = [];
  let left = n;
  for (let r = 0; r < rows; r++) {
    const want = r + 1;
    const take = Math.min(want, left - (rows - 1 - r));
    sizes.push(Math.max(1, take));
    left -= sizes[r];
  }
  // Distribute any leftover onto the bottom rows.
  let i = sizes.length - 1;
  while (left > 0) { sizes[i]++; left--; i = i > 0 ? i - 1 : sizes.length - 1; }
  rows = sizes.length;

  const maxRow = Math.max(...sizes);
  const cellW = Math.min(tubeW + 40, Math.floor((bw - 10) / maxRow));
  const cellH = Math.min(tubeH + 34, Math.floor((bh - 10) / rows));
  const startY = (bh - rows * cellH) / 2 + (cellH - tubeH) / 2;

  const out: Position[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = sizes[r];
    const startX = (bw - inRow * cellW) / 2 + (cellW - tubeW) / 2;
    for (let c = 0; c < inRow; c++) {
      out.push({
        x: startX + c * cellW,
        y: startY + r * cellH,
      });
    }
  }
  return out;
}

// Concentric circles: a center tube ringed by one or two circles.
function ringLayout(n: number, bw: number, bh: number, tubeW: number, tubeH: number, seed: () => number): Position[] {
  const cx = bw / 2;
  const cy = bh / 2;
  const outerR = Math.min((bw - tubeW - 36) / 2, (bh - tubeH - 36) / 2);

  // Decide ring membership: small boards => single ring, larger => center + rings.
  const rings: number[] = [];
  if (n <= 6) {
    rings.push(n);
  } else if (n <= 10) {
    rings.push(1, n - 1);
  } else {
    const inner = Math.round((n - 1) / 2.4);
    rings.push(1, inner, n - 1 - inner);
  }

  const radii = rings.map((_, idx) =>
    rings.length === 1 ? outerR * 0.78 : (idx === 0 ? 0 : outerR * (idx / (rings.length - 1)))
  );

  const out: Position[] = [];
  rings.forEach((cnt, ri) => {
    const R = radii[ri];
    const a0 = seed() * Math.PI * 2 + ri * 0.6;
    for (let k = 0; k < cnt; k++) {
      const a = cnt === 1 && R === 0 ? 0 : a0 + (k / cnt) * Math.PI * 2;
      out.push({
        x: cx + R * Math.cos(a) - tubeW / 2,
        y: cy + R * Math.sin(a) - tubeH / 2,
      });
    }
  });
  return out;
}

export function computeLayout(
  n: number,
  bw: number,
  bh: number,
  level: number,
  tubeW: number,
  tubeH: number
): Position[] {
  if (n <= 0) return [];
  const seed = mulberry32(level * 7919 + 13);
  // Vary the arrangement style with each level for variety.
  const style = level % 3;
  let positions: Position[];
  // Pyramid only when it stays within 4 buffered rows (n <= 10); otherwise grid.
  if (style === 1 && n <= 10) positions = pyramidLayout(n, bw, bh, tubeW, tubeH, seed);
  else if (style === 2) positions = ringLayout(n, bw, bh, tubeW, tubeH, seed);
  else positions = gridLayout(n, bw, bh, tubeW, tubeH, seed);
  return clampPositions(positions, bw, bh, tubeW, tubeH);
}
