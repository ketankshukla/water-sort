export const PAL = [
  "#FF3B3B","#FF8A1F","#FFD60A","#8BE32C","#18A957","#22D3EE",
  "#3B82F6","#A855F7","#FF49C1","#FFFFFF","#C08552","#94A3B8"
];
export const CAP = 4;
export const EMPTY_TUBES = 2;

export type Tube = number[];
export type Move = { from: number; to: number; count: number; color: number };

// Special-tube modifiers (FEATURES.md #3). A modifier is attached to a tube
// index via a parallel `Mods` array so the raw `Tube = number[]` color data
// stays clean for save/resume and scoring.
export type ModKind = "frozen" | "locked" | "oneway";
export interface Modifier {
  kind: ModKind;
  thawed?: boolean;      // frozen: true once a matching pour has cracked the ice
  unlockMoves?: number;  // locked: opens once `moves` reaches this count
}
export type Mods = (Modifier | null)[];

// Can liquid leave tube `a`?  Frozen tubes are sealed until thawed; locked
// tubes are sealed until their move threshold is reached; one-way tubes pour out
// freely.
export function canSource(m: Modifier | null | undefined, moves: number): boolean {
  if (!m) return true;
  if (m.kind === "frozen") return !!m.thawed;
  if (m.kind === "locked") return moves >= (m.unlockMoves ?? 0);
  return true;
}

// Can liquid enter tube `b`?  One-way tubes never accept; locked tubes accept
// only once open; frozen tubes accept (a matching pour is what thaws them).
export function canDest(m: Modifier | null | undefined, moves: number): boolean {
  if (!m) return true;
  if (m.kind === "oneway") return false;
  if (m.kind === "locked") return moves >= (m.unlockMoves ?? 0);
  return true;
}

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

export function canPour(tubes: Tube[], a: number, b: number, mods?: Mods, moves = 0): boolean {
  if (a === b || !tubes[a].length || tubes[b].length >= CAP) return false;
  if (mods) {
    if (!canSource(mods[a], moves)) return false;
    if (!canDest(mods[b], moves)) return false;
  }
  return tubes[b].length === 0 || topColor(tubes[b]) === topColor(tubes[a]);
}

export function isWon(tubes: Tube[]): boolean {
  return tubes.every(t => t.length === 0 || isComplete(t));
}

export function solve(start: Tube[], maxNodes = 300000, mods?: Mods): Move[] | null {
  const s = start.map(t => t.slice());
  // Mutable thaw flags tracked through the search so frozen tubes can be used
  // as a source once a pour has cracked them open.
  const thawed = (mods ?? []).map(m => !!(m && m.kind === "frozen" && m.thawed));
  const visited = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;

  const lockedOpen = (i: number, moves: number) => {
    const m = mods?.[i];
    if (!m || m.kind !== "locked") return true;
    return moves >= (m.unlockMoves ?? 0);
  };

  const key = (st: Tube[]) => {
    const base = st.map(t => t.join(",")).sort().join("|");
    if (!mods) return base;
    // Equal contents can have different reachability depending on which frozen
    // tubes are thawed and which locked tubes are open, so fold those phases in.
    const tk = thawed.map(t => t ? 1 : 0).join("");
    const lk = mods.map((m, i) => (m && m.kind === "locked") ? (lockedOpen(i, path.length) ? 1 : 0) : "-").join("");
    return base + "#" + tk + "#" + lk;
  };

  const solvedAll = (st: Tube[]) =>
    st.every(t => !t.length || (t.length === CAP && t.every(c => c === t[0])));

  function dfs(): boolean {
    if (nodes++ > maxNodes) return false;
    if (solvedAll(s)) return true;
    const k = key(s);
    if (visited.has(k)) return false;
    visited.add(k);
    const moves = path.length;
    for (let i = 0; i < s.length; i++) {
      const a = s[i];
      if (!a.length) continue;
      if (a.length === CAP && a.every(c => c === a[0])) continue;
      if (mods) {
        const ma = mods[i];
        if (ma) {
          if (ma.kind === "frozen" && !thawed[i]) continue; // sealed in ice
          if (ma.kind === "locked" && moves < (ma.unlockMoves ?? 0)) continue;
        }
      }
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
        if (mods) {
          const mb = mods[j];
          if (mb) {
            if (mb.kind === "oneway") continue;        // never accepts
            if (mb.kind === "locked" && moves < (mb.unlockMoves ?? 0)) continue;
          }
        }
        const cnt = Math.min(run, CAP - b.length);
        // Pouring a matching color onto a still-frozen tube cracks the ice.
        const didThaw = !!(mods && mods[j]?.kind === "frozen" && !thawed[j] && b.length > 0);
        for (let x = 0; x < cnt; x++) { a.pop(); b.push(color); }
        if (didThaw) thawed[j] = true;
        path.push({ from: i, to: j, count: cnt, color });
        if (dfs()) return true;
        path.pop();
        if (didThaw) thawed[j] = false;
        for (let x = 0; x < cnt; x++) { b.pop(); a.push(color); }
      }
    }
    return false;
  }

  return dfs() ? path.slice() : null;
}

