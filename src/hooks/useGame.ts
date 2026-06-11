import { useState, useCallback, useRef, useEffect } from "react";
import { CAP, PAL, Tube, Move, topColor, topRun, isComplete, canPour, isWon, solve, generateLevel } from "@/lib/game";
import { clink, blockedSound, winJingle, pourSound, corkPop } from "@/lib/audio";
import { computeLayout, Position } from "@/lib/layout";

export interface GameState {
  level: number;
  tubes: Tube[];
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
  boardSize: { w: number; h: number };
  tubeSize: { w: number; h: number; segH: number };
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
    boardSize: { w: 360, h: 340 },
    tubeSize: { w: 30, h: 100, segH: 22 },
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const registerTube = useCallback((i: number, el: HTMLDivElement | null) => {
    tubeEls.current[i] = el;
  }, []);
  const registerSegs = useCallback((i: number, el: HTMLDivElement | null) => {
    segEls.current[i] = el;
  }, []);

  const getDims = () => {
    if (typeof window === "undefined") return { tw: 30, th: 100 };
    const cs = getComputedStyle(document.documentElement);
    const tw = parseFloat(cs.getPropertyValue("--tubew")) || 30;
    const th = parseFloat(cs.getPropertyValue("--tubeh")) || 100;
    return { tw, th };
  };

