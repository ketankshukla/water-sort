export const PAL = [
  "#FF3B3B","#FF8A1F","#FFD60A","#8BE32C","#18A957","#22D3EE",
  "#3B82F6","#A855F7","#FF49C1","#FFFFFF","#C08552","#94A3B8"
];
export const CAP = 4;
export const EMPTY_TUBES = 2;

// A rainbow / wildcard segment (FEATURES.md #4). It matches ANY color it
// touches, both as a pour source and a pour destination. Stored as a normal
// segment value so save/resume is unaffected.
export const WILD = -2;

// CSS background for a segment color id. Wildcards render as a rainbow.
export const WILD_GRADIENT =
  "linear-gradient(135deg,#FF3B3B 0%,#FF8A1F 16%,#FFD60A 32%,#8BE32C 48%,#22D3EE 64%,#3B82F6 80%,#A855F7 100%)";
export function segBg(c: number): string {
  return c === WILD ? WILD_GRADIENT : PAL[c];
}

export type Tube = number[];
export type Move = { from: number; to: number; count: number; color: number };

// Two segment colors are compatible if they're equal or either is a wildcard.
export function colorEq(a: number, b: number): boolean {
  return a === b || a === WILD || b === WILD;
}

// A tube is uniform if all of its non-wild segments share a single color
// (wildcards count as that color). An all-wild or empty tube is uniform too.
export function isUniform(t: Tube): boolean {
  let c = -1;
  for (const x of t) {
    if (x === WILD) continue;
    if (c === -1) c = x;
    else if (x !== c) return false;
  }
  return true;
}

// The movable top group of a tube: leading wildcards adopt the first real color
// beneath them, so e.g. [.., R, W, R] pours as a run of 3 of effective color R.
// An all-wild top group has effective color WILD (matches anything).
export function topGroup(t: Tube): { count: number; color: number } {
  if (!t.length) return { count: 0, color: -1 };
  let color = -1;
  let count = 0;
  for (let i = t.length - 1; i >= 0; i--) {
    const seg = t[i];
    if (seg === WILD) { count++; continue; }
    if (color === -1) { color = seg; count++; continue; }
    if (seg === color) { count++; continue; }
    break;
  }
  return { count, color: color === -1 ? WILD : color };
}

// Special-tube modifiers (FEATURES.md #3). A modifier is attached to a tube
// index via a parallel `Mods` array so the raw `Tube = number[]` color data
// stays clean for save/resume and scoring.
export type ModKind = "frozen" | "locked" | "oneway";
export interface Modifier {
  kind: ModKind;
  thawed?: boolean;       // frozen: true once a matching pour has cracked the ice
  unlockMoves?: number;   // locked: opens once `moves` reaches this count
  dynamic?: boolean;      // true for events that appear mid-play (vs. start-of-level)
  expiresAtMove?: number; // dynamic events auto-lift once `moves` reaches this
}
export type Mods = (Modifier | null)[];

// A dynamic event has lifted once the move counter passes its expiry.
export function isExpired(m: Modifier | null | undefined, moves: number): boolean {
  return !!m && m.expiresAtMove != null && moves >= m.expiresAtMove;
}

// Can liquid leave tube `a`?  Frozen tubes are sealed until thawed; locked
// tubes are sealed until their move threshold is reached; one-way tubes pour out
// freely. Expired dynamic events impose no restriction.
export function canSource(m: Modifier | null | undefined, moves: number): boolean {
  if (!m || isExpired(m, moves)) return true;
  if (m.kind === "frozen") return !!m.thawed;
  if (m.kind === "locked") return moves >= (m.unlockMoves ?? 0);
  return true;
}

// Can liquid enter tube `b`?  One-way tubes never accept; locked tubes accept
// only once open; frozen tubes accept (a matching pour is what thaws them).
// Expired dynamic events impose no restriction.
export function canDest(m: Modifier | null | undefined, moves: number): boolean {
  if (!m || isExpired(m, moves)) return true;
  if (m.kind === "oneway") return false;
  if (m.kind === "locked") return moves >= (m.unlockMoves ?? 0);
  return true;
}

export function topColor(t: Tube): number {
  return t.length ? t[t.length - 1] : -1;
}

export function topRun(t: Tube): number {
  return topGroup(t).count;
}

export function isComplete(t: Tube): boolean {
  return t.length === CAP && isUniform(t);
}

export function canPour(tubes: Tube[], a: number, b: number, mods?: Mods, moves = 0): boolean {
  if (a === b || !tubes[a].length || tubes[b].length >= CAP) return false;
  if (mods) {
    if (!canSource(mods[a], moves)) return false;
    if (!canDest(mods[b], moves)) return false;
  }
  return tubes[b].length === 0 || colorEq(topColor(tubes[b]), topGroup(tubes[a]).color);
}

