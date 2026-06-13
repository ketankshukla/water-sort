import { useState, useCallback, useRef, useEffect } from "react";
import {
  Tube, Move, Mods, canSource, isComplete, canPour, isWon, solve, generateLevel,
  topGroup, isUniform, segBg, WILD, applyPour, isProvablyStuck,
  hasLegalMove, pickDynamicEvent, DYN_EVENT_INTERVAL, DYN_EVENT_CHANCE,
  Difficulty, DIFFICULTY_SETTINGS, DEFAULT_DIFFICULTY,
} from "@/lib/game";
import { clink, blockedSound, winJingle, pourSound, corkPop, iceCrack, hazardSound } from "@/lib/audio";
import { computeLayout, Position } from "@/lib/layout";

export interface GameState {
  level: number;
  tubes: Tube[];
  mods: Mods;
  moves: number;
  history: Move[];
  addUses: number;
  optimal: number;
  selected: number;
  busy: boolean;
  won: boolean;
  positions: Position[];
  sound: boolean;
  hinted: number[];
  mounted: boolean;
  score: number;
  lastScore: number;
  boardSize: { w: number; h: number };
  tubeSize: { w: number; h: number; segH: number };
  difficulty: Difficulty;
  cap: number;
  // Empty tubes the player has earned by completing tubes (max 2). They are
  // appended during play rather than dealt at the start.
  earnedEmpties: number;
}

const SAVE_KEY = "ws_save";
const SCORE_KEY = "ws_score";
const DIFF_KEY = "ws_diff";

// Points for finishing a level: rewards higher levels and fewer moves.
function levelScore(level: number, moves: number, optimal: number, stars: number): number {
  return Math.max(50, 200 + level * 20 + stars * 100 - Math.max(0, moves - optimal) * 5);
}

export function starsFor(moves: number, optimal: number): number {
  return moves <= optimal + 1 ? 3 : moves <= optimal + 5 ? 2 : 1;
}

