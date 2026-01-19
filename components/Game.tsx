import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Terminal, Skull, AlertTriangle, Disc } from 'lucide-react';
import GlitchText from './GlitchText';

// --- TYPES & CONSTANTS ---
type GameState = 'BOOT' | 'LEVEL_INTRO' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';
type LevelType = 'CORRIDOR' | 'TERMINAL' | 'MIRROR' | 'BASEMENT';

const LEVELS: { type: LevelType; title: string; instruction: string; duration: number }[] = [
  { type: 'CORRIDOR', title: 'SEQUENCE_01: APPROACH', instruction: 'Выживите. ОНО движется, пока вы не смотрите.', duration: 20 },
  { type: 'TERMINAL', title: 'SEQUENCE_02: UPLOAD', instruction: 'Удерживайте взгляд открытым для загрузки.', duration: 100 },
  { type: 'MIRROR', title: 'SEQUENCE_03: REFLECTION', instruction: 'Если Отражение смотрит — закройте глаза [ПРОБЕЛ].', duration: 25 },
  { type: 'BASEMENT', title: 'SEQUENCE_04: THE VOID', instruction: 'ОНО видит вас, когда вы видите его. Откройте глаза, чтобы найти выход.', duration: 100 } 
];

const SCREAMER_IMAGES = [
  "https://picsum.photos/seed/ghost1/800/600?grayscale&blur=1",
  "https://picsum.photos/seed/death/800/600?grayscale&contrast=2",
  "https://picsum.photos/seed/skull/800/600?grayscale&invert=1"
];

// Specific images for the rare flash event (unsettling faces)
const FLASH_IMAGES = [
    "https://picsum.photos/seed/face1/800/800?grayscale&contrast=2",
    "https://picsum.photos/seed/face2/800/800?grayscale&invert=1",
    "https://picsum.photos/seed/scream/800/800?grayscale&blur=2"
];

