"use client";

import { PAL, CAP, Tube as TubeType } from "@/lib/game";

interface TubeProps {
  tube: TubeType;
  index: number;
  x: number;
  y: number;
  selected: boolean;
  hinted: boolean;
  onClick: () => void;
  registerTube: (i: number, el: HTMLDivElement | null) => void;
  registerSegs: (i: number, el: HTMLDivElement | null) => void;
}

function isComplete(t: TubeType) {
  return t.length === CAP && t.every(c => c === t[0]);
}

export default function Tube({
  tube, index, x, y, selected, hinted, onClick, registerTube, registerSegs,
}: TubeProps) {
  const top = tube.length ? tube[tube.length - 1] : -1;
  const glow = top >= 0 ? `0 0 14px ${PAL[top]}55` : undefined;
  const done = isComplete(tube);

  const borderClass = selected
    ? "border-[#9fb0e8] -translate-y-3"
    : done
      ? "border-[#79b88a]"
      : "border-[#4a5478]";

  return (
    <div
      ref={(el) => { registerTube(index, el); }}
      onClick={onClick}
      className={`absolute cursor-pointer transition-transform duration-150 ease-out border-2 border-t-0 rounded-b-[14px] bg-white/[0.03] select-none
        ${borderClass} ${hinted ? "animate-hintpulse !border-[#9fb0e8]" : ""}`}
      style={{
        left: x,
        top: y,
        width: "var(--tubew)",
        height: "var(--tubeh)",
      }}
    >
      <div
        ref={(el) => { registerSegs(index, el); }}
        className="absolute left-[3px] right-[3px] bottom-[3px] flex flex-col-reverse rounded-b-[10px] overflow-hidden"
        style={{ boxShadow: glow }}
      >
        {tube.map((c, i) => (
          <div
            key={i}
            className="transition-all duration-200 ease-out"
            style={{
              height: "var(--segh)",
              background: PAL[c],
            }}
          />
        ))}
      </div>
    </div>
  );
}