export function useGame() {
  const boardRef = useRef<HTMLDivElement>(null);
  const tubeEls = useRef<(HTMLDivElement | null)[]>([]);
  const segEls = useRef<(HTMLDivElement | null)[]>([]);
  // Tubes currently involved in an in-flight pour. Multiple pours can run at
  // once as long as they use disjoint tubes.
  const animatingRef = useRef<Set<number>>(new Set());

  const [state, setState] = useState<GameState>(() => ({
    level: 1,
    tubes: [],
    mods: [],
    moves: 0,
    history: [],
    addUses: 1,
    optimal: 0,
    selected: -1,
    busy: false,
    won: false,
    positions: [],
    sound: true,
    hinted: [],
    mounted: false,
    score: 0,
    lastScore: 0,
    boardSize: { w: 360, h: 340 },
    tubeSize: { w: 30, h: 100, segH: 22 },
    difficulty: DEFAULT_DIFFICULTY,
    cap: DIFFICULTY_SETTINGS[DEFAULT_DIFFICULTY].cap,
    earnedEmpties: 0,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const registerTube = useCallback((i: number, el: HTMLDivElement | null) => {
    tubeEls.current[i] = el;
  }, []);
  const registerSegs = useCallback((i: number, el: HTMLDivElement | null) => {
    segEls.current[i] = el;
  }, []);

  // Tube width comes from CSS; height scales with capacity (cap * segment +
  // the fixed border/inset padding) so taller "Hard" tubes lay out correctly.
  const TUBE_PAD = 12;
  const getDims = (cap = stateRef.current.cap) => {
    if (typeof window === "undefined") return { tw: 30, th: cap * 22 + TUBE_PAD };
    const cs = getComputedStyle(document.documentElement);
    const tw = parseFloat(cs.getPropertyValue("--tubew")) || 30;
    const segH = parseFloat(cs.getPropertyValue("--segh")) || 22;
    return { tw, th: cap * segH + TUBE_PAD };
  };

  const recalcLayout = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const s = stateRef.current;
    const { tw, th } = getDims(s.cap);
    const bw = board.clientWidth || 360;
    const bh = Math.max(board.clientHeight, 600);
    const positions = computeLayout(s.tubes.length, bw, bh, s.level, tw, th);
    setState(prev => ({ ...prev, positions, boardSize: { w: bw, h: bh } }));
  }, []);

  // Build the first level only after mount to avoid SSR/hydration mismatch.
  // If a saved in-progress board exists in localStorage, resume it.
  useEffect(() => {
    const snd = localStorage.getItem("ws_sound") !== "0";
    const score = parseInt(localStorage.getItem(SCORE_KEY) || "0", 10) || 0;
    const savedDiff = localStorage.getItem(DIFF_KEY) as Difficulty | null;
    const difficulty: Difficulty = savedDiff && DIFFICULTY_SETTINGS[savedDiff] ? savedDiff : DEFAULT_DIFFICULTY;

    let resumed: Partial<GameState> | null = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && Array.isArray(saved.tubes) && saved.tubes.length > 0) {
        const resumeDiff: Difficulty = saved.difficulty && DIFFICULTY_SETTINGS[saved.difficulty as Difficulty]
          ? (saved.difficulty as Difficulty) : difficulty;
        resumed = {
          level: saved.level ?? 1,
          tubes: saved.tubes as Tube[],
          mods: Array.isArray(saved.mods) && saved.mods.length === saved.tubes.length
            ? (saved.mods as Mods)
            : (saved.tubes as Tube[]).map(() => null),
          moves: saved.moves ?? 0,
          history: Array.isArray(saved.history) ? saved.history : [],
          addUses: saved.addUses ?? 1,
          optimal: saved.optimal ?? 0,
          won: !!saved.won,
          difficulty: resumeDiff,
          cap: typeof saved.cap === "number" ? saved.cap : DIFFICULTY_SETTINGS[resumeDiff].cap,
          earnedEmpties: typeof saved.earnedEmpties === "number" ? saved.earnedEmpties : 0,
        };
      }
    } catch {
      resumed = null;
    }

    if (resumed) {
      setState(prev => ({ ...prev, ...resumed, sound: snd, score, mounted: true }));
    } else {
      const lvl = parseInt(localStorage.getItem("ws_level") || "1", 10);
      const settings = DIFFICULTY_SETTINGS[difficulty];
      const { tubes, optimal, mods } = generateLevel(lvl, settings);
      setState(prev => ({
        ...prev, level: lvl, sound: snd, score, tubes, mods, optimal,
        difficulty, cap: settings.cap, mounted: true, earnedEmpties: 0,
      }));
    }
  }, []);

  // Auto-save the in-progress board so the game resumes on reload (this device).
  useEffect(() => {
    if (!state.mounted || state.tubes.length === 0) return;
    const save = {
      level: state.level,
      tubes: state.tubes,
      mods: state.mods,
      moves: state.moves,
      history: state.history,
      addUses: state.addUses,
      optimal: state.optimal,
      won: state.won,
      difficulty: state.difficulty,
      cap: state.cap,
      earnedEmpties: state.earnedEmpties,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* storage full / disabled */ }
  }, [state.mounted, state.tubes, state.mods, state.moves, state.history, state.addUses, state.optimal, state.won, state.level, state.difficulty, state.cap, state.earnedEmpties]);

  useEffect(() => {
    recalcLayout();
  }, [state.tubes.length, state.level, state.mounted, state.cap, recalcLayout]);

  useEffect(() => {
    function onResize() {
      if (animatingRef.current.size > 0) return;
      recalcLayout();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recalcLayout]);

  // Win is detected from the committed board, so it works no matter how many
  // pours were running concurrently when the final one landed.
  useEffect(() => {
    if (state.mounted && state.tubes.length > 0 && !state.won && isWon(state.tubes, state.cap)) {
      winJingle();
      const stars = starsFor(state.moves, state.optimal);
      const pts = levelScore(state.level, state.moves, state.optimal, stars);
      setState(prev => {
        const total = prev.score + pts;
        try { localStorage.setItem(SCORE_KEY, String(total)); } catch { /* ignore */ }
        return { ...prev, won: true, score: total, lastScore: pts };
      });
    }
  }, [state.tubes, state.won, state.mounted, state.moves, state.optimal, state.level, state.cap]);

  // Earned empties: the player starts with no spare empty tubes (just the single
  // working tube the deal needs to be solvable). Completing 2 tubes grants one
  // empty, completing 4 grants a second, and that's the cap. Earned empties are
  // never taken back (undo keeps them) so the board can only get easier.
  useEffect(() => {
    if (!state.mounted || state.tubes.length === 0 || state.won) return;
    const completed = state.tubes.reduce((n, t) => n + (isComplete(t, state.cap) ? 1 : 0), 0);
    const desired = Math.min(2, Math.floor(completed / 2));
    if (desired <= state.earnedEmpties) return;
    setState(prev => {
      if (desired <= prev.earnedEmpties) return prev;
      const add = desired - prev.earnedEmpties;
      const tubes = [...prev.tubes, ...Array.from({ length: add }, () => [] as number[])];
      const mods = [...prev.mods, ...Array.from({ length: add }, () => null)];
      const board = boardRef.current;
      const { tw, th } = getDims(prev.cap);
      const bw = board?.clientWidth || prev.boardSize.w;
      const bh = Math.max(board?.clientHeight || prev.boardSize.h, 600);
      const positions = computeLayout(tubes.length, bw, bh, prev.level, tw, th);
      return { ...prev, tubes, mods, earnedEmpties: desired, positions, boardSize: { w: bw, h: bh } };
    });
  }, [state.tubes, state.mounted, state.won, state.cap, state.earnedEmpties]);

  // Dynamic (mid-play) events: tubes can temporarily freeze / lock / become
  // one-way as the player solves. Everything here is designed to keep the board
  // always completable:
  //   1. Expired events are swept away (they auto-lift after a few moves).
  //   2. A new event only spawns if a legal move still remains afterward.
  //   3. Emergency lift: if the board is stuck *because of* dynamic events, they
  //      are cleared immediately so a modifier can never trap the player.
  useEffect(() => {
    if (!state.mounted || state.won || state.tubes.length === 0) return;
    const moves = state.moves;

    // Decide a spawn outside the state updater so the random choice is stable
    // (avoids double-spawning under React StrictMode's double-invoke in dev).
    const cap = state.cap;
    let spawn: ReturnType<typeof pickDynamicEvent> = null;
    if (moves > 0 && moves % DYN_EVENT_INTERVAL === 0 && Math.random() < DYN_EVENT_CHANCE) {
      spawn = pickDynamicEvent(state.tubes, state.mods, moves, state.level, cap);
    }
    if (spawn && stateRef.current.sound) hazardSound();

    setState(prev => {
      if (prev.moves !== moves) return prev; // a newer pour landed; let its effect handle it
      let mods = prev.mods;
      let changed = false;

      const swept = mods.map(m =>
        m && m.dynamic && m.expiresAtMove != null && prev.moves >= m.expiresAtMove ? null : m
      );
      if (swept.some((m, i) => m !== mods[i])) { mods = swept; changed = true; }

      if (spawn && mods[spawn.index] == null) {
        const nm = mods.slice();
        nm[spawn.index] = spawn.mod;
        mods = nm;
        changed = true;
      }

      if (!hasLegalMove(prev.tubes, mods, prev.moves, cap)) {
        const stripped = mods.map(m => (m && m.dynamic ? null : m));
        if (hasLegalMove(prev.tubes, stripped, prev.moves, cap)) { mods = stripped; changed = true; }
      }

      return changed ? { ...prev, mods } : prev;
    });
  }, [state.moves, state.mounted, state.won, state.tubes.length, state.level, state.cap]);

  const buildLevel = useCallback((lv: number, diff: Difficulty = stateRef.current.difficulty) => {
    const settings = DIFFICULTY_SETTINGS[diff];
    const { tubes, optimal, mods } = generateLevel(lv, settings);
    const board = boardRef.current;
    const { tw, th } = getDims(settings.cap);
    const bw = board?.clientWidth || 360;
    const bh = Math.max(board?.clientHeight || 600, 600);
    const positions = computeLayout(tubes.length, bw, bh, lv, tw, th);
    animatingRef.current.clear();
    setState(prev => ({
      ...prev,
      level: lv,
      tubes,
      mods,
      optimal,
      moves: 0,
      history: [],
      addUses: 1,
      selected: -1,
      busy: false,
      won: false,
      hinted: [],
      positions,
      boardSize: { w: bw, h: bh },
      difficulty: diff,
      cap: settings.cap,
      earnedEmpties: 0,
    }));
  }, []);

  const commitPour = useCallback((from: number, to: number, color: number, count: number) => {
    // The pour locks both tubes (disjoint with any concurrent pour), so the
    // destination's modifier is stable here: detect a frozen-thaw up front.
    const mTo = stateRef.current.mods[to];
    const willThaw = !!(mTo && mTo.kind === "frozen" && !mTo.thawed);
    if (willThaw && stateRef.current.sound) iceCrack();

    // Apply this pour's delta inside the updater so concurrent pours compose
    // correctly on top of each other (win is detected by an effect on tubes).
    setState(prev => {
      const nt = prev.tubes.map(t => t.slice());
      // Move the actual top `count` segments, preserving wild vs. real values.
      const moved = nt[from].splice(nt[from].length - count, count);
      for (const seg of moved) nt[to].push(seg);
      // A drained one-way tube converts to a normal tube; a matching pour onto a
      // frozen tube thaws it.
      const drainedOneway = prev.mods[from]?.kind === "oneway" && nt[from].length === 0;
      let nm = prev.mods;
      if (willThaw || drainedOneway) {
        nm = prev.mods.map((m, i) => {
          if (i === to && m && m.kind === "frozen") return { ...m, thawed: true };
          if (i === from && drainedOneway) return null;
          return m;
        });
      }
      return {
        ...prev,
        tubes: nt,
        mods: nm,
        history: [...prev.history, { from, to, count, color }],
        moves: prev.moves + 1,
      };
    });
    animatingRef.current.delete(from);
    animatingRef.current.delete(to);
  }, []);

  const doPour = useCallback((from: number, to: number) => {
    const s = stateRef.current;
    const cap = s.cap;
    const grp = topGroup(s.tubes[from]);
    const color = grp.color;
    const count = Math.min(grp.count, cap - s.tubes[to].length);
    const existing = s.tubes[to].length;
    const moved = s.tubes[from].slice(s.tubes[from].length - count);
    const willComplete = existing + count === cap && isUniform(s.tubes[to].concat(moved));
    animatingRef.current.add(from);
    animatingRef.current.add(to);
    setState(prev => ({ ...prev, selected: -1 }));

    const board = boardRef.current;
    const src = tubeEls.current[from];
    const dst = tubeEls.current[to];
    if (!board || !src || !dst) {
      setTimeout(() => {
        if (willComplete && stateRef.current.sound) corkPop();
        commitPour(from, to, color, count);
      }, 50);
      return;
    }

    const sr = src.getBoundingClientRect();
    const dr = dst.getBoundingClientRect();
    const right = dr.left >= sr.left;
    const rot = right ? 112 : -112;

    const dxT = (dr.left + dr.width / 2) - (sr.left + sr.width / 2);
    const mouthY = (dr.top - 9) - sr.top;
    // Hover just above the destination's rim, then dip to pour. This keeps the
    // tube travelling directly over the target instead of rising to the top of
    // the board first (which looked silly for same-row pours).
    const hoverY = mouthY - 34;
    const segsBox = segEls.current[from];
    const segH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--segh")) || 22;
    const fillEls: HTMLElement[] = [];

    src.style.zIndex = "50";
    src.style.transformOrigin = "50% 0";
    // Glide diagonally straight over the destination tube.
    src.style.transition = "transform .28s ease-in-out";
    src.style.transform = `translate(${dxT}px,${hoverY}px)`;

    setTimeout(() => {
      // Dip onto the rim and tilt to pour.
      src.style.transition = "transform .2s ease-out";
      src.style.transform = `translate(${dxT + (right ? -4 : 4)}px,${mouthY}px) rotate(${rot}deg)`;
      if (segsBox) {
        segsBox.style.transition = "transform .2s ease-out";
        segsBox.style.transform = `skewY(${right ? -20 : 20}deg)`;
      }
    }, 290);

    const pourStart = 520;
    const holdMs = 240 + count * 110;

    setTimeout(() => {
      // Sound starts exactly when the liquid begins to pour.
      if (stateRef.current.sound) pourSound(holdMs + 200);

      // Inset = tube border (2px) + segs container inset (3px) = 5px, so overlay
      // blocks match the real segment width/position exactly.
      const INSET = 5;
      const br = board.getBoundingClientRect();
      const innerLeft = dr.left - br.left + INSET;
      const innerWidth = dr.width - INSET * 2;
      const containerBottom = dr.bottom - br.top - INSET;
      const streamX = dr.left - br.left + dr.width / 2 - 2;
      const surfaceY = containerBottom - existing * segH;

      // Pouring stream connecting the tilted mouth down to the liquid surface.
      const streamTop = dr.top - br.top - 6;
      const stream = document.createElement("div");
      stream.style.position = "absolute";
      stream.style.width = "4px";
      stream.style.borderRadius = "2px";
      stream.style.pointerEvents = "none";
      stream.style.zIndex = "40";
      stream.style.background = segBg(color);
      stream.style.left = streamX + "px";
      stream.style.top = streamTop + "px";
      stream.style.height = "0px";
      board.appendChild(stream);
      requestAnimationFrame(() => {
        stream.style.transition = "height .12s linear";
        stream.style.height = Math.max(10, surfaceY - streamTop) + "px";
      });

      for (let d = 0; d < 3; d++) {
        const drop = document.createElement("div");
        drop.style.position = "absolute";
        drop.style.width = "5px";
        drop.style.height = "5px";
        drop.style.borderRadius = "50%";
        drop.style.pointerEvents = "none";
        drop.style.zIndex = "39";
        drop.style.background = segBg(color);
        drop.style.left = streamX + "px";
        drop.style.top = (dr.top - br.top + 3) + "px";
        drop.style.setProperty("--dxd", ((d - 1) * 9) + "px");
        drop.style.animation = "dropfall .45s ease-out forwards";
        board.appendChild(drop);
        setTimeout(() => drop.remove(), 470);
      }

      // Drain the source tube one unit at a time (top unit first).
      if (segsBox) {
        const kids = segsBox.children;
        for (let k = 0; k < count; k++) {
          const el = kids[kids.length - 1 - k] as HTMLElement | undefined;
          if (el) setTimeout(() => { el.style.height = "0px"; }, k * 110);
        }
      }

      // Realistic rising liquid: a single column of the poured color grows from
      // the current surface up to its new level, topped by a moving wavy surface.
      const liquidColor = segBg(color);
      // The SVG wave needs a solid fill, so wildcards use a representative hue.
      const waveFill = color === WILD ? "#A855F7" : liquidColor;
      const waveSvg =
        "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='12' viewBox='0 0 36 12'><path d='M0 7 Q9 1 18 7 T36 7 V12 H0 Z' fill='${waveFill}'/></svg>`
        );
      const boardH = br.height;
      const bodyBottomY = containerBottom - existing * segH; // top of existing liquid
      const riseH = count * segH;

      const column = document.createElement("div");
      column.style.position = "absolute";
      column.style.left = innerLeft + "px";
      column.style.width = innerWidth + "px";
      column.style.bottom = (boardH - bodyBottomY) + "px";
      column.style.height = "0px";
      column.style.background = liquidColor;
      column.style.zIndex = "38";
      column.style.pointerEvents = "none";
      column.style.transformOrigin = "bottom";
      if (existing === 0) {
        column.style.borderBottomLeftRadius = "9px";
        column.style.borderBottomRightRadius = "9px";
      }

      const wave = document.createElement("div");
      wave.style.position = "absolute";
      wave.style.left = "0";
      wave.style.right = "0";
      wave.style.top = "-7px";
      wave.style.height = "9px";
      wave.style.pointerEvents = "none";
      wave.style.backgroundImage = `url("${waveSvg}")`;
      wave.style.backgroundRepeat = "repeat-x";
      wave.style.backgroundSize = "36px 9px";
      wave.style.animation = "liquidwave .55s linear infinite";
      column.appendChild(wave);

      board.appendChild(column);
      fillEls.push(column);

      requestAnimationFrame(() => {
        column.style.transition = `height ${(holdMs / 1000).toFixed(2)}s cubic-bezier(.45,.05,.4,1)`;
        column.style.height = riseH + "px";
      });

      // Calm the surface and give a fluid wobble once the level finishes rising.
      setTimeout(() => {
        wave.style.transition = "opacity .25s ease, height .25s ease";
        wave.style.height = "3px";
        wave.style.opacity = "0.55";
        column.style.animation = "liquidsettle .42s ease-out";
      }, holdMs);

      setTimeout(() => {
        stream.style.height = "0px";
        setTimeout(() => stream.remove(), 140);
      }, holdMs);
    }, pourStart);

    const pourDone = pourStart + holdMs + 150;

    setTimeout(() => {
      // Untilt and lift back to the hover height above the destination.
      if (segsBox) segsBox.style.transform = "";
      src.style.transition = "transform .2s ease-in";
      src.style.transform = `translate(${dxT}px,${hoverY}px)`;
    }, pourDone);

    setTimeout(() => {
      // Glide diagonally straight back home.
      src.style.transition = "transform .28s ease-in-out";
      src.style.transform = "";
    }, pourDone + 210);

    setTimeout(() => {
      src.style.zIndex = "";
      src.style.transition = "";
      src.style.transformOrigin = "";
      src.style.transform = "";
      if (segsBox) {
        segsBox.style.transition = "";
        segsBox.style.transform = "";
      }
      if (willComplete && stateRef.current.sound) corkPop();
      commitPour(from, to, color, count);
      // Remove overlays after React has painted the real segments (avoids flicker).
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fillEls.forEach(el => el.remove());
      }));
    }, pourDone + 520);
  }, [commitPour]);

  const selectTube = useCallback((i: number) => {
    const s = stateRef.current;
    if (s.won) return;
    if (animatingRef.current.has(i)) return; // this tube is mid-pour
    if (s.selected === -1) {
      if (!s.tubes[i].length || isComplete(s.tubes[i], s.cap)) return;
      // A frozen/locked tube can't be a source until it opens up.
      if (!canSource(s.mods[i], s.moves)) {
        if (s.sound) blockedSound();
        return;
      }
      if (s.sound) clink();
      setState(prev => ({ ...prev, selected: i }));
    } else if (s.selected === i) {
      setState(prev => ({ ...prev, selected: -1 }));
    } else {
      const from = s.selected;
      if (animatingRef.current.has(from) || !canPour(s.tubes, from, i, s.mods, s.moves, s.cap)) {
        if (s.sound) blockedSound();
        setState(prev => ({ ...prev, selected: -1 }));
        return;
      }
      // Dead-end guard: refuse a (legal) pour that would leave the board with no
      // possible solution — this stops wildcards from ever trapping the player.
      // Fail-open: only blocked when the solver PROVES the result is unwinnable.
      const next = applyPour(s.tubes, s.mods, from, i, s.cap);
      if (isProvablyStuck(next.tubes, next.mods, s.moves + 1, s.cap)) {
        if (s.sound) blockedSound();
        setState(prev => ({ ...prev, selected: -1, hinted: [from, i] }));
        setTimeout(() => setState(prev => ({ ...prev, hinted: [] })), 450);
        return;
      }
      doPour(from, i);
    }
  }, [doPour]);

  const undo = useCallback(() => {
    const s = stateRef.current;
    if (animatingRef.current.size > 0 || !s.history.length) return;
    if (s.sound) clink();
    setState(prev => {
      const m = prev.history[prev.history.length - 1];
      const nt = prev.tubes.map(t => t.slice());
      // The top `count` segments of `to` are exactly what was poured, so move
      // them back (preserves wild vs. real values).
      const moved = nt[m.to].splice(nt[m.to].length - m.count, m.count);
      for (const seg of moved) nt[m.from].push(seg);
      return {
        ...prev,
        tubes: nt,
        history: prev.history.slice(0, -1),
        moves: prev.moves + 1,
        selected: -1,
      };
    });
  }, []);

  const addTube = useCallback(() => {
    const s = stateRef.current;
    if (animatingRef.current.size > 0 || s.addUses <= 0) return;
    if (s.sound) clink();
    setState(prev => {
      const nt = [...prev.tubes, [] as number[]];
      const nm = [...prev.mods, null];
      const board = boardRef.current;
      const { tw, th } = getDims(prev.cap);
      const bw = board?.clientWidth || prev.boardSize.w;
      const bh = Math.max(board?.clientHeight || prev.boardSize.h, 600);
      const positions = computeLayout(nt.length, bw, bh, prev.level, tw, th);
      return { ...prev, tubes: nt, mods: nm, addUses: prev.addUses - 1, positions, boardSize: { w: bw, h: bh } };
    });
  }, []);

  const hint = useCallback(() => {
    const s = stateRef.current;
    if (animatingRef.current.size > 0) return;
    const sol = solve(s.tubes, 300000, s.mods, s.moves, s.cap);
    if (!sol || !sol.length) {
      if (s.sound) blockedSound();
      return;
    }
    if (s.sound) clink();
    const pair = [sol[0].from, sol[0].to];
    setState(prev => ({ ...prev, hinted: pair }));
    setTimeout(() => setState(prev => ({ ...prev, hinted: [] })), 1400);
  }, []);

  const nextLevel = useCallback(() => {
    const s = stateRef.current;
    const newLevel = s.level + 1;
    localStorage.setItem("ws_level", String(newLevel));
    // Dismiss the win overlay first (and clear the board so the win effect, which
    // is guarded by tubes.length > 0, doesn't immediately re-fire on the still-
    // solved board), then build the next level on a later frame so the browser can
    // repaint immediately — level generation can be CPU-heavy.
    setState(prev => ({ ...prev, won: false, tubes: [], selected: -1 }));
    requestAnimationFrame(() => requestAnimationFrame(() => buildLevel(newLevel)));
  }, [buildLevel]);

  const restart = useCallback(() => {
    if (animatingRef.current.size > 0) return;
    localStorage.setItem("ws_level", "1");
    localStorage.setItem(SCORE_KEY, "0");
    localStorage.removeItem(SAVE_KEY);
    setState(prev => ({ ...prev, score: 0, lastScore: 0 }));
    buildLevel(1);
  }, [buildLevel]);

  const toggleSound = useCallback(() => {
    setState(prev => {
      const newSound = !prev.sound;
      localStorage.setItem("ws_sound", newSound ? "1" : "0");
      if (newSound) clink();
      return { ...prev, sound: newSound };
    });
  }, []);

  // Switching difficulty rebuilds the current level under the new preset (this
  // restarts the level, since capacity/colors change the whole board).
  const setDifficulty = useCallback((diff: Difficulty) => {
    const s = stateRef.current;
    if (animatingRef.current.size > 0 || diff === s.difficulty) return;
    localStorage.setItem(DIFF_KEY, diff);
    if (s.sound) clink();
    // Clear the board first so the win effect can't re-fire, then rebuild on a
    // later frame so the UI repaints before the (CPU-heavy) generation.
    setState(prev => ({ ...prev, tubes: [], won: false, selected: -1 }));
    requestAnimationFrame(() => requestAnimationFrame(() => buildLevel(stateRef.current.level, diff)));
  }, [buildLevel]);

  return {
    state,
    boardRef,
    registerTube,
    registerSegs,
    selectTube,
    undo,
    addTube,
    hint,
    nextLevel,
    restart,
    toggleSound,
    setDifficulty,
    recalcLayout,
  };
}
