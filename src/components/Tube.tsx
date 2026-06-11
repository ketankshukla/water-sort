"use client";

import { useRef } from "react";
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

  // Pointer-based tap so a tap still registers on mobile even with a little
  // finger movement (the browser otherwise cancels the click as a scroll).
  const down = useRef<{ x: number; y: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    const moved = Math.abs(e.clientX - d.x) > 24 || Math.abs(e.clientY - d.y) > 24;
    if (!moved && Date.now() - d.t < 800) onClick();
  };

  const borderClass = selected
    ? "border-[#9fb0e8] -translate-y-3"
    : done
      ? "border-[#79b88a]"
      : "border-[#4a5478]";

  return (
    <div
      ref={(el) => { registerTube(index, el); }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{
        left: x,
        top: y,
        width: "var(--tubew)",
        height: "var(--tubeh)",
        touchAction: "manipulation",
      }}
      className={`absolute cursor-pointer transition-transform duration-150 ease-out border-2 border-t-0 rounded-b-[14px] bg-white/[0.03] select-none
        ${borderClass} ${hinted ? "animate-hintpulse !border-[#9fb0e8]" : ""}`}
    >
      {/* Invisible enlarged hit area so a fingertip can tap near the thin tube.
          Buffer sizes are kept in sync with the layout spacing in layout.ts so
          neighbouring tap zones never overlap. */}
      <span className="absolute -left-[22px] -right-[22px] -top-[24px] -bottom-[16px]" aria-hidden="true" />

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

      <div
        className="pointer-events-none absolute inset-0 rounded-b-[14px]"
        style={{
          background:
            "linear-gradient(100deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 16%, rgba(255,255,255,0) 34%, rgba(255,255,255,0) 68%, rgba(255,255,255,0.04) 84%, rgba(255,255,255,0.12) 100%)",
        }}
        aria-hidden="true"
      />

      {done && (
        <div
          className="absolute left-[-4px] right-[-4px] top-[-9px] h-[14px] rounded-[5px] z-[2] animate-corkpop"
          style={{
            background: "linear-gradient(#d2a878, #a3743f 60%, #875e30)",
            boxShadow: "0 2px 5px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.35)",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
