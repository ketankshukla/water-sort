"use client";

import { Difficulty, DIFFICULTY_SETTINGS } from "@/lib/game";

interface GameHeaderProps {
  level: number;
  moves: number;
  score: number;
  sound: boolean;
  difficulty: Difficulty;
  onToggleSound: () => void;
  onSetDifficulty: (d: Difficulty) => void;
}

const ORDER: Difficulty[] = ["casual", "normal", "hard"];

export default function GameHeader({
  level, moves, score, sound, difficulty, onToggleSound, onSetDifficulty,
}: GameHeaderProps) {
  return (
    <header className="w-full max-w-[900px] flex flex-col gap-[10px] px-5 pt-[18px] pb-[6px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[27px] font-bold">Level {level}</div>
          <div className="text-[17px] text-[#7d88ad] font-medium">moves {moves}</div>
        </div>
        <div className="text-right">
          <div className="text-[13px] uppercase tracking-[2px] text-[#7d88ad] font-medium">Score</div>
          <div className="text-[27px] font-bold text-[#E8AE2E] leading-none">{score.toLocaleString()}</div>
        </div>
        <button
          onClick={onToggleSound}
          className="w-[46px] h-[46px] rounded-full border-none bg-[#1a2142] text-[#e8ecfa] text-[21px] cursor-pointer flex items-center justify-center leading-none active:scale-[0.96]"
          title="Sound on or off"
          aria-label="Sound on or off"
        >
          {sound ? "🔊" : "🔇"}
        </button>
      </div>

      {/* Difficulty selector: switching presets restarts the current level with
          a new capacity / empty-tube count / color count. */}
      <div
        className="flex items-center gap-[4px] rounded-full bg-[#1a2142] p-[4px] self-start"
        role="group"
        aria-label="Difficulty"
      >
        {ORDER.map(d => {
          const active = d === difficulty;
          return (
            <button
              key={d}
              onClick={() => onSetDifficulty(d)}
              aria-pressed={active}
              className={`rounded-full px-[14px] py-[6px] text-[14px] font-semibold leading-none cursor-pointer border-none transition-colors active:scale-[0.96] ${
                active ? "bg-[#3a7bfa] text-white" : "bg-transparent text-[#7d88ad]"
              }`}
            >
              {DIFFICULTY_SETTINGS[d].label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