export function isWon(tubes: Tube[]): boolean {
  return tubes.every(t => t.length === 0 || isComplete(t));
}

export function solve(start: Tube[], maxNodes = 300000, mods?: Mods, baseMoves = 0): Move[] | null {
  const s = start.map(t => t.slice());
  // Mutable thaw flags tracked through the search so frozen tubes can be used
  // as a source once a pour has cracked them open.
  const thawed = (mods ?? []).map(m => !!(m && m.kind === "frozen" && m.thawed));
  // A one-way tube becomes a normal tube once it has been fully emptied, so it
  // can then accept pours like any other empty tube.
  const onewayDead = (mods ?? []).map(() => false);
  const visited = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;

  const lockedOpen = (i: number, moves: number) => {
    const m = mods?.[i];
    if (!m || m.kind !== "locked") return true;
    return isExpired(m, moves) || moves >= (m.unlockMoves ?? 0);
  };

  const key = (st: Tube[]) => {
    const base = st.map(t => t.join(",")).sort().join("|");
    if (!mods) return base;
    // Equal contents can have different reachability depending on which frozen
    // tubes are thawed, which locked tubes are open, and which timed events are
    // still active, so fold those phases into the key.
    const mm = baseMoves + path.length;
    const tk = thawed.map(t => t ? 1 : 0).join("");
    const ph = mods.map((m, i) => {
      if (!m) return "-";
      if (m.kind === "locked") return lockedOpen(i, mm) ? "o" : "c";
      if (m.expiresAtMove != null) return isExpired(m, mm) ? "x" : "a";
      return "s";
    }).join("");
    return base + "#" + tk + "#" + ph;
  };

  const solvedAll = (st: Tube[]) =>
    st.every(t => !t.length || isComplete(t));

  function dfs(): boolean {
    if (nodes++ > maxNodes) return false;
    if (solvedAll(s)) return true;
    const k = key(s);
    if (visited.has(k)) return false;
    visited.add(k);
    const moves = baseMoves + path.length;
    for (let i = 0; i < s.length; i++) {
      const a = s[i];
      if (!a.length) continue;
      if (isComplete(a)) continue;
      if (mods) {
        const ma = mods[i];
        if (ma && !isExpired(ma, moves)) {
          if (ma.kind === "frozen" && !thawed[i]) continue; // sealed in ice
          if (ma.kind === "locked" && moves < (ma.unlockMoves ?? 0)) continue;
        }
      }
      const mono = isUniform(a);
      const grp = topGroup(a);
      const color = grp.color;
      const run = grp.count;
      for (let j = 0; j < s.length; j++) {
        if (i === j) continue;
        const b = s[j];
        if (b.length >= CAP) continue;
        if (b.length && !colorEq(b[b.length - 1], color)) continue;
        if (mono && !b.length) continue;
        if (mods) {
          const mb = mods[j];
          if (mb && !isExpired(mb, moves)) {
            if (mb.kind === "oneway" && !onewayDead[j]) continue; // accepts only once emptied
            if (mb.kind === "locked" && moves < (mb.unlockMoves ?? 0)) continue;
          }
        }
        const cnt = Math.min(run, CAP - b.length);
        // Pouring a matching color onto a still-frozen tube cracks the ice.
        const didThaw = !!(mods && mods[j]?.kind === "frozen" && !thawed[j] && !isExpired(mods[j], moves) && b.length > 0);
        // Move the actual top `cnt` segments (preserving wild vs. real values).
        const moved = a.splice(a.length - cnt, cnt);
        for (const seg of moved) b.push(seg);
        // Draining a one-way tube to empty converts it to a normal tube.
        const diedOneway = !!(mods && mods[i]?.kind === "oneway" && !onewayDead[i] && a.length === 0);
        if (didThaw) thawed[j] = true;
        if (diedOneway) onewayDead[i] = true;
        path.push({ from: i, to: j, count: cnt, color });
        if (dfs()) return true;
        path.pop();
        if (didThaw) thawed[j] = false;
        if (diedOneway) onewayDead[i] = false;
        const back = b.splice(b.length - cnt, cnt);
        for (const seg of back) a.push(seg);
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

// How many rainbow/wildcard segments a level gets. They appear from L8 and
// ramp up gently so the "get out of jail" mechanic stays special.
export function wildCountForLevel(lv: number): number {
  if (lv < 8) return 0;
  if (lv < 14) return 1;
  if (lv < 20) return 2;
  return 3;
}

// Convert up to `count` real segments into wildcards in place, keeping the board
// solvable and never auto-completing a tube. Returns how many were placed.
function injectWildcards(board: Tube[], count: number): number {
  if (count <= 0) return 0;
  let placed = 0;
  for (let n = 0; n < count; n++) {
    let done = false;
    for (let tries = 0; tries < 20 && !done; tries++) {
      const ti = Math.floor(Math.random() * board.length);
      const tube = board[ti];
      if (!tube.length) continue;
      const si = Math.floor(Math.random() * tube.length);
      if (tube[si] === WILD) continue;
      const prev = tube[si];
      tube[si] = WILD;
      if (board.some(isComplete)) { tube[si] = prev; continue; }
      const sol = solve(board.map(x => x.slice()), 60000);
      if (sol && sol.length >= 1) { placed++; done = true; }
      else { tube[si] = prev; }
    }
    if (!done) break;
  }
  return placed;
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
      // Sprinkle in rainbow/wildcard segments (verified solvable), then try to
      // add a special tube; fall back to plain if a modifier can't be placed.
      injectWildcards(board, wildCountForLevel(lv));
      const withMod = assignModifier(board, lv);
      if (withMod) return withMod;
      const sol2 = solve(board.map(x => x.slice()), 120000) ?? sol;
      return { tubes: board, optimal: sol2.length, mods: board.map(() => null) };
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
  const usedKinds = new Set<ModKind>();
  // Verification solves here run many times during generation, so cap the search
  // to keep level building responsive. A capped (null) result just means we skip
  // that placement — the board stays solvable either way.
  const VERIFY_NODES = 60000;

  for (let slot = 0; slot < target; slot++) {
    let addedThisSlot = false;
    for (let tries = 0; tries < 10 && !addedThisSlot; tries++) {
      // Prefer kinds not yet used on this board so multi-tube levels show a
      // variety of specials; fall back to any kind once all have been used.
      const fresh = kinds.filter(k => !usedKinds.has(k));
      const choices = fresh.length ? fresh : kinds;
      const kind = choices[Math.floor(Math.random() * choices.length)];

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

      const sol = solve(board.map(x => x.slice()), VERIFY_NODES, mods);
      if (sol && sol.length >= 1) {
        lastSol = sol;
        placed++;
        usedKinds.add(kind);
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

// ---------------------------------------------------------------------------
// Dynamic (mid-play) events
// ---------------------------------------------------------------------------
// Tubes can spontaneously freeze / lock / become one-way WHILE the player is
// solving. To keep the puzzle always completable these events are strictly
// temporary (they auto-lift after `DYN_EVENT_DURATION` moves) and only ever
// spawn when a legal move still remains; an emergency lift (handled in the UI)
// clears all dynamic events if the board would otherwise be stuck.
export const DYN_EVENT_INTERVAL = 4;   // consider spawning an event every N moves
export const DYN_EVENT_DURATION = 3;   // an event lifts this many moves after it spawns
export const DYN_EVENT_CHANCE = 0.6;   // probability of spawning at each interval
export const DYN_EVENT_MIN_LEVEL = 3;  // dynamic events start from this level

// Is there at least one legal pour available on this board right now?
export function hasLegalMove(tubes: Tube[], mods: Mods, moves: number): boolean {
  for (let i = 0; i < tubes.length; i++) {
    if (!tubes[i].length) continue;
    for (let j = 0; j < tubes.length; j++) {
      if (i !== j && canPour(tubes, i, j, mods, moves)) return true;
    }
  }
  return false;
}

// Choose a safe temporary event for the current board, or null if none is
// appropriate. "Safe" means the player still has a legal move with it active.
export function pickDynamicEvent(
  tubes: Tube[], mods: Mods, moves: number, level: number
): { index: number; mod: Modifier } | null {
  if (level < DYN_EVENT_MIN_LEVEL) return null;
  const kinds = modKindsForLevel(level);
  if (!kinds.length) return null;
  const expiresAtMove = moves + DYN_EVENT_DURATION;

  for (let tries = 0; tries < 24; tries++) {
    const kind = kinds[Math.floor(Math.random() * kinds.length)];

    // Eligible tubes carry no modifier yet and aren't already complete.
    const pool = tubes
      .map((t, i) => ({ t, i }))
      .filter(({ t, i }) => mods[i] == null && !isComplete(t))
      .filter(({ t }) => (kind === "locked" ? true : t.length > 0));
    if (!pool.length) continue;

    const index = pool[Math.floor(Math.random() * pool.length)].i;
    const mod: Modifier =
      kind === "frozen" ? { kind, thawed: false, dynamic: true, expiresAtMove }
      : kind === "oneway" ? { kind, dynamic: true, expiresAtMove }
      : { kind, dynamic: true, unlockMoves: expiresAtMove, expiresAtMove };

    const trial = mods.slice();
    trial[index] = mod;
    if (hasLegalMove(tubes, trial, moves)) return { index, mod };
  }
  return null;
}
