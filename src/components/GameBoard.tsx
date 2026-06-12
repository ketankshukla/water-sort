"use client";

import { Tube as TubeType, Mods } from "@/lib/game";
import { Position } from "@/lib/layout";
import Tube from "./Tube";

interface GameBoardProps {
  tubes: TubeType[];
  mods: Mods;
  moves: number;
  positions: Position[];
  selected: number;
  hinted: number[];
  onTubeClick: (i: number) => void;
  boardRef: React.RefObject<HTMLDivElement | null>;
  registerTube: (i: number, el: HTMLDivElement | null) => void;
  registerSegs: (i: number, el: HTMLDivElement | null) => void;
}

export default function GameBoard({
  tubes, mods, moves, positions, selected, hinted, onTubeClick, boardRef, registerTube, registerSegs,
}: GameBoardProps) {
  return (
    <div
      ref={boardRef}
      className="w-full max-w-[900px] flex-1 min-h-[600px] relative"
      aria-label="Puzzle board"
    >
      {tubes.map((t, i) => (
        <Tube
          key={i}
          tube={t}
          index={i}
          x={positions[i]?.x ?? 10}
          y={positions[i]?.y ?? 10}
          selected={i === selected}
          hinted={hinted.includes(i)}
          mod={mods[i]}
          moves={moves}
          onClick={() => onTubeClick(i)}
          registerTube={registerTube}
          registerSegs={registerSegs}
        />
      ))}
    </div>
  );
}
