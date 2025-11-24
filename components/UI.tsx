
import React, { useEffect } from 'react';
import { GameStateData } from '../types';
import { RotateCcw, Trophy, Play, ArrowBigLeft, ArrowBigRight, Crown, Gauge, Zap, Timer, Power, Bot } from 'lucide-react';
import { audio } from '../utils/audio';

interface UIProps {
  gameState: GameStateData;
  onStart: () => void;
  onRelativeInput: (action: 'LEFT' | 'RIGHT') => void;
  rotationSpeed: number;
  setRotationSpeed: (speed: number) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
  triggerGameOver: () => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const UI: React.FC<UIProps> = ({ 
    gameState, 
    onStart, 
    onRelativeInput, 
    rotationSpeed, 
    setRotationSpeed,
    gameSpeed,
    setGameSpeed,
    autoPlay,
    setAutoPlay,
    triggerGameOver
}) => {

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       if (e.ctrlKey || e.altKey || e.metaKey) return;

       const withSound = (fn: () => void) => {
          audio.playClick();
          fn();
       };

       switch(e.code) {
           case 'Backquote': withSound(() => setAutoPlay(!autoPlay)); break;
           case 'Digit1': withSound(() => setGameSpeed(0)); break;
           case 'Digit2': withSound(() => setGameSpeed(0.5)); break;
           case 'Digit3': withSound(() => setGameSpeed(1)); break;
           case 'Digit4': withSound(() => setGameSpeed(2)); break;
           case 'Digit5': withSound(() => setGameSpeed(3)); break;
           case 'Digit6': withSound(() => setGameSpeed(5)); break;
           case 'Digit7': withSound(() => setRotationSpeed(0)); break;
           case 'Digit8': withSound(() => setRotationSpeed(0.5)); break;
           case 'Digit9': withSound(() => setRotationSpeed(1)); break;
           case 'Digit0': withSound(() => setRotationSpeed(2)); break;
           case 'Minus': withSound(() => setRotationSpeed(3)); break; 
           case 'Equal': withSound(() => setRotationSpeed(5)); break; 
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setGameSpeed, setRotationSpeed, autoPlay, setAutoPlay]);