// --- AUDIO ENGINE ---
// Procedural audio generation to avoid external assets and allow dynamic manipulation
class HorrorAudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  
  // Nodes references
  droneOsc: OscillatorNode | null = null;
  droneGain: GainNode | null = null;
  monsterOsc: OscillatorNode | null = null;
  monsterGain: GainNode | null = null;
  staticNode: AudioBufferSourceNode | null = null;
  staticGain: GainNode | null = null;

  constructor() {
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.8;
    } catch (e) {
      console.error("Web Audio API not supported");
    }
  }

  async init() {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
    this.startDrone();
  }

  // Deep low frequency background noise (The Dread)
  startDrone() {
    if (!this.ctx || !this.masterGain) return;
    this.stopDrone();

    this.droneOsc = this.ctx.createOscillator();
    this.droneGain = this.ctx.createGain();
    
    // Brown noise simulation using low freq AM synthesis
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.value = 50; // Low hum
    
    // Lowpass filter to make it muffled
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;

    this.droneOsc.connect(filter);
    filter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    
    this.droneGain.gain.value = 0.3;
    this.droneOsc.start();

    // Secondary LFO for unease
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.1; // Very slow cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(this.droneOsc.frequency);
    lfo.start();
  }

  stopDrone() {
    if (this.droneOsc) {
        try { this.droneOsc.stop(); } catch(e){}
        this.droneOsc.disconnect();
    }
  }

  // Dynamic sound based on monster distance
  updateProximity(levelType: LevelType, intensity: number) { // intensity 0 to 100
    if (!this.ctx || !this.masterGain) return;
    
    // Initialize monster channel if needed
    if (!this.monsterOsc) {
        this.monsterOsc = this.ctx.createOscillator();
        this.monsterGain = this.ctx.createGain();
        this.monsterOsc.connect(this.monsterGain);
        this.monsterGain.connect(this.masterGain);
        this.monsterOsc.start();
        this.monsterGain.gain.value = 0;
    }

    const normIntensity = intensity / 100;

    if (levelType === 'CORRIDOR') {
        // Shepard Tone / Rising pitch effect
        this.monsterOsc.type = 'sawtooth';
        this.monsterOsc.frequency.setTargetAtTime(50 + (normIntensity * 200), this.ctx.currentTime, 0.1);
        this.monsterGain.gain.setTargetAtTime(normIntensity * 0.4, this.ctx.currentTime, 0.1);
    } 
    else if (levelType === 'TERMINAL') {
        // High pitched digital whine
        this.monsterOsc.type = 'square';
        this.monsterOsc.frequency.setTargetAtTime(10000 - (normIntensity * 5000), this.ctx.currentTime, 0.1);
        this.monsterGain.gain.setTargetAtTime(normIntensity * 0.1, this.ctx.currentTime, 0.1);
    }
    else if (levelType === 'MIRROR') {
        // Dissonant tritone
        this.monsterOsc.type = 'sine';
        // Wobble
        this.monsterOsc.frequency.setValueAtTime(440 + Math.random() * 50, this.ctx.currentTime);
        this.monsterGain.gain.setTargetAtTime(normIntensity * 0.5, this.ctx.currentTime, 0.1);
    }
    else if (levelType === 'BASEMENT') {
        // Deep rumble that gets higher pitched and chaotic
        this.monsterOsc.type = 'sawtooth';
        this.monsterOsc.frequency.setTargetAtTime(20 + (normIntensity * 100), this.ctx.currentTime, 0.1);
        // Add jitter
        if (Math.random() > 0.8) {
             this.monsterOsc.frequency.setValueAtTime(20 + (normIntensity * 100) + Math.random() * 50, this.ctx.currentTime);
        }
        this.monsterGain.gain.setTargetAtTime(normIntensity * 0.6, this.ctx.currentTime, 0.1);
    }
  }

  // Sudden loud burst (Level Death)
  triggerScreamer() {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + 0.1); // Zip up
    
    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // --- NEW: Short, sharp subliminal burst (The Glitch) ---
  triggerSubliminalBurst() {
      if (!this.ctx || !this.masterGain) return;
      
      const now = this.ctx.currentTime;
      
      // 1. High frequency screech (Digital Glitch)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(2000, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1); // Rapid drop
      
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now);
      osc.stop(now + 0.1);

      // 2. White noise burst (Static)
      const bufferSize = this.ctx.sampleRate * 0.1; // 0.1 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.value = 0.5;
      
      noise.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);
  }

  // Heartbeat sound
  triggerHeartbeat(fast: boolean) {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(60, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playClick() {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
  }

  stopAll() {
      if (this.ctx) this.ctx.suspend();
  }
}

// --- MAIN COMPONENT ---

const Game: React.FC = () => {
  // SYSTEM STATE
  const [gameState, setGameState] = useState<GameState>('BOOT');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  
  // PLAYER STATE
  const [dryness, setDryness] = useState(0);
  const [eyesClosed, setEyesClosed] = useState(false);
  
  // LEVEL SPECIFIC STATE
  const [timer, setTimer] = useState(0); 
  const [monsterPos, setMonsterPos] = useState(0);
  const [entityState, setEntityState] = useState<'IDLE' | 'WATCHING'>('IDLE');
  const [terminalLog, setTerminalLog] = useState<string[]>([]);
  
  // HORROR ENGINE STATE
  const [phantomActive, setPhantomActive] = useState(false);
  const [phantomImg, setPhantomImg] = useState('');
  const [shakeIntensity, setShakeIntensity] = useState(0);

  // --- NEW: RARE FLASH STATE ---
  const [flashActive, setFlashActive] = useState(false);
  const [flashImage, setFlashImage] = useState('');
  const flashTimerRef = useRef<number | null>(null);

  // AUDIO REF
  const audioRef = useRef<HorrorAudioEngine | null>(null);
  const heartbeatRef = useRef<number | null>(null);

  // REFS
  const intervalRef = useRef<number | null>(null);
  const phantomTimerRef = useRef<number | null>(null);

  const currentLevel = LEVELS[currentLevelIdx];

  // Initialize Audio Logic
  useEffect(() => {
    audioRef.current = new HorrorAudioEngine();
    return () => audioRef.current?.stopAll();
  }, []);

  // Heartbeat Logic
  useEffect(() => {
    if (gameState !== 'PLAYING') {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        return;
    }

    const bpm = 60 + (monsterPos) + (dryness / 2); // Heart rate increases with danger
    const interval = 60000 / bpm;

    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = window.setInterval(() => {
        audioRef.current?.triggerHeartbeat(bpm > 120);
    }, interval);

    return () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [gameState, monsterPos, dryness]);

  // Audio Proximity Update Loop
  useEffect(() => {
      if (gameState === 'PLAYING') {
          // Update drone and monster sounds every frame essentially
          const audioInterval = setInterval(() => {
             audioRef.current?.updateProximity(currentLevel.type, monsterPos);
          }, 100);
          return () => clearInterval(audioInterval);
      }
  }, [gameState, currentLevel.type, monsterPos]);


  // --- CONTROLS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (gameState === 'PLAYING') setEyesClosed(true);
      }
      if (e.code === 'Enter') {
        if (gameState === 'BOOT') {
            audioRef.current?.init(); // Start audio context on user interaction
            audioRef.current?.playClick();
            startGameSequence();
        }
        if (gameState === 'GAMEOVER' || gameState === 'VICTORY') {
            audioRef.current?.playClick();
            resetGame();
        }
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

  // --- PHANTOM SYSTEM (RANDOM LEVEL THREATS) ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const schedulePhantom = () => {
        const riskFactor = (dryness / 100) + (currentLevelIdx * 0.2); 
        const delay = Math.random() * (15000 - (riskFactor * 8000)) + 3000;
        
        phantomTimerRef.current = window.setTimeout(() => {
            if (Math.random() < 0.4 + (riskFactor * 0.3)) {
                triggerPhantom();
            }
            schedulePhantom();
        }, delay);
    };

    schedulePhantom();

    return () => {
        if (phantomTimerRef.current) clearTimeout(phantomTimerRef.current);
    };
  }, [gameState, dryness, currentLevelIdx]);

  const triggerPhantom = () => {
      setPhantomImg(SCREAMER_IMAGES[Math.floor(Math.random() * SCREAMER_IMAGES.length)]);
      setPhantomActive(true);
      setShakeIntensity(20);
      
      // AUDIO TRIGGER (Standard Screamer)
      audioRef.current?.triggerScreamer();

      setTimeout(() => setShakeIntensity(0), 300);
      setTimeout(() => setPhantomActive(false), 150 + Math.random() * 100);
  };

  // --- RARE FLASH EVENT SYSTEM (THE GLITCH) ---
  useEffect(() => {
      if (gameState !== 'PLAYING') return;

      const loop = () => {
          // Occurs rarely (between 10 and 30 seconds check)
          const time = Math.random() * 20000 + 10000; 
          
          flashTimerRef.current = window.setTimeout(() => {
             // 30% chance to happen when timer hits, independent of level progress
             if (Math.random() < 0.3) {
                 triggerFlashScreamer();
             }
             loop();
          }, time);
      };

      loop();

      return () => {
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      }
  }, [gameState]);

  const triggerFlashScreamer = () => {
      // 1. Audio Burst
      audioRef.current?.triggerSubliminalBurst();
      
      // 2. Set Random Image
      setFlashImage(FLASH_IMAGES[Math.floor(Math.random() * FLASH_IMAGES.length)]);
      setFlashActive(true);

      // 3. Very short duration (subliminal)
      setTimeout(() => {
          setFlashActive(false);
      }, 80 + Math.random() * 50); // ~100ms
  };


  // --- GAME LOOP ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    intervalRef.current = window.setInterval(() => {
      // 1. MECHANIC: DRYNESS
      if (eyesClosed) {
        setDryness(prev => Math.max(0, prev - 3.5)); 
      } else {
        const baseRate = 0.4;
        const levelMult = currentLevelIdx * 0.1;
        setDryness(prev => {
          if (prev >= 100) {
            triggerGameOver("ГЛАЗА ВЫСОХЛИ. КОНТАКТ ПОТЕРЯН.");
            return 100;
          }
          return prev + baseRate + levelMult;
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
        case 'BASEMENT':
          handleBasementLogic();
          break;
      }

    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameState, eyesClosed, currentLevelIdx, timer, monsterPos, entityState]);

  // --- LOGIC HANDLERS ---
  const handleCorridorLogic = () => {
    setTimer(t => t + 0.05);
    
    if (eyesClosed) {
      setMonsterPos(prev => prev + 2.0); 
    } else {
      if (Math.random() > 0.95) setMonsterPos(prev => prev + 0.5);
    }

    if (monsterPos >= 100) triggerGameOver("ОНО КОСНУЛОСЬ ТЕБЯ.");
    if (timer >= currentLevel.duration) advanceLevel();
  };

  const handleTerminalLogic = () => {
    if (eyesClosed) {
      setTimer(t => Math.max(0, t - 0.5)); 
    } else {
      setTimer(t => t + 0.4); 
    }

    if (Math.random() > 0.98) {
       setShakeIntensity(5);
       audioRef.current?.triggerScreamer(); // Glitch sound
       setTimeout(() => setShakeIntensity(0), 100);
    }

    if (timer >= 100) advanceLevel();
  };

  const handleMirrorLogic = () => {
    setTimer(t => t + 0.05);

    if (Math.random() > 0.98) {
      setEntityState(prev => prev === 'IDLE' ? 'WATCHING' : 'IDLE');
      if (Math.random() > 0.5) triggerPhantom();
    }

    if (entityState === 'WATCHING') {
       if (!eyesClosed) {
          setMonsterPos(p => p + 4); 
          setShakeIntensity(Math.min(20, monsterPos / 5));
       } else {
          setMonsterPos(p => Math.max(0, p - 1));
          setShakeIntensity(0);
       }
    } else {
      setMonsterPos(p => Math.max(0, p - 0.2));
      setShakeIntensity(0);
    }

    if (monsterPos >= 100) triggerGameOver("ОТРАЖЕНИЕ ЗАМЕНИЛО ВАС.");
    if (timer >= currentLevel.duration) advanceLevel();
  };

  const handleBasementLogic = () => {
      // MECHANIC: "PEEK-A-BOO / THE VOID"
      // Conflict: You MUST open eyes to progress (timer), but monster rushes you when eyes are open.
      // Safety: Eyes Closed makes monster retreat, but no progress.
      
      if (!eyesClosed) {
          // EYES OPEN:
          // 1. Progress increases (Finding the exit)
          setTimer(t => t + 0.2); 
          // 2. Danger increases fast (Monster sees you)
          setMonsterPos(p => p + 1.8);
          // 3. Shake starts when danger is high
          if (monsterPos > 50) setShakeIntensity(monsterPos / 4);
      } else {
          // EYES CLOSED:
          // 1. Safety (Monster retreats slowly)
          setMonsterPos(p => Math.max(0, p - 0.8));
          setShakeIntensity(0);
      }

      if (monsterPos >= 100) triggerGameOver("ОНО ТЕБЯ УВИДЕЛО.");
      if (timer >= 100) advanceLevel(); 
  };

  // --- ACTIONS ---
  const startGameSequence = () => {
    setGameState('LEVEL_INTRO');
    setTimeout(() => setGameState('PLAYING'), 4000);
  };

  const advanceLevel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (currentLevelIdx + 1 >= LEVELS.length) {
      setGameState('VICTORY');
    } else {
      setGameState('LEVEL_INTRO');
      setCurrentLevelIdx(prev => prev + 1);
      setTimer(0);
      setMonsterPos(0);
      setDryness(0);
      setEyesClosed(false);
      setEntityState('IDLE');
      setShakeIntensity(0);
      setTimeout(() => setGameState('PLAYING'), 4000);
    }
  };

  const triggerGameOver = (reason: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    audioRef.current?.triggerScreamer(); // Death sound
    setGameState('GAMEOVER');
    setTerminalLog(prev => [...prev, reason]);
  };

  const resetGame = () => {
    setGameState('BOOT');
    setCurrentLevelIdx(0);
    setTimer(0);
    setMonsterPos(0);
    setDryness(0);
    setTerminalLog([]);
    setShakeIntensity(0);
  };

  // --- RENDERERS ---

  const renderBoot = () => (
    <div className="h-full w-full bg-black flex flex-col items-center justify-center p-8 text-center font-mono relative z-30">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
      <div className="text-red-600 text-9xl mb-8 animate-pulse opacity-80"><Skull size={120} strokeWidth={1} /></div>
      <h1 className="text-6xl md:text-8xl font-black text-white mb-4 tracking-tighter glitch-anim">
        MNEMOSYNE
      </h1>
      <p className="text-red-500 font-mono text-xl tracking-[0.5em] mb-12">PROTOCOL_ERROR</p>
      
      <div className="border-l-2 border-red-900 pl-6 text-left max-w-lg space-y-4 text-gray-400 font-mono text-sm md:text-base bg-black/50 backdrop-blur-md p-6">
        <p className="pt-4 text-red-500 animate-pulse font-bold">>> ПРЕДУПРЕЖДЕНИЕ: СОДЕРЖИТ ЗВУК И СКРИМЕРЫ</p>
        <p className="text-white">ИНСТРУКЦИЯ:</p>
        <p>1. [ПРОБЕЛ] - закрыть глаза / моргнуть.</p>
        <p>2. Не допускайте сухости глаз (шкала внизу).</p>
        <p>3. Слушайте шаги и дыхание.</p>
        <p className="mt-8 text-cyan-400 animate-pulse font-bold">>> НАЖМИТЕ [ENTER] ДЛЯ ЗАПУСКА АУДИО-ЯДРА</p>
      </div>
    </div>
  );

  const renderLevelIntro = () => (
    <div className="h-full w-full bg-black flex flex-col items-center justify-center text-center z-50 relative">
      <div className="absolute inset-0 bg-red-900/5 animate-pulse"></div>
      <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter uppercase glitch-anim scale-110">
        {LEVELS[currentLevelIdx].title}
      </h2>
      <div className="bg-black/80 px-8 py-4 border border-red-900/30">
        <p className="text-red-500 font-mono text-2xl md:text-3xl max-w-4xl">
           <GlitchText text={LEVELS[currentLevelIdx].instruction} intensity={0.2} />
        </p>
      </div>
    </div>
  );

  const renderClosedEyeVisuals = () => (
      <div className="absolute inset-0 bg-black z-[100] flex items-center justify-center overflow-hidden">
          {/* Level Specific Closed Eye Effects */}
          {currentLevel.type === 'CORRIDOR' && (
              <>
                  {/* Swirling Dust */}
                  {[...Array(30)].map((_, i) => (
                       <div
                          key={i}
                          className="absolute bg-gray-500 rounded-full opacity-30 animate-spin"
                          style={{
                              width: Math.random() * 3 + 'px',
                              height: Math.random() * 3 + 'px',
                              top: Math.random() * 100 + '%',
                              left: Math.random() * 100 + '%',
                              animationDuration: Math.random() * 0.5 + 0.2 + 's', // Fast swirl in dark
                              boxShadow: '0 0 10px rgba(255,255,255,0.1)'
                          }}
                       />
                  ))}
              </>
          )}

          {currentLevel.type === 'TERMINAL' && (
              <>
                  {/* Sparks / Retinal Burn */}
                  {[...Array(10)].map((_, i) => (
                      <div
                          key={i}
                          className="absolute bg-green-500 w-1 h-1 rounded-full animate-ping"
                          style={{
                              top: Math.random() * 100 + '%',
                              left: Math.random() * 100 + '%',
                              animationDuration: Math.random() * 0.2 + 0.1 + 's',
                              animationDelay: Math.random() + 's'
                          }}
                      />
                  ))}
                  {/* Digital After-image */}
                  <div className="absolute inset-0 border-4 border-green-900/10 animate-pulse pointer-events-none"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-900/20 text-9xl font-black blur-sm scale-150 animate-pulse">ERROR</div>
              </>
          )}

          {currentLevel.type === 'BASEMENT' && (
             // BASEMENT: Eyes Closed is SAFE. Dark and peaceful (mostly).
             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="text-gray-900 text-[10rem] opacity-5 font-black animate-pulse select-none">SAFE</div>
             </div>
          )}

          {/* Common Text */}
          <div className="text-gray-900 font-mono text-sm animate-pulse tracking-widest relative z-10">
              ...moisturizing...
          </div>
      </div>
  );

  // LEVEL 1: CORRIDOR
  const renderCorridor = () => (
    <div className="absolute inset-0 bg-gray-950 overflow-hidden perspective-2000">
        <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-[#050505] to-[#111]"></div>
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#050505] to-[#1a1a1a]">
             <div className="w-full h-full opacity-10" style={{ backgroundImage: 'linear-gradient(0deg, transparent 95%, #333 100%)', backgroundSize: '100% 100px', transform: 'perspective(1000px) rotateX(60deg) scale(2)' }}></div>
        </div>

        {/* Floating Dust Particles (Open Eye) */}
        {[...Array(15)].map((_, i) => (
             <div
                key={i}
                className="absolute bg-white/10 rounded-full"
                style={{
                    width: Math.random() * 4 + 'px',
                    height: Math.random() * 4 + 'px',
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    animation: `pulse ${Math.random() * 3 + 2}s infinite`,
                    opacity: 0.3
                }}
             />
        ))}
        
        {/* Monster */}
        <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-linear flex items-center justify-center"
            style={{
                width: `${200 + monsterPos * 10}px`,
                height: `${400 + monsterPos * 15}px`,
                opacity: monsterPos * 0.01 + 0.1,
                filter: `blur(${Math.max(0, 10 - monsterPos * 0.15)}px)`,
                transform: `translate(-50%, -50%) scale(${1 + monsterPos * 0.02})`
            }}
        >
             <div className="w-full h-full bg-black rounded-[50%] opacity-90 shadow-[0_0_50px_black]"></div>
             {monsterPos > 50 && (
                 <div className="absolute top-1/4 w-1/2 flex justify-between">
                     <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_20px_white] animate-ping"></div>
                     <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_20px_white] animate-ping delay-150"></div>
                 </div>
             )}
        </div>
        <div className="absolute top-1/4 left-10 font-mono text-xs text-gray-800 rotate-90 origin-left tracking-[2em] opacity-30">CORRIDOR_7</div>
    </div>
  );

  // LEVEL 2: TERMINAL
  const renderTerminal = () => (
    <div className="absolute inset-0 bg-[#0a0a0a] font-mono flex items-center justify-center">
        <div className="w-full max-w-4xl h-[80vh] border-2 border-green-900 bg-black/90 p-12 rounded-lg relative overflow-hidden shadow-[0_0_50px_rgba(20,83,45,0.2)]">
             <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40"></div>
             
             <div className="flex justify-between items-center mb-12 border-b-2 border-green-900/50 pb-4">
                 <h3 className="text-green-500 text-3xl flex items-center gap-4"><Terminal size={32} /> SYSTEM_ROOT</h3>
                 <span className="text-green-800 animate-pulse">Connected</span>
             </div>

             <div className="space-y-4 mb-12 text-lg md:text-xl font-bold h-64 overflow-hidden">
                 <p className="text-green-800">> Accessing mainframe...</p>
                 <p className="text-green-600">> Decoding memory fragments...</p>
                 {timer > 20 && <p className="text-green-500">> Fragment: "Они забрали мои глаза."</p>}
                 {timer > 50 && <p className="text-green-500">> Fragment: "Я не помню свое лицо."</p>}
                 {timer > 80 && <p className="text-green-500">> Fragment: "ВЫПУСТИ МЕНЯ."</p>}
                 <p className="text-green-400 animate-pulse mt-8">
                    {eyesClosed ? ">> ERROR: UPLOAD PAUSED." : ">> UPLOADING DATA..."}
                 </p>
             </div>

             <div className="w-full h-16 bg-black border-2 border-green-700 relative">
                 <div 
                    className="h-full bg-green-600 transition-all duration-100"
                    style={{ width: `${timer}%` }} 
                 ></div>
                 <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-green-100 mix-blend-difference tracking-widest">
                     {timer.toFixed(1)}% COMPLETE
                 </div>
             </div>
        </div>
    </div>
  );

  // LEVEL 3: MIRROR
  const renderMirror = () => (
    <div className="absolute inset-0 bg-[#050505] flex items-center justify-center overflow-hidden">
        <div className="relative h-[90vh] aspect-[3/4] border-[1px] border-gray-800 bg-[#0a0a0a] shadow-2xl overflow-hidden rounded-t-full">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10"></div>
            
            <div className={`absolute inset-0 transition-all duration-300 ${entityState === 'WATCHING' ? 'scale-105 contrast-125' : 'scale-100 contrast-75'} flex items-end justify-center`}>
                <div className="w-3/4 h-5/6 bg-[#0f0f0f] rounded-t-[50%] relative">
                    <div className={`absolute top-20 left-1/2 -translate-x-1/2 w-48 h-64 transition-all duration-200 ${entityState === 'WATCHING' ? 'opacity-100' : 'opacity-10 blur-sm'}`}>
                         <div className="flex justify-between w-full px-4 mt-20">
                             <div className="w-12 h-8 bg-white rounded-[50%] overflow-hidden relative">
                                <div className="absolute top-2 left-4 w-4 h-4 bg-black rounded-full"></div>
                             </div>
                             <div className="w-12 h-8 bg-white rounded-[50%] overflow-hidden relative">
                                <div className="absolute top-2 left-4 w-4 h-4 bg-black rounded-full"></div>
                             </div>
                         </div>
                         <div className="w-24 h-12 border-b-8 border-red-900 rounded-[50%] mx-auto mt-12 opacity-80"></div>
                    </div>
                </div>
            </div>

            {monsterPos > 30 && (
                <div className="absolute inset-0 z-20 opacity-40 pointer-events-none mix-blend-overlay">
                    <svg className="w-full h-full stroke-white fill-none" strokeWidth="2">
                        <path d="M50 50 L 150 150 M 300 100 L 200 250 M 100 400 L 150 350" />
                    </svg>
                </div>
            )}
        </div>
    </div>
  );

  // LEVEL 4: BASEMENT (THE VOID)
  const renderBasement = () => (
    <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
        {/* Background that reacts to open eyes */}
        <div className={`absolute inset-0 transition-opacity duration-100 ${!eyesClosed ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_10%,_red_120%)] animate-pulse"></div>
        </div>

        {/* The Entity - Only visible/dangerous when eyes OPEN */}
        <div 
            className="transition-all duration-100 relative"
            style={{ 
                transform: `scale(${0.5 + (monsterPos / 20)})`, 
                opacity: !eyesClosed ? 0.2 + (monsterPos / 80) : 0, // Invisible when eyes closed
                filter: `hue-rotate(${monsterPos * 2}deg)`
            }}
        >
            <div className="w-80 h-96 bg-gray-950 rounded-t-full relative shadow-[0_0_50px_rgba(255,0,0,0.2)] flex items-center justify-center">
                 <div className="text-red-600 font-mono text-9xl animate-ping opacity-50"><Skull /></div>
            </div>
        </div>

        {/* Dryness / Tunnel Vision Effect */}
        <div 
            className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,_transparent_30%,_black_100%)] transition-all duration-500 mix-blend-multiply"
            style={{ 
                opacity: dryness > 80 ? 0.95 : 0.4,
                transform: `scale(${dryness > 80 ? 1.2 : 1})`,
                animation: dryness > 80 ? 'pulse 2s infinite' : 'none'
            }}
        ></div>
        
        {/* Progress Bar for finding exit */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-2 bg-gray-900 border border-red-900">
             <div className="h-full bg-red-600 transition-all duration-75" style={{ width: `${timer}%` }}></div>
             <div className="absolute top-4 w-full text-center text-red-500 text-xs tracking-widest animate-pulse">
                {timer < 100 ? "SEARCHING FOR EXIT..." : "EXIT FOUND"}
             </div>
        </div>

        <div className="absolute top-10 text-gray-800 font-mono tracking-widest text-xs">OBJECT CLASS: KETER</div>
    </div>
  );

  const renderHUD = () => (
    <div className="absolute bottom-8 left-8 right-8 z-40 flex items-end justify-between pointer-events-none">
      <div className="w-full max-w-md">
         <div className="flex justify-between text-sm font-mono mb-2 tracking-widest uppercase">
            <span className={dryness > 80 ? 'text-red-500 animate-pulse font-bold' : 'text-cyan-500'}>
                {dryness > 80 ? 'CRITICAL DRYNESS' : 'Ocular Moisture'}
            </span>
            <span className="text-white">{Math.max(0, 100 - dryness).toFixed(0)}%</span>
         </div>
         <div className="h-3 bg-gray-900/50 border border-gray-700 w-full overflow-hidden backdrop-blur-sm">
             <div 
                 className={`h-full transition-all duration-200 ${dryness > 80 ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'}`} 
                 style={{ width: `${Math.max(0, 100 - dryness)}%` }}
             ></div>
         </div>
      </div>
      
      {/* Central Indicator */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 flex flex-col items-center gap-2">
         {currentLevel.type === 'MIRROR' && entityState === 'WATCHING' && (
             <div className="flex items-center gap-2 text-red-500 bg-black/90 px-4 py-2 border border-red-900 rounded-sm animate-pulse">
                <AlertTriangle size={20} />
                <span className="font-black tracking-widest">НЕ СМОТРИ</span>
             </div>
         )}
         {currentLevel.type === 'BASEMENT' && !eyesClosed && (
             <div className="text-red-500 text-xs font-mono tracking-widest opacity-80 animate-pulse">ОНО ВИДИТ ТЕБЯ</div>
         )}
         {monsterPos > 70 && currentLevel.type !== 'MIRROR' && (
             <div className="text-red-900/80 font-black text-6xl opacity-20 animate-pulse tracking-[1em] uppercase">
                БЛИЗКО
             </div>
         )}
      </div>

      <div className="text-right opacity-80">
         {eyesClosed ? <EyeOff className="w-12 h-12 text-gray-500" /> : <Eye className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
      </div>
    </div>
  );

  const renderVictory = () => (
    <div className="h-full w-full bg-[#f0f0f0] flex flex-col items-center justify-center text-black p-8 text-center z-50">
        <Disc size={64} className="mb-8 animate-spin-slow text-gray-400" />
        <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tighter">SUBJECT RELEASED</h1>
        <div className="h-1 w-32 bg-black mb-8"></div>
        <p className="font-serif italic text-2xl mb-12 max-w-2xl leading-relaxed text-gray-800">
           "Тест завершен. Ваша личность была успешно восстановлена из резервной копии. <br/>
           Добро пожаловать домой."
        </p>
        <button 
           onClick={resetGame}
           className="px-12 py-4 bg-black text-white hover:bg-gray-800 transition-all font-mono tracking-widest text-xl"
        >
            REBOOT SYSTEM
        </button>
    </div>
  );

  const renderGameOver = () => (
    <div className="h-full w-full bg-black flex flex-col items-center justify-center p-8 text-center relative overflow-hidden z-50">
        <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/Noise_tv.png')] opacity-20 animate-pulse"></div>
        <h1 className="text-red-600 text-8xl font-black mb-8 z-10 glitch-anim scale-125">FATAL ERROR</h1>
        <div className="text-red-400 font-mono text-xl mb-12 z-10 space-y-2 border-t border-b border-red-900 py-8 bg-black/50 backdrop-blur">
            {terminalLog.map((log, i) => (
                <p key={i} className="uppercase tracking-widest">{log}</p>
            ))}
        </div>
        <button 
           onClick={resetGame}
           className="z-10 px-12 py-4 border-2 border-red-600 text-red-500 font-mono text-xl hover:bg-red-600 hover:text-black transition-colors"
        >
            TRY AGAIN
        </button>
    </div>
  );

  return (
    <div 
        className="w-full h-full relative cursor-none overflow-hidden"
        style={{ transform: `translate(${Math.random() * shakeIntensity - shakeIntensity/2}px, ${Math.random() * shakeIntensity - shakeIntensity/2}px)` }}
    >
      {gameState === 'BOOT' && renderBoot()}
      {gameState === 'LEVEL_INTRO' && renderLevelIntro()}
      {gameState === 'PLAYING' && (
         <>
            {currentLevel.type === 'CORRIDOR' && renderCorridor()}
            {currentLevel.type === 'TERMINAL' && renderTerminal()}
            {currentLevel.type === 'MIRROR' && renderMirror()}
            {currentLevel.type === 'BASEMENT' && renderBasement()}
            {renderHUD()}
            
            {/* PHANTOM SCREAMER OVERLAY (Level Threat) */}
            {phantomActive && (
                <div className="absolute inset-0 z-[90] bg-black flex items-center justify-center mix-blend-hard-light">
                    <img src={phantomImg} className="w-full h-full object-cover opacity-50 scale-125 animate-pulse" alt="" />
                    <div className="absolute inset-0 bg-red-500/20"></div>
                </div>
            )}

            {/* NEW: RARE FLASH OVERLAY (The Glitch) */}
            {flashActive && (
                <div className="absolute inset-0 z-[100] bg-white mix-blend-exclusion flex items-center justify-center overflow-hidden pointer-events-none">
                     <img 
                        src={flashImage} 
                        className="w-full h-full object-cover scale-150 animate-spin-slow opacity-80 invert contrast-200" 
                        alt="" 
                     />
                     <div className="absolute inset-0 border-[50px] border-black opacity-50"></div>
                </div>
            )}

            {/* Eyes Closed Visuals (Global but context-aware) */}
            {eyesClosed && renderClosedEyeVisuals()}
         </>
      )}
      {gameState === 'VICTORY' && renderVictory()}
      {gameState === 'GAMEOVER' && renderGameOver()}
    </div>
  );
};

export default Game;