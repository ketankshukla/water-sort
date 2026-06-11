"use client";

import { useEffect, useState } from "react";
import { PAL } from "@/lib/game";

interface Particle {
  id: number;
  left: string;
  bg: string;
  delay: string;
}

export default function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }
    const pts: Particle[] = [];
    for (let i = 0; i < 26; i++) {
      pts.push({
        id: i,
        left: `${5 + Math.random() * 90}vw`,
        bg: PAL[i % PAL.length],
        delay: `${Math.random() * 0.5}s`,
      });
    }
    setParticles(pts);
    const t = setTimeout(() => setParticles([]), 2300);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="fixed w-[11px] h-[11px] z-[99] pointer-events-none animate-fall"
          style={{ left: p.left, top: "-12px", background: p.bg, animationDelay: p.delay }}
        />
      ))}
    </>
  );
}
