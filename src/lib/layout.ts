export interface Position { x: number; y: number }

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function computeLayout(
  n: number,
  bw: number,
  bh: number,
  level: number,
  tubeW: number,
  tubeH: number
): Position[] {
  const cellW = tubeW + 34;
  const cols = Math.max(3, Math.min(n, Math.floor((bw - 24) / cellW)));
  const rows = Math.ceil(n / cols);
  let cellH = tubeH + 42;
  if (rows * cellH > bh - 16) cellH = Math.max(tubeH + 16, Math.floor((bh - 16) / rows));
  const jit = Math.min(11, Math.floor((cellH - tubeH) / 2) - 1);

  const positions: Position[] = [];
  const startY = (bh - rows * cellH) / 2 + 6;
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols);
    const stag = (r % 2) ? cellW * 0.32 : 0;
    const startX = (bw - inRow * cellW) / 2 + (cellW - tubeW) / 2 - stag / 2;
    for (let c = 0; c < inRow; c++) {
      const rng = mulberry32(level * 7919 + idx * 101 + 13);
      const zig = (c % 2) ? jit * 0.8 : -jit * 0.5;
      positions.push({
        x: Math.round(startX + c * cellW + stag + (rng() - 0.5) * 18),
        y: Math.round(startY + r * cellH + (cellH - tubeH) / 2 + zig + (rng() - 0.5) * jit * 1.6)
      });
      idx++;
    }
  }
  return positions;
}
