"use client";

import { useGame } from "@/hooks/useGame";
import GameHeader from "@/components/GameHeader";
import GameBoard from "@/components/GameBoard";
import Toolbar from "@/components/Toolbar";
import WinOverlay from "@/components/WinOverlay";
import Confetti from "@/components/Confetti";

export default function Home() {
  const {
    state, boardRef, registerTube, registerSegs,
    selectTube, undo, addTube, newDeal, hint, nextLevel, toggleSound,
  } = useGame();

  const stars = state.moves <= state.optimal + 1 ? 3 : (state.moves <= state.optimal + 5 ? 2 : 1);

  return (
    <main className="flex flex-col items-center min-h-[100dvh] w-full">
      <GameHeader
        level={state.level}
        moves={state.moves}
        sound={state.sound}
        onToggleSound={toggleSound}
      />
      <GameBoard
        tubes={state.tubes}
        positions={state.positions}
        selected={state.selected}
        hinted={state.hinted}
        onTubeClick={selectTube}
        boardRef={boardRef}
        registerTube={registerTube}
        registerSegs={registerSegs}
      />
      <Toolbar
        canUndo={state.history.length > 0}
        canAdd={state.addUses > 0}
        onUndo={undo}
        onAdd={addTube}
        onNew={newDeal}
        onHint={hint}
      />
      <WinOverlay
        show={state.won}
        stars={stars}
        moves={state.moves}
        optimal={state.optimal}
        onNext={nextLevel}
      />
      <Confetti active={state.won} />
    </main>
  );
}