  const recalcLayout = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const { tw, th } = getDims();
    const bw = board.clientWidth || 360;
    const bh = Math.max(board.clientHeight, 340);
    const s = stateRef.current;
    const positions = computeLayout(s.tubes.length, bw, bh, s.level, tw, th);
    setState(prev => ({ ...prev, positions, boardSize: { w: bw, h: bh } }));
  }, []);

  // Build the first level only after mount to avoid SSR/hydration mismatch
  useEffect(() => {
    const lvl = parseInt(localStorage.getItem("ws_level") || "1", 10);
    const snd = localStorage.getItem("ws_sound") !== "0";
    const { tubes, optimal } = generateLevel(lvl);
    setState(prev => ({ ...prev, level: lvl, sound: snd, tubes, optimal, mounted: true }));
  }, []);

  useEffect(() => {
    recalcLayout();
  }, [state.tubes.length, state.level, state.mounted, recalcLayout]);

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
    if (state.mounted && state.tubes.length > 0 && !state.won && isWon(state.tubes)) {
      winJingle();
      setState(prev => ({ ...prev, won: true }));
    }
  }, [state.tubes, state.won, state.mounted]);

  const buildLevel = useCallback((lv: number) => {
    const { tubes, optimal } = generateLevel(lv);
    const board = boardRef.current;
    const { tw, th } = getDims();
    const bw = board?.clientWidth || 360;
    const bh = Math.max(board?.clientHeight || 340, 340);
    const positions = computeLayout(tubes.length, bw, bh, lv, tw, th);
    animatingRef.current.clear();
    setState(prev => ({
      ...prev,
      level: lv,
      tubes,
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
    }));
  }, []);

  const commitPour = useCallback((from: number, to: number, color: number, count: number) => {
    // Apply this pour's delta inside the updater so concurrent pours compose
    // correctly on top of each other (win is detected by an effect on tubes).
    setState(prev => {
      const nt = prev.tubes.map(t => t.slice());
      for (let k = 0; k < count; k++) nt[from].pop();
      for (let k = 0; k < count; k++) nt[to].push(color);
      return {
        ...prev,
        tubes: nt,
        history: [...prev.history, { from, to, count, color }],
        moves: prev.moves + 1,
      };
    });
    animatingRef.current.delete(from);
    animatingRef.current.delete(to);
  }, []);

  const doPour = useCallback((from: number, to: number) => {
    const s = stateRef.current;
    const color = topColor(s.tubes[from]);
    const count = Math.min(topRun(s.tubes[from]), CAP - s.tubes[to].length);
    const existing = s.tubes[to].length;
    const willComplete = existing + count === CAP && s.tubes[to].every(c => c === color);
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

    let minTop = Infinity;
    tubeEls.current.forEach(e => {
      if (e) {
        const r = e.getBoundingClientRect();
        if (r.top < minTop) minTop = r.top;
      }
    });
    const altY = (minTop - 18 - sr.height) - sr.top;
    const dxT = (dr.left + dr.width / 2) - (sr.left + sr.width / 2);
    const mouthY = (dr.top - 9) - sr.top;
    const segsBox = segEls.current[from];
    const segH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--segh")) || 22;
    const fillEls: HTMLElement[] = [];

    src.style.zIndex = "50";
    src.style.transformOrigin = "50% 0";
    src.style.transition = "transform .16s ease-in";
    src.style.transform = `translate(0px,${altY}px)`;

    setTimeout(() => {
      src.style.transition = "transform .22s ease-in-out";
      src.style.transform = `translate(${dxT}px,${altY}px)`;
    }, 170);

    setTimeout(() => {
      src.style.transition = "transform .24s ease-out";
      src.style.transform = `translate(${dxT + (right ? -4 : 4)}px,${mouthY}px) rotate(${rot}deg)`;
      if (segsBox) {
        segsBox.style.transition = "transform .24s ease-out";
        segsBox.style.transform = `skewY(${right ? -20 : 20}deg)`;
      }
    }, 410);

    const pourStart = 670;
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
      stream.style.background = PAL[color];
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
        drop.style.background = PAL[color];
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

      // Grow the destination block(s) from the bottom up, in sync with the drain,
      // so the level square visibly forms as the liquid pours in.
      for (let k = 0; k < count; k++) {
        const bandIndex = existing + k;
        const bandTop = containerBottom - (bandIndex + 1) * segH;
        const fill = document.createElement("div");
        fill.style.position = "absolute";
        fill.style.left = innerLeft + "px";
        fill.style.width = innerWidth + "px";
        fill.style.top = bandTop + "px";
        fill.style.height = segH + "px";
        fill.style.background = PAL[color];
        fill.style.transformOrigin = "bottom";
        fill.style.transform = "scaleY(0)";
        fill.style.zIndex = "38";
        fill.style.pointerEvents = "none";
        if (bandIndex === 0) {
          fill.style.borderBottomLeftRadius = "9px";
          fill.style.borderBottomRightRadius = "9px";
        }
        board.appendChild(fill);
        fillEls.push(fill);
        setTimeout(() => {
          fill.style.transition = "transform .16s ease-out";
          fill.style.transform = "scaleY(1)";
        }, 60 + k * 110);
      }

      setTimeout(() => {
        stream.style.height = "0px";
        setTimeout(() => stream.remove(), 140);
      }, holdMs);
    }, pourStart);

    const pourDone = pourStart + holdMs + 150;

    setTimeout(() => {
      if (segsBox) segsBox.style.transform = "";
      src.style.transition = "transform .18s ease-in";
      src.style.transform = `translate(${dxT}px,${altY}px)`;
    }, pourDone);

    setTimeout(() => {
      src.style.transition = "transform .2s ease-in-out";
      src.style.transform = `translate(0px,${altY}px)`;
    }, pourDone + 190);

    setTimeout(() => {
      src.style.transition = "transform .15s ease-out";
      src.style.transform = "";
    }, pourDone + 400);

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
    }, pourDone + 570);
  }, [commitPour]);

  const selectTube = useCallback((i: number) => {
    const s = stateRef.current;
    if (s.won) return;
    if (animatingRef.current.has(i)) return; // this tube is mid-pour
    if (s.selected === -1) {
      if (!s.tubes[i].length || isComplete(s.tubes[i])) return;
      if (s.sound) clink();
      setState(prev => ({ ...prev, selected: i }));
    } else if (s.selected === i) {
      setState(prev => ({ ...prev, selected: -1 }));
    } else {
      const from = s.selected;
      if (animatingRef.current.has(from) || !canPour(s.tubes, from, i)) {
        if (s.sound) blockedSound();
        setState(prev => ({ ...prev, selected: -1 }));
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
      for (let k = 0; k < m.count; k++) nt[m.to].pop();
      for (let k = 0; k < m.count; k++) nt[m.from].push(m.color);
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
      const board = boardRef.current;
      const { tw, th } = getDims();
      const bw = board?.clientWidth || prev.boardSize.w;
      const bh = Math.max(board?.clientHeight || prev.boardSize.h, 340);
      const positions = computeLayout(nt.length, bw, bh, prev.level, tw, th);
      return { ...prev, tubes: nt, addUses: prev.addUses - 1, positions, boardSize: { w: bw, h: bh } };
    });
  }, []);

  const newDeal = useCallback(() => {
    const s = stateRef.current;
    if (animatingRef.current.size > 0) return;
    buildLevel(s.level);
  }, [buildLevel]);

  const hint = useCallback(() => {
    const s = stateRef.current;
    if (animatingRef.current.size > 0) return;
    const sol = solve(s.tubes);
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
    buildLevel(newLevel);
  }, [buildLevel]);

  const toggleSound = useCallback(() => {
    setState(prev => {
      const newSound = !prev.sound;
      localStorage.setItem("ws_sound", newSound ? "1" : "0");
      if (newSound) clink();
      return { ...prev, sound: newSound };
    });
  }, []);

  return {
    state,
    boardRef,
    registerTube,
    registerSegs,
    selectTube,
    undo,
    addTube,
    newDeal,
    hint,
    nextLevel,
    toggleSound,
    recalcLayout,
  };
}
