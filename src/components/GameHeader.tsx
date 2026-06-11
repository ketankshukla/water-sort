"use client";

interface GameHeaderProps {
  level: number;
  moves: number;
  score: number;
  sound: boolean;
  onToggleSound: () => void;
}

export default function GameHeader({ level, moves, score, sound, onToggleSound }: GameHeaderProps) {
  return (
    <header className="w-full max-w-[900px] flex items-center justify-between px-5 pt-[18px] pb-[6px]">
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
    </header>
  );
}
