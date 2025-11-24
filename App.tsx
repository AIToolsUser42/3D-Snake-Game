
import React, { useState } from 'react';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { useGameLogic } from './hooks/useGameLogic';

function App() {
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [gameSpeed, setGameSpeed] = useState(1);

  const { initGame, handleRelativeInput, handleAbsoluteInput, triggerGameOver, autoPlay, setAutoPlay, ...gameState } = useGameLogic(gameSpeed);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none touch-none">
      <GameScene 
          gameState={gameState} 
          onAbsoluteInput={handleAbsoluteInput} 
          rotationSpeed={rotationSpeed}
      />
      <UI 
          gameState={gameState} 
          onStart={initGame} 
          onRelativeInput={handleRelativeInput}
          rotationSpeed={rotationSpeed}
          setRotationSpeed={setRotationSpeed}
          gameSpeed={gameSpeed}
          setGameSpeed={setGameSpeed}
          autoPlay={autoPlay}
          setAutoPlay={setAutoPlay}
          triggerGameOver={triggerGameOver}
      />
    </div>
  );
}

export default App;