// Gentle difficulty ramp so early levels are actually beatable:
// L1-2: 4 colors, then +1 color every 2 levels, capped at the palette size.
export function colorsForLevel(lv: number): number {
  return Math.min(4 + Math.floor((lv - 1) / 2), PAL.length);
}

// Build a partially-filled, always-solvable board.
// Liquid is spread across (colors + 1) tubes so not every tube starts full,
// plus EMPTY_TUBES empty tubes. The solver verifies the board is completable
// WITHOUT adding tubes, so the player only rarely needs the "Add tube" relief.
export function generateLevel(lv: number): { tubes: Tube[]; optimal: number; mods: Mods } {
  const colors = colorsForLevel(lv);
  const units = colors * CAP;
  const liquidTubes = colors + 1;

  for (let attempt = 0; attempt < 400; attempt++) {
    const bag: number[] = [];
    for (let c = 0; c < colors; c++) for (let k = 0; k < CAP; k++) bag.push(c);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }

    // Random fill sizes in [1, CAP] for each liquid tube, summing to `units`.
    const sizes = new Array(liquidTubes).fill(1);
    let remaining = units - liquidTubes;
    while (remaining > 0) {
      const i = Math.floor(Math.random() * liquidTubes);
      if (sizes[i] < CAP) { sizes[i]++; remaining--; }
    }

    const t: Tube[] = [];
    let pos = 0;
    for (let i = 0; i < liquidTubes; i++) {
      t.push(bag.slice(pos, pos + sizes[i]));
      pos += sizes[i];
    }
    if (t.some(isComplete)) continue;

    const board = t.concat(Array.from({ length: EMPTY_TUBES }, () => []));
    const sol = solve(board.map(x => x.slice()));
    if (sol && sol.length >= colors) {
      // Try to spice the board with one special tube; fall back to plain if the
      // modifier can't be placed solvably.
      const withMod = assignModifier(board, lv);
      if (withMod) return withMod;
      return { tubes: board, optimal: sol.length, mods: board.map(() => null) };
    }
  }

  // Fallback: full tubes + empties (always solvable).
  const t: Tube[] = [];
  for (let c = 0; c < colors; c++) t.push(Array(CAP).fill(c));
  const a = t[0][CAP - 1];
  t[0][CAP - 1] = t[1][CAP - 1];
  t[1][CAP - 1] = a;
  for (let e = 0; e < EMPTY_TUBES; e++) t.push([]);
  return { tubes: t, optimal: 2, mods: t.map(() => null) };
}

// Which special-tube kinds are available at a given level. They unlock
// progressively so players meet one mechanic at a time.
function modKindsForLevel(lv: number): ModKind[] {
  const kinds: ModKind[] = [];
  if (lv >= 2) kinds.push("frozen");
  if (lv >= 4) kinds.push("oneway");
  if (lv >= 6) kinds.push("locked");
  return kinds;
}

// How many special tubes to aim for on a level. Escalates so the game keeps
// feeling fresh as the player climbs.
function targetModCount(lv: number): number {
  if (lv < 2) return 0;
  if (lv < 10) return 1;
  if (lv < 18) return 2;
  return 3;
}

// Greedily attach up to `targetModCount` modifiers to the (already solvable)
// board, re-verifying solvability after each one so the board is always
// completable with the modifiers active. Returns null only when no modifier
// applies (early levels).
function assignModifier(board: Tube[], lv: number): { tubes: Tube[]; optimal: number; mods: Mods } | null {
  const kinds = modKindsForLevel(lv);
  const target = targetModCount(lv);
  if (!kinds.length || target <= 0) return null;

  const mods: Mods = board.map(() => null);
  let placed = 0;
  let lastSol: Move[] | null = null;

  for (let slot = 0; slot < target; slot++) {
    let addedThisSlot = false;
    for (let tries = 0; tries < 20 && !addedThisSlot; tries++) {
      const kind = kinds[Math.floor(Math.random() * kinds.length)];

      // Candidate tubes that don't already carry a modifier.
      const free = board
        .map((t, i) => ({ t, i }))
        .filter(({ i }) => mods[i] == null);
      const pool = kind === "locked"
        ? free                                   // any tube, incl. empty
        : free.filter(({ t }) => t.length > 0 && !isComplete(t)); // needs liquid
      if (!pool.length) break;

      const idx = pool[Math.floor(Math.random() * pool.length)].i;
      const prev = mods[idx];
      if (kind === "frozen") mods[idx] = { kind, thawed: false };
      else if (kind === "oneway") mods[idx] = { kind };
      else mods[idx] = { kind, unlockMoves: 2 + Math.floor(Math.random() * 4) };

      const sol = solve(board.map(x => x.slice()), 300000, mods);
      if (sol && sol.length >= 1) {
        lastSol = sol;
        placed++;
        addedThisSlot = true;
      } else {
        mods[idx] = prev; // revert and try a different kind/placement
      }
    }
    if (!addedThisSlot) break; // couldn't place more; keep what we have
  }

  if (placed === 0 || !lastSol) return null;
  return { tubes: board, optimal: lastSol.length, mods };
}
