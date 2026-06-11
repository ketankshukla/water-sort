"use client";

interface WinOverlayProps {
  show: boolean;
  stars: number;
  moves: number;
  optimal: number;
  onNext: () => void;
}

export default function WinOverlay({ show, stars, moves, optimal, onNext }: WinOverlayProps) {
  return (
    <div
      className={`fixed inset-0 bg-[rgba(2,4,14,0.62)] z-[100] flex items-center justify-center transition-opacity duration-200 ${
        show ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-[#1a2142] rounded-[26px] px-10 pt-[34px] pb-8 text-center max-w-[340px] w-[88%]">
        <h2 className="m-0 mb-[6px] text-[29px] font-bold">Level complete</h2>
        <div className="text-[36px] tracking-[6px] text-[#E8AE2E] my-[4px] mx-0">
          {"★".repeat(stars)}
          <span className="opacity-[0.25]">{"★".repeat(3 - stars)}</span>
        </div>
        <p className="text-[#7d88ad] text-[17px] m-0 mb-5">
          {moves} moves &middot; optimal {optimal}
        </p>
        <button
          onClick={onNext}
          className="border-none bg-[#3a7bfa] text-white font-medium text-[19px] rounded-[26px] px-11 py-[13px] cursor-pointer active:scale-[0.97]"
        >
          Next level
        </button>
      </div>
    </div>
  );
}