  const handleSpeedClick = (setter: (v: number) => void, val: number) => {
      audio.playClick();
      setter(val);
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10 font-rajdhani">
      
      {/* --- Top Bar: HUD Header --- */}
      <div className="flex justify-between items-start w-full">
        {/* Logo Area */}
        <div className="flex flex-col">
            <h1 className="text-5xl font-bold tracking-tighter drop-shadow-md text-white">
                CUBIC <span className="text-cyan-400">SNAKE</span>
            </h1>
        </div>
        
        {/* Stats Panel */}
        <div className="flex gap-4">
           {/* Timer Module */}
           <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl px-4 py-2 flex flex-col items-center min-w-[100px] shadow-lg">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Timer size={10} className="text-cyan-400" /> Time
                </div>
                <div className="text-3xl font-mono font-bold text-white leading-none tracking-widest drop-shadow-md">
                    {formatTime(gameState.elapsedTime)}
                </div>
           </div>

           {/* Score Module */}
           <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-2 px-5 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col items-end min-w-[120px]">
               <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  Score
               </div>
               <div className="text-5xl font-mono font-bold text-white leading-none tracking-tight">{gameState.score}</div>
               <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 font-mono">
                   <Trophy size={10} className="text-yellow-500" /> High: {gameState.highScore}
               </div>
           </div>
        </div>
      </div>


      {/* --- Center Screen: Modals --- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        
        {gameState.status === 'START' && (
          <div className="bg-slate-950/90 backdrop-blur-xl p-10 rounded-3xl border border-slate-700 shadow-2xl text-center max-w-md animate-in fade-in zoom-in duration-300 pointer-events-auto">
             <h2 className="text-4xl font-bold text-white mb-4">Cubic Snake 3D</h2>
             <p className="text-slate-300 mb-8 font-medium text-lg leading-relaxed">
               Use <b>WASD</b> or <b>Arrow Keys</b> to move.<br/>
               Drag the background to rotate the view.
             </p>
             <button 
                onClick={onStart}
                className="w-full py-4 bg-white hover:bg-cyan-50 text-slate-950 font-bold text-xl rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3"
             >
               <Play size={24} fill="currentColor" /> Start Game
             </button>
          </div>
        )}

        {gameState.status === 'GAME_OVER' && (
          <div className="bg-slate-950/90 backdrop-blur-xl p-10 rounded-3xl border border-red-900/50 shadow-2xl text-center max-w-md animate-in fade-in zoom-in duration-300 pointer-events-auto">
             <div className="text-red-500 font-bold text-5xl mb-2">Game Over</div>
             <div className="text-slate-400 mb-6">Better luck next time!</div>
             
             <div className="text-6xl font-mono font-bold text-white mb-8 tracking-tighter drop-shadow-lg">{gameState.score}</div>
             
             <button 
                onClick={onStart}
                className="w-full py-4 bg-white hover:bg-slate-200 text-slate-900 font-bold text-xl rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg"
             >
               <RotateCcw size={24} />
               Try Again
             </button>
          </div>
        )}

        {gameState.status === 'GAME_WON' && (
          <div className="bg-white/95 backdrop-blur-xl p-10 rounded-3xl border border-yellow-400 shadow-2xl text-center max-w-md animate-in fade-in zoom-in duration-300 pointer-events-auto">
             <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Crown size={48} className="text-white drop-shadow-md" />
             </div>
             <h2 className="text-4xl font-bold text-slate-900 mb-2">You Won!</h2>
             <p className="text-slate-600 mb-6 font-medium">Amazing job!</p>
             <div className="text-6xl font-mono font-bold text-slate-900 mb-8">{gameState.score}</div>
             <button 
                onClick={onStart}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xl rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl"
             >
               <Play size={24} fill="currentColor" />
               Play Again
             </button>
          </div>
        )}
      </div>


      {/* --- Bottom: Command Deck --- */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 pointer-events-none flex flex-col items-center gap-4">
        
        {/* Mobile Touch Controls */}
        <div className="flex justify-between w-full pointer-events-auto md:hidden px-4 opacity-60 hover:opacity-100 transition-opacity">
            <button 
            className="w-20 h-20 bg-slate-800/50 backdrop-blur rounded-full flex items-center justify-center border border-white/10 active:bg-white/10 active:scale-95 transition-all"
            onPointerDown={(e) => { e.preventDefault(); onRelativeInput('LEFT'); }}
            >
            <ArrowBigLeft size={36} className="text-white drop-shadow-md" />
            </button>
            
            <button 
            className="w-20 h-20 bg-slate-800/50 backdrop-blur rounded-full flex items-center justify-center border border-white/10 active:bg-white/10 active:scale-95 transition-all"
            onPointerDown={(e) => { e.preventDefault(); onRelativeInput('RIGHT'); }}
            >
            <ArrowBigRight size={36} className="text-white drop-shadow-md" />
            </button>
        </div>

        {/* The Main Control Dock */}
        <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-2 px-6 shadow-2xl flex items-center gap-6 transform transition-all hover:border-slate-700">
            
            {/* Auto Play Module */}
            <div className="flex flex-col items-center gap-1">
                 <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Bot size={10} /> Auto Play
                </span>
                <button
                    onClick={() => { audio.playClick(); setAutoPlay(!autoPlay); }}
                    className={`h-8 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 min-w-[70px] ${
                        autoPlay 
                            ? 'bg-purple-500 text-white shadow-lg' 
                            : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 border border-slate-800'
                    }`}
                >
                    {autoPlay ? 'ON' : 'OFF'}
                </button>
            </div>

            <div className="w-px h-10 bg-slate-800 hidden md:block"></div>

            {/* Snake Speed Module */}
            <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Zap size={10} /> Snake Speed
                </span>
                <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                    {[0, 0.5, 1, 2, 3, 5].map((speed) => (
                        <button
                            key={`gs-${speed}`}
                            onClick={() => handleSpeedClick(setGameSpeed, speed)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center ${
                                gameSpeed === speed 
                                    ? 'bg-emerald-500 text-white shadow-lg' 
                                    : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            {speed === 0 ? '||' : speed + 'x'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-px h-10 bg-slate-800 hidden md:block"></div>

            {/* Rotation Speed Module */}
            <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Gauge size={10} /> Rotation Speed
                </span>
                <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                    {[0, 0.5, 1, 2, 3, 5].map((speed) => (
                        <button
                            key={`rs-${speed}`}
                            onClick={() => handleSpeedClick(setRotationSpeed, speed)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center ${
                                rotationSpeed === speed 
                                    ? 'bg-cyan-500 text-white shadow-lg' 
                                    : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            {speed === 0 ? '||' : speed + 'x'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-px h-10 bg-slate-800 hidden md:block"></div>

            {/* Emergency Stop / End Game */}
            {gameState.status === 'PLAYING' && (
                <button 
                  onClick={triggerGameOver}
                  className="group relative w-12 h-12 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-lg"
                  title="End Game"
                >
                  <Power size={20} className="group-hover:scale-110 transition-transform" />
                </button>
            )}
            {gameState.status !== 'PLAYING' && (
                <div className="w-12 h-12 flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 text-slate-700">
                     <Power size={20} />
                </div>
            )}
        </div>
      </div>
      
    </div>
  );
};
