import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Terminal, Skull, Lock, Zap } from 'lucide-react';
import GlitchText from './GlitchText';

// --- TYPES & CONSTANTS ---
type GameState = 'BOOT' | 'LEVEL_INTRO' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';
type LevelType = 'CORRIDOR' | 'TERMINAL' | 'MIRROR';

const LEVELS: { type: LevelType; title: string; instruction: string; duration: number }[] = [
  { type: 'CORRIDOR', title: 'TEST_01: TRANSPORT', instruction: 'Выживите 15 секунд. ОНО движется, когда глаза закрыты.', duration: 15 },
  { type: 'TERMINAL', title: 'TEST_02: DECRYPTION', instruction: 'Удерживайте [ENTER] для взлома. Моргание сбрасывает прогресс.', duration: 100 }, // Duration here acts as target progress
  { type: 'MIRROR', title: 'TEST_03: ASSIMILATION', instruction: 'Не моргайте, когда отражение смотрит на вас.', duration: 20 }
];

const DemoSection: React.FC = () => {
  // SYSTEM STATE
  const [gameState, setGameState] = useState<GameState>('BOOT');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  
  // PLAYER STATE
  const [dryness, setDryness] = useState(0);
  const [eyesClosed, setEyesClosed] = useState(false);
  
  // LEVEL SPECIFIC STATE
  const [timer, setTimer] = useState(0); // Used for survival time or progress
  const [monsterPos, setMonsterPos] = useState(0); // 0 to 100
  const [entityState, setEntityState] = useState<'IDLE' | 'WATCHING' | 'AGGRESSIVE'>('IDLE'); // For Mirror
  const [terminalLog, setTerminalLog] = useState<string[]>([]);

  // REFS
  const intervalRef = useRef<number | null>(null);
  const bootTimerRef = useRef<number | null>(null);

  const currentLevel = LEVELS[currentLevelIdx];

  // --- CONTROLS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (gameState === 'PLAYING') setEyesClosed(true);
      }
      if (e.code === 'Enter') {
        if (gameState === 'BOOT') startGameSequence();
        if (gameState === 'GAMEOVER' || gameState === 'VICTORY') resetGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setEyesClosed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // --- GAME LOOP ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    intervalRef.current = window.setInterval(() => {
      // 1. MECHANIC: DRYNESS
      if (eyesClosed) {
        setDryness(prev => Math.max(0, prev - 3)); // Heal fast
      } else {
        // Dryness increases faster in later levels
        const rate = currentLevelIdx === 1 ? 0.9 : 0.6; 
        setDryness(prev => {
          if (prev >= 100) {
            triggerGameOver("ГЛАЗА ВЫСОХЛИ. КОНТАКТ ПОТЕРЯН.");
            return 100;
          }
          return prev + rate;
        });
      }

      // 2. LEVEL LOGIC
      switch (currentLevel.type) {
        case 'CORRIDOR':
          handleCorridorLogic();
          break;
        case 'TERMINAL':
          handleTerminalLogic();
          break;
        case 'MIRROR':
          handleMirrorLogic();
          break;
      }

    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameState, eyesClosed, currentLevelIdx, timer, monsterPos, entityState]);

  // --- LOGIC HANDLERS ---

  const handleCorridorLogic = () => {
    // Goal: Survive duration
    setTimer(t => t + 0.05);
    
    // Monster moves ONLY when eyes closed
    if (eyesClosed) {
      setMonsterPos(prev => prev + 2.5); // Fast approach
    } else {
      // Monster creeps very slowly even when open in hard mode, or stays still
      if (Math.random() > 0.95) setMonsterPos(prev => prev + 0.2);
    }

    if (monsterPos >= 100) {
      triggerGameOver("ОНО КОСНУЛОСЬ ТЕБЯ.");
    }

    if (timer >= LEVELS[currentLevelIdx].duration) {
      advanceLevel();
    }
  };

  const handleTerminalLogic = () => {
    // Goal: Fill timer (progress) to 100 by holding ENTER (simulated by eyes OPEN and stable)
    // Actually, let's make it automatic progress while eyes are OPEN, but blinking penalties
    
    if (eyesClosed) {
      // Blinking causes data loss
      setTimer(t => Math.max(0, t - 2)); 
    } else {
      setTimer(t => t + 0.3); // Slow upload
    }

    if (timer >= 100) {
      advanceLevel();
    }
  };

  const handleMirrorLogic = () => {
    // Goal: Survive duration. 
    // Mechanic: Entity watches randomly. If watching AND eyes open -> sanity/health damage (dryness spikes) or death.
    // Actually: If watching AND eyes open -> You die. You must close eyes to hide.
    // BUT: You need to manage dryness.
    
    setTimer(t => t + 0.05);

    // Random AI State Change
    if (Math.random() > 0.97) {
      const states: ('IDLE' | 'WATCHING')[] = ['IDLE', 'WATCHING'];
      setEntityState(states[Math.floor(Math.random() * states.length)]);
    }

    if (entityState === 'WATCHING') {
       if (!eyesClosed) {
          // You are being seen.
          setMonsterPos(p => p + 5); // Danger meter
       } else {
          setMonsterPos(p => Math.max(0, p - 2)); // Safe
       }
    } else {
      // Safe to blink
      setMonsterPos(p => Math.max(0, p - 0.5));
    }

    if (monsterPos >= 100) {
      triggerGameOver("ОТРАЖЕНИЕ ЗАХВАТИЛО ВАШЕ ТЕЛО.");
    }

    if (timer >= LEVELS[currentLevelIdx].duration) {
      advanceLevel();
    }
  };

  // --- HELPERS ---

  const startGameSequence = () => {
    setGameState('LEVEL_INTRO');
    setTimeout(() => setGameState('PLAYING'), 3000);
  };

  const advanceLevel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    if (currentLevelIdx + 1 >= LEVELS.length) {
      setGameState('VICTORY');
    } else {
      setGameState('LEVEL_INTRO');
      setCurrentLevelIdx(prev => prev + 1);
      // Reset Level State
      setTimer(0);
      setMonsterPos(0);
      setDryness(0);
      setEyesClosed(false);
      setEntityState('IDLE');
      
      setTimeout(() => setGameState('PLAYING'), 4000);
    }
  };

  const triggerGameOver = (reason: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setGameState('GAMEOVER');
    setTerminalLog(prev => [...prev, reason]);
  };

  const resetGame = () => {
    setGameState('BOOT');
    setCurrentLevelIdx(0);
    setTimer(0);
    setMonsterPos(0);
    setDryness(0);
  };

  // --- RENDERERS ---

  const renderBoot = () => (
    <div className="h-[500px] w-full bg-black flex flex-col items-center justify-center p-8 text-center font-mono">
      <div className="text-red-600 text-6xl mb-4 animate-pulse"><Skull size={64} /></div>
      <h1 className="text-4xl font-bold text-white mb-2 tracking-widest">MNEMOSYNE_TRIAL.EXE</h1>
      <p className="text-gray-500 mb-8">v.0.9.4 // UNSTABLE BUILD</p>
      
      <div className="border border-gray-800 p-4 max-w-md bg-gray-900/50 mb-8 text-left text-sm text-gray-400">
        <p>> INITIALIZING OCULAR INTERFACE...</p>
        <p>> WARNING: BIO-FEEDBACK REQUIRED.</p>
        <p>> PRESS [SPACE] TO BLINK.</p>
        <p>> DO NOT LET EYES DRY OUT.</p>
        <p className="mt-4 text-white animate-pulse">> PRESS [ENTER] TO START SESSION</p>
      </div>
    </div>
  );

  const renderLevelIntro = () => (
    <div className="h-[500px] w-full bg-black flex flex-col items-center justify-center text-center z-50">
      <h2 className="text-6xl font-black text-white mb-4 tracking-tighter uppercase glitch-anim">
        {LEVELS[currentLevelIdx].title}
      </h2>
      <p className="text-red-500 font-mono text-xl max-w-xl border-t border-b border-red-900 py-4">
        {LEVELS[currentLevelIdx].instruction}
      </p>
      <p className="mt-8 text-gray-600 text-sm animate-pulse">LOADING ASSETS...</p>
    </div>
  );

  const renderHUD = () => (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent z-50 flex items-end justify-between">
      <div className="w-1/3">
         <div className="flex justify-between text-xs font-mono mb-1">
            <span className={dryness > 80 ? 'text-red-500 animate-pulse' : 'text-cyan-500'}>MOISTURE</span>
            <span className="text-white">{Math.max(0, 100 - dryness).toFixed(0)}%</span>
         </div>
         <div className="h-2 bg-gray-800 border border-gray-700 w-full overflow-hidden">
             <div 
                 className={`h-full transition-all duration-200 ${dryness > 80 ? 'bg-red-600' : 'bg-cyan-500'}`} 
                 style={{ width: `${Math.max(0, 100 - dryness)}%` }}
             ></div>
         </div>
      </div>
      
      <div className="text-center pb-2">
         {currentLevel.type === 'MIRROR' && entityState === 'WATCHING' && (
             <span className="text-red-600 font-black bg-black px-2 animate-pulse">ОНО СМОТРИТ</span>
         )}
         {eyesClosed && <span className="text-gray-500 text-sm font-mono">...глаза закрыты...</span>}
      </div>

      <div className="text-right opacity-50">
         {eyesClosed ? <EyeOff className="w-8 h-8 text-gray-600" /> : <Eye className="w-8 h-8 text-cyan-400" />}
      </div>
    </div>
  );

  // LEVEL 1: HALLWAY
  const renderCorridor = () => (
    <div className="absolute inset-0 bg-gray-950 overflow-hidden perspective-1000">
        {/* Hallway Geometry */}
        <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-black to-gray-900"></div>
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black to-gray-900">
             <div className="w-full h-full opacity-10" style={{ backgroundImage: 'linear-gradient(0deg, transparent 95%, #fff 100%)', backgroundSize: '100% 40px', transform: 'perspective(500px) rotateX(60deg) scale(2)' }}></div>
        </div>
        
        {/* Monster */}
        <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-linear"
            style={{
                width: `${10 + monsterPos * 3}px`,
                height: `${20 + monsterPos * 6}px`,
                backgroundColor: 'black',
                filter: `blur(${Math.max(2, 20 - monsterPos * 0.2)}px)`,
                opacity: monsterPos * 0.01 + 0.1
            }}
        >
             {/* Glowing Eyes if close */}
             {monsterPos > 60 && (
                 <div className="w-full flex justify-center gap-2 mt-4">
                     <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                     <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-75"></div>
                 </div>
             )}
        </div>

        {/* Text cues */}
        <div className="absolute top-10 left-10 font-mono text-xs text-green-900">SECTOR_14 // TRANSPORT</div>
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 font-mono text-red-500/50 text-sm animate-pulse">
            {monsterPos > 80 ? "DON'T BREATHE" : monsterPos > 50 ? "IT'S COMING" : ""}
        </div>
    </div>
  );

  // LEVEL 2: TERMINAL
  const renderTerminal = () => (
    <div className="absolute inset-0 bg-black font-mono p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl border border-green-900 bg-green-900/5 p-8 rounded relative overflow-hidden">
             {/* Scanline */}
             <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
             
             <div className="flex justify-between items-center mb-8 border-b border-green-900/30 pb-2">
                 <h3 className="text-green-500 flex items-center gap-2"><Terminal size={18} /> ROOT_ACCESS</h3>
                 <span className="text-green-800 text-xs">Unstable Connection</span>
             </div>

             <div className="space-y-2 mb-8 h-32 overflow-hidden">
                 <p className="text-green-700 text-sm">> Initiating decryption protocol...</p>
                 <p className="text-green-700 text-sm">> Bypass firewall: SUCCESS</p>
                 <p className="text-green-700 text-sm">> Extracting mnemosyne_core.dump...</p>
                 <p className="text-green-400 text-sm animate-pulse">{eyesClosed ? ">> ERROR: VISUAL FEED LOST. UPLOAD PAUSED." : ">> UPLOADING..."}</p>
             </div>

             {/* Progress Bar */}
             <div className="w-full h-8 bg-black border border-green-800 relative">
                 <div 
                    className="h-full bg-green-600 transition-all duration-100"
                    style={{ width: `${timer}%` }} 
                 ></div>
                 <div className="absolute inset-0 flex items-center justify-center text-xs text-green-100 mix-blend-difference">
                     {timer.toFixed(1)}% COMPLETE
                 </div>
             </div>
             
             {eyesClosed && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                     <p className="text-red-500 font-bold glitch-anim">SIGNAL LOST</p>
                 </div>
             )}
        </div>
    </div>
  );

  // LEVEL 3: MIRROR
  const renderMirror = () => (
    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center overflow-hidden">
        {/* Mirror Frame */}
        <div className="relative w-80 h-96 border-[16px] border-gray-800 bg-black shadow-2xl rounded-t-full overflow-hidden">
            {/* Reflection (The Entity) */}
            <div className={`absolute inset-0 transition-all duration-500 ${entityState === 'WATCHING' ? 'scale-110 bg-red-900/10' : 'scale-100'}`}>
                {/* Silhouette */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-64 bg-gray-950 rounded-t-3xl blur-sm"></div>
                
                {/* Face Features */}
                <div className={`absolute top-20 left-1/2 -translate-x-1/2 w-32 h-40 transition-opacity duration-300 ${entityState === 'WATCHING' ? 'opacity-100' : 'opacity-20'}`}>
                    {/* Eyes */}
                    <div className="flex justify-between px-4 mt-12">
                         <div className="w-6 h-4 bg-white rounded-[100%]">
                             <div className="w-2 h-2 bg-black rounded-full ml-2 mt-1"></div>
                         </div>
                         <div className="w-6 h-4 bg-white rounded-[100%]">
                             <div className="w-2 h-2 bg-black rounded-full ml-2 mt-1"></div>
                         </div>
                    </div>
                    {/* Smile */}
                    <div className="w-16 h-8 border-b-4 border-red-900 rounded-[100%] mx-auto mt-8 opacity-50"></div>
                </div>
            </div>

            {/* Cracks */}
            {monsterPos > 50 && (
                <div className="absolute inset-0 opacity-50 pointer-events-none">
                     <svg className="w-full h-full stroke-white fill-none" strokeWidth="1">
                         <path d="M40 40 L100 100 M 200 50 L 150 150" />
                     </svg>
                </div>
            )}
        </div>

        {/* Warning Indicator */}
        {entityState === 'WATCHING' && (
             <div className="absolute top-10 text-red-500 font-bold tracking-[1em] animate-pulse">DON'T LOOK</div>
        )}
        
        {/* Progress Timer (Hidden/Subtle) */}
        <div className="absolute bottom-0 h-1 bg-red-900 left-0 transition-all duration-1000" style={{ width: `${(timer / LEVELS[2].duration) * 100}%`}}></div>
    </div>
  );

  const renderVictory = () => (
    <div className="h-[500px] w-full bg-white flex flex-col items-center justify-center text-black p-8 text-center">
        <h1 className="text-6xl font-black mb-4">SUBJECT RELEASED</h1>
        <p className="font-serif italic text-lg mb-8 max-w-md">
           "Память была успешно перезаписана. Вы можете проснуться."
        </p>
        <div className="text-xs font-mono text-gray-400 mt-12">
            MNEMOSYNE CORP // CASE CLOSED
        </div>
        <button 
           onClick={resetGame}
           className="mt-8 px-6 py-2 border border-black hover:bg-black hover:text-white transition-colors"
        >
            RESTART SIMULATION
        </button>
    </div>
  );

  const renderGameOver = () => (
    <div className="h-[500px] w-full bg-black flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/Noise_tv.png')] opacity-10 animate-pulse"></div>
        <h1 className="text-red-600 text-6xl font-black mb-4 z-10 glitch-anim">FATAL ERROR</h1>
        <div className="text-red-400 font-mono mb-8 z-10 space-y-2">
            {terminalLog.map((log, i) => (
                <p key={i}>{log}</p>
            ))}
        </div>
        <button 
           onClick={resetGame}
           className="z-10 px-8 py-3 bg-red-900 text-white font-mono hover:bg-red-800"
        >
            TRY AGAIN
        </button>
    </div>
  );

  // --- MAIN RENDER ---
  return (
    <div className="w-full bg-black border border-gray-800 relative overflow-hidden select-none cursor-none shadow-2xl">
      {gameState === 'BOOT' && renderBoot()}
      {gameState === 'LEVEL_INTRO' && renderLevelIntro()}
      {gameState === 'PLAYING' && (
         <>
            {currentLevel.type === 'CORRIDOR' && renderCorridor()}
            {currentLevel.type === 'TERMINAL' && renderTerminal()}
            {currentLevel.type === 'MIRROR' && renderMirror()}
            {renderHUD()}
            
            {/* Eyes Closed Blackout Overlay (Global) */}
            {eyesClosed && (
                <div className="absolute inset-0 bg-black z-40 flex items-center justify-center">
                    <p className="text-gray-900 font-mono text-xs animate-pulse">...moisturizing...</p>
                </div>
            )}
         </>
      )}
      {gameState === 'VICTORY' && renderVictory()}
      {gameState === 'GAMEOVER' && renderGameOver()}
      
      {/* Global Grain */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-white mix-blend-overlay animate-[flicker_0.2s_infinite]"></div>
    </div>
  );
};

export default DemoSection;