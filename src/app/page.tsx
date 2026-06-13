"use client";

import { useGame, starsFor } from "@/hooks/useGame";
import GameHeader from "@/components/GameHeader";
import GameBoard from "@/components/GameBoard";
import Toolbar from "@/components/Toolbar";
import WinOverlay from "@/components/WinOverlay";
import Confetti from "@/components/Confetti";

export default function Home() {
  const {
    state, boardRef, registerTube, registerSegs,
    selectTube, undo, addTube, hint, nextLevel, restart, toggleSound, setDifficulty,
  } = useGame();

  const stars = starsFor(state.moves, state.optimal);

  const handleRestart = () => {
    if (state.level <= 1 || window.confirm("Restart from Level 1? Your current progress will be lost.")) {
      restart();
    }
  };

  return (
    <main className="flex flex-col items-center min-h-[100dvh] w-full">
      <GameHeader
        level={state.level}
        moves={state.moves}
        score={state.score}
        sound={state.sound}
        difficulty={state.difficulty}
        onToggleSound={toggleSound}
        onSetDifficulty={setDifficulty}
      />
      <GameBoard
        tubes={state.tubes}
        mods={state.mods}
        moves={state.moves}
        cap={state.cap}
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
        onHint={hint}
        onRestart={handleRestart}
      />
      <WinOverlay
        show={state.won}
        stars={stars}
        moves={state.moves}
        optimal={state.optimal}
        lastScore={state.lastScore}
        totalScore={state.score}
        onNext={nextLevel}
      />
      <Confetti active={state.won} />
    </main>
  );
}
