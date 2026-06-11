export const PAL = [
  "#FF3B3B","#FF8A1F","#FFD60A","#8BE32C","#18A957","#22D3EE",
  "#3B82F6","#A855F7","#FF49C1","#FFFFFF","#C08552","#94A3B8"
];
export const CAP = 4;
export const EMPTY_TUBES = 2;

export type Tube = number[];
export type Move = { from: number; to: number; count: number; color: number };

export function topColor(t: Tube): number {
  return t.length ? t[t.length - 1] : -1;
}

export function topRun(t: Tube): number {
  if (!t.length) return 0;
  const c = topColor(t);
  let n = 0;
  for (let i = t.length - 1; i >= 0 && t[i] === c; i--) n++;
  return n;
}

export function isComplete(t: Tube): boolean {
  return t.length === CAP && t.every(c => c === t[0]);
}

export function canPour(tubes: Tube[], a: number, b: number): boolean {
  if (a === b || !tubes[a].length || tubes[b].length >= CAP) return false;
  return tubes[b].length === 0 || topColor(tubes[b]) === topColor(tubes[a]);
}

export function isWon(tubes: Tube[]): boolean {
  return tubes.every(t => t.length === 0 || isComplete(t));
}

export function solve(start: Tube[], maxNodes = 300000): Move[] | null {
  const s = start.map(t => t.slice());
  const visited = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;
  const key = (st: Tube[]) => st.map(t => t.join(",")).sort().join("|");
  const solvedAll = (st: Tube[]) =>
    st.every(t => !t.length || (t.length === CAP && t.every(c => c === t[0])));

  function dfs(): boolean {
    if (nodes++ > maxNodes) return false;
    if (solvedAll(s)) return true;
    const k = key(s);
    if (visited.has(k)) return false;
    visited.add(k);
    for (let i = 0; i < s.length; i++) {
      const a = s[i];
      if (!a.length) continue;
      if (a.length === CAP && a.every(c => c === a[0])) continue;
      const mono = a.every(c => c === a[0]);
      const color = a[a.length - 1];
      let run = 0;
      for (let x = a.length - 1; x >= 0 && a[x] === color; x--) run++;
      for (let j = 0; j < s.length; j++) {
        if (i === j) continue;
        const b = s[j];
        if (b.length >= CAP) continue;
        if (b.length && b[b.length - 1] !== color) continue;
        if (mono && !b.length) continue;
        const cnt = Math.min(run, CAP - b.length);
        for (let x = 0; x < cnt; x++) { a.pop(); b.push(color); }
        path.push({ from: i, to: j, count: cnt, color });
        if (dfs()) return true;
        path.pop();
        for (let x = 0; x < cnt; x++) { b.pop(); a.push(color); }
      }
    }
    return false;
  }

  return dfs() ? path.slice() : null;
}

export function colorsForLevel(lv: number): number {
  return Math.min(8 + Math.floor((lv - 1) / 2), PAL.length);
}

export function generateLevel(lv: number): { tubes: Tube[]; optimal: number } {
  const colors = colorsForLevel(lv);
  for (let attempt = 0; attempt < 300; attempt++) {
    const bag: number[] = [];
    for (let c = 0; c < colors; c++) for (let k = 0; k < CAP; k++) bag.push(c);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    const t: Tube[] = [];
    for (let i = 0; i < colors; i++) t.push(bag.slice(i * CAP, (i + 1) * CAP));
    if (t.some(isComplete)) continue;
    const sol = solve(t.concat(Array.from({ length: EMPTY_TUBES }, () => [])));
    if (sol) {
      for (let e = 0; e < EMPTY_TUBES; e++) t.push([]);
      return { tubes: t, optimal: sol.length };
    }
  }
  const t: Tube[] = [];
  for (let c = 0; c < colors; c++) t.push(Array(CAP).fill(c));
  const a = t[0][CAP - 1];
  t[0][CAP - 1] = t[1][CAP - 1];
  t[1][CAP - 1] = a;
  for (let e = 0; e < EMPTY_TUBES; e++) t.push([]);
  return { tubes: t, optimal: 2 };
}
