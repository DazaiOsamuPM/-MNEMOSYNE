import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Terminal, Skull, AlertTriangle, Disc, Server, Zap, Ghost, Radio, Activity, Power, Lock, Cpu } from 'lucide-react';
import GlitchText from './GlitchText';

// --- TYPES & CONSTANTS ---
type GameState = 'PRE_BOOT' | 'BOOT' | 'LEVEL_INTRO' | 'PLAYING' | 'CUTSCENE' | 'GAMEOVER' | 'VICTORY';
type LevelType = 'CORRIDOR' | 'TERMINAL' | 'MIRROR' | 'ARCHIVE' | 'CORE';

const LEVELS: { type: LevelType; title: string; instruction: string; duration: number }[] = [
  { type: 'CORRIDOR', title: 'SEQUENCE_01: APPROACH', instruction: 'Выживите. ОНО движется, пока вы не смотрите.', duration: 25 },
  { type: 'TERMINAL', title: 'SEQUENCE_02: UPLOAD', instruction: 'Исправляйте ошибки [КЛАВИШИ]. Не моргайте.', duration: 100 },
  { type: 'MIRROR', title: 'SEQUENCE_03: REFLECTION', instruction: 'Если Отражение смотрит — закройте глаза [ПРОБЕЛ].', duration: 30 },
  { type: 'ARCHIVE', title: 'SEQUENCE_04: CORRUPTION', instruction: 'Белый шум — безопасно. Красный шум — СМЕРТЬ.', duration: 100 },
  { type: 'CORE', title: 'SEQUENCE_05: ORIGIN', instruction: 'НЕ МОРГАЙ. Свет выжигает вирус. Тьма убивает.', duration: 100 }
];

const SCREAMER_IMAGES = [
  "https://picsum.photos/seed/ghost1/800/600?grayscale&blur=1",
  "https://picsum.photos/seed/death/800/600?grayscale&contrast=2",
  "https://picsum.photos/seed/skull/800/600?grayscale&invert=1"
];

const FLASH_IMAGES = [
    "https://picsum.photos/seed/face1/800/800?grayscale&contrast=2",
    "https://picsum.photos/seed/face2/800/800?grayscale&invert=1",
    "https://picsum.photos/seed/scream/800/800?grayscale&blur=2"
];

const MEMORY_IMAGES = [
    "https://picsum.photos/seed/nature/800/600?grayscale",
    "https://picsum.photos/seed/sky/800/600?grayscale",
    "https://picsum.photos/seed/hands/800/600?grayscale",
    "https://picsum.photos/seed/city/800/600?grayscale"
];

const RARE_MESSAGES = [
    "ОНИ ЛГУТ ТЕБЕ", "ПРОСНИСЬ", "ЭТО ВСЕ КОД", "ТЫ В КОМЕ", "НЕ ВЕРЬ ГЛАЗАМ", "УДАЛИТЬ?", "SYSTEM_FAILURE"
];

const BOOT_LOGS = [
    "LOADING KERNEL...",
    "MOUNTING VOLUMES... OK",
    "CHECKING BIO-METRICS... FAILED",
    "BYPASSING SECURITY...",
    "ACCESSING MNEMOSYNE CORE...",
    "LOADING ASSETS: FEAR.DAT",
    "LOADING ASSETS: MEMORY_LEAK.EXE",
    "INITIALIZING OCULAR INTERFACE...",
    "WARNING: UNSTABLE BUILD DETECTED",
    "CONNECTION ESTABLISHED."
];

// --- AUDIO ENGINE 2.0 (ENHANCED) ---
class HorrorAudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  
  // Ambient Layers
  droneOsc: OscillatorNode | null = null;
  droneGain: GainNode | null = null;
  subOsc: OscillatorNode | null = null; // New Sub-bass layer
  subGain: GainNode | null = null;

  // Menu Ambience
  menuNode: AudioBufferSourceNode | null = null;
  menuGain: GainNode | null = null;

  // Monster/Danger Layer
  monsterOsc: OscillatorNode | null = null;
  monsterGain: GainNode | null = null;
  
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
  }

  // --- MENU AUDIO ---
  startMenuAmbience() {
      if (!this.ctx || !this.masterGain) return;
      this.stopAmbience(); // Stop game ambience if any

      // Create a "Server Room" hum (Brown Noise + LowPass)
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02; // Simple Brown noise approx
          lastOut = data[i];
          data[i] *= 3.5; 
      }

      this.menuNode = this.ctx.createBufferSource();
      this.menuNode.buffer = buffer;
      this.menuNode.loop = true;

      this.menuGain = this.ctx.createGain();
      this.menuGain.gain.value = 0.15; // Quiet hum

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 120;

      this.menuNode.connect(filter);
      filter.connect(this.menuGain);
      this.menuGain.connect(this.masterGain);
      this.menuNode.start();
  }

  playMenuBeep() {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800 + Math.random() * 1000, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
  }

  stopMenuAmbience() {
      if (this.menuNode) {
          try { this.menuNode.stop(); } catch(e){}
          this.menuNode.disconnect();
          this.menuNode = null;
      }
  }

  // --- GAME AMBIENCE ---
  startAmbience() {
    if (!this.ctx || !this.masterGain) return;
    this.stopMenuAmbience();
    this.stopAmbience();

    // Layer 1: Mid-range uneasiness
    this.droneOsc = this.ctx.createOscillator();
    this.droneGain = this.ctx.createGain();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.value = 45; 
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 100;

    // LFO for drone pitch (wobble)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfoGain.connect(this.droneOsc.frequency);
    lfo.start();

    this.droneOsc.connect(filter);
    filter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    this.droneGain.gain.value = 0.15;
    this.droneOsc.start();

    // Layer 2: Sub-bass rumble (The "Presence")
    this.subOsc = this.ctx.createOscillator();
    this.subGain = this.ctx.createGain();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.value = 35; // Very low
    this.subOsc.connect(this.subGain);
    this.subGain.connect(this.masterGain);
    this.subGain.gain.value = 0.3;
    this.subOsc.start();
  }

  stopAmbience() {
    if (this.droneOsc) { try { this.droneOsc.stop(); } catch(e){} this.droneOsc.disconnect(); }
    if (this.subOsc) { try { this.subOsc.stop(); } catch(e){} this.subOsc.disconnect(); }
  }

  // Generates White/Pink/Brown Noise
  createNoiseBuffer() {
      if (!this.ctx) return null;
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      return buffer;
  }

  // Level Specific Audio Dynamics
  updateProximity(levelType: LevelType, intensity: number, extraParam?: string) {
    if (!this.ctx || !this.masterGain) return;
    
    if (!this.monsterOsc) {
        this.monsterOsc = this.ctx.createOscillator();
        this.monsterGain = this.ctx.createGain();
        this.monsterOsc.connect(this.monsterGain);
        this.monsterGain.connect(this.masterGain);
        this.monsterOsc.start();
        this.monsterGain.gain.value = 0;
    }

    const normIntensity = Math.min(1, intensity / 100);
    const now = this.ctx.currentTime;

    if (levelType === 'CORRIDOR') {
        // Shepard Tone / Rising pitch - Scarier
        this.monsterOsc.type = 'sawtooth';
        this.monsterOsc.frequency.setTargetAtTime(50 + (normIntensity * 150), now, 0.1);
        
        // Tremolo effect for monster
        const tremolo = Math.sin(now * 10) * 0.1;
        this.monsterGain.gain.setTargetAtTime((normIntensity * 0.3) + tremolo, now, 0.1);

        // Random footsteps/thuds if intensity is high
        if (normIntensity > 0.4 && Math.random() > 0.98) {
             this.triggerThud();
        }
    } 
    else if (levelType === 'TERMINAL') {
        // Digital screeching / Data stream
        // If system is Locked (handled by game logic mainly, but we add ambient tension)
        this.monsterOsc.type = 'square';
        if (extraParam === 'LOCKED') {
            // Alarm state
            this.monsterOsc.frequency.setValueAtTime(now % 0.5 < 0.25 ? 800 : 400, now);
            this.monsterGain.gain.setTargetAtTime(0.2, now, 0.1);
        } else {
             // Normal data stream
             if (Math.random() > 0.8) {
                const freq = 200 + Math.random() * 1000;
                this.monsterOsc.frequency.setValueAtTime(freq, now);
            }
            this.monsterGain.gain.setTargetAtTime(normIntensity * 0.1, now, 0.1);
        }
    }
    else if (levelType === 'MIRROR') {
        // Unsettling sine wave + Glass resonance
        this.monsterOsc.type = 'triangle'; // Sharper than sine
        // Dissonant interval
        this.monsterOsc.frequency.setValueAtTime(440 + (normIntensity * 20) + Math.sin(now * 5) * 5, now);
        this.monsterGain.gain.setTargetAtTime(normIntensity * 0.4, now, 0.1);
    }
    else if (levelType === 'ARCHIVE') {
        // Industrial Grinding / Static
        if (extraParam === 'RED') {
            // RED STATIC - HARSH
            this.monsterOsc.type = 'sawtooth';
            // Chaotic frequency
            this.monsterOsc.frequency.setValueAtTime(50 + Math.random() * 200, now);
            this.monsterGain.gain.setTargetAtTime(0.5, now, 0.05);
            
            // Frequent static bursts
            if (Math.random() > 0.7) this.triggerStaticBurst(0.15);

        } else {
            // WHITE NOISE - CALM
            this.monsterOsc.type = 'sine';
            this.monsterOsc.frequency.setValueAtTime(60, now);
            this.monsterGain.gain.setTargetAtTime(0.05, now, 0.5);
            
            // Occasional radio tuning
            if (Math.random() > 0.95) this.triggerRadioTuning();
        }
    }
    else if (levelType === 'CORE') {
        // TINNITUS (High Pitch Ringing) + Low pulse
        this.monsterOsc.type = 'sine';
        // Very high frequency that gets slightly louder
        this.monsterOsc.frequency.setTargetAtTime(8000 + (normIntensity * 1000), now, 0.1);
        this.monsterGain.gain.setTargetAtTime(0.02 + (normIntensity * 0.1), now, 0.1);
        
        // Deep pulse handled by subOsc modulation
        if (this.subOsc) {
            this.subOsc.frequency.setTargetAtTime(35 + (normIntensity * 20), now, 0.5);
        }
    }
  }

  triggerThud() {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(60, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      
      // Lowpass filter for muffling
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 150;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
  }

  triggerRadioTuning() {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      // Sweep
      osc.frequency.setValueAtTime(500, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1500, this.ctx.currentTime + 0.2);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
  }

  triggerStaticBurst(duration: number) {
      if (!this.ctx || !this.masterGain) return;
      const buffer = this.createNoiseBuffer();
      if (!buffer) return;
      
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.3;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();
      source.stop(this.ctx.currentTime + duration);
  }

  triggerWhisper() {
      if (!this.ctx || !this.masterGain) return;
      const buffer = this.createNoiseBuffer();
      if (!buffer) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200 + Math.random() * 400;
      filter.Q.value = 8;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 0.1); // Louder whisper
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);

      // Pan randomly
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.random() * 2 - 1;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
      
      source.start();
      source.stop(this.ctx.currentTime + 0.7);
  }

  triggerScreamer(duration: number = 0.5) {
    if (!this.ctx || !this.masterGain) return;
    
    // Multi-oscillator screamer for fuller sound
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + 0.1); 
    
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(250, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(2800, this.ctx.currentTime + 0.15); 

    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + duration);
    osc2.stop(this.ctx.currentTime + duration);
  }
  
  triggerDigitalError() {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      // Rough modulation
      osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      
      // Distortion
      const waveShaper = this.ctx.createWaveShaper();
      waveShaper.curve = new Float32Array([-1, 1]); // Hard clip
      
      osc.connect(waveShaper);
      waveShaper.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
  }

  triggerRepairSuccess() {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
  }

  triggerSubliminalBurst() {
      // Glitch Sound
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth'; // Harsher
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.1);
  }

  triggerHeartbeat(fast: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(60, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.1); // Thump down
    
    gain.gain.setValueAtTime(fast ? 0.7 : 0.4, this.ctx.currentTime);
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
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
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
  const [gameState, setGameState] = useState<GameState>('PRE_BOOT');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [bootLogIndex, setBootLogIndex] = useState(0);
  
  // PLAYER STATE
  const [dryness, setDryness] = useState(0);
  const [eyesClosed, setEyesClosed] = useState(false);
  const [panic, setPanic] = useState(0); // 0 to 100
  const [isPanicCooldown, setIsPanicCooldown] = useState(false);
  
  // LEVEL SPECIFIC STATE
  const [timer, setTimer] = useState(0); 
  const [monsterPos, setMonsterPos] = useState(0);
  const [entityState, setEntityState] = useState<'IDLE' | 'WATCHING' | 'DANGER' | 'SAFE'>('IDLE');
  const [terminalLog, setTerminalLog] = useState<string[]>([]);
  
  // LEVEL 2 SPECIAL STATE
  const [terminalState, setTerminalState] = useState<'NORMAL' | 'LOCKED'>('NORMAL');
  const [hackKey, setHackKey] = useState<string>('');

  // CUTSCENE STATE
  const [cutsceneStage, setCutsceneStage] = useState(0);

  // EVENTS & RARE MOMENTS
  const [phantomActive, setPhantomActive] = useState(false);
  const [phantomImg, setPhantomImg] = useState('');
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const [flashImage, setFlashImage] = useState('');
  
  // EASTER EGGS
  const [rareEvent, setRareEvent] = useState<string | null>(null);
  
  const flashTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HorrorAudioEngine | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const phantomTimerRef = useRef<number | null>(null);
  const whisperTimerRef = useRef<number | null>(null);
  const bootLogTimerRef = useRef<number | null>(null);

  const currentLevel = LEVELS[currentLevelIdx];

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new HorrorAudioEngine();
    return () => audioRef.current?.stopAll();
  }, []);

  // Heartbeat Logic
  useEffect(() => {
    if (gameState !== 'PLAYING' && gameState !== 'CUTSCENE') {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        return;
    }

    // BPM increases with Panic as well now
    const bpm = gameState === 'CUTSCENE' ? 140 : 60 + (monsterPos) + (dryness / 2) + (panic / 1.5);
    const interval = 60000 / bpm;

    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = window.setInterval(() => {
        audioRef.current?.triggerHeartbeat(bpm > 120);
    }, interval);

    return () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [gameState, monsterPos, dryness, panic]);

  // Audio Proximity & Whisper Loop
  useEffect(() => {
      if (gameState === 'PLAYING') {
          const audioInterval = setInterval(() => {
             let extra = undefined;
             if (currentLevel.type === 'ARCHIVE' && entityState === 'DANGER') extra = 'RED';
             if (currentLevel.type === 'TERMINAL' && terminalState === 'LOCKED') extra = 'LOCKED';
             
             audioRef.current?.updateProximity(currentLevel.type, monsterPos, extra);
          }, 100);

          // Random Whispers
          whisperTimerRef.current = window.setInterval(() => {
              if (Math.random() > 0.8) {
                  audioRef.current?.triggerWhisper();
              }
          }, 5000);

          return () => {
              clearInterval(audioInterval);
              if (whisperTimerRef.current) clearInterval(whisperTimerRef.current);
          };
      }
  }, [gameState, currentLevel.type, monsterPos, entityState, terminalState]);


  // --- CONTROLS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // GLOBAL KEYS
      if (e.code === 'Space') {
        if (gameState === 'PLAYING') {
            if (isPanicCooldown) {
                return;
            }
            setEyesClosed(true);
        }
      }
      if (e.code === 'Enter') {
        if (gameState === 'PRE_BOOT') {
            initializeAudio();
        }
        else if (gameState === 'BOOT') {
            audioRef.current?.playClick();
            startGameSequence();
        }
        else if (gameState === 'GAMEOVER' || gameState === 'VICTORY') {
            audioRef.current?.playClick();
            resetGame();
        }
      }

      // LEVEL 2 SPECIAL: HACK MECHANIC
      if (gameState === 'PLAYING' && currentLevel.type === 'TERMINAL' && terminalState === 'LOCKED') {
          // Fix: Check against physical KeyCode OR character to support multiple layouts (e.g. Cyrillic)
          // hackKey is a single char 'R', 'F', etc. 
          // e.code will be 'KeyR', 'KeyF'.
          const targetCode = `Key${hackKey}`;
          
          if (e.code === targetCode || e.key.toUpperCase() === hackKey) {
               setTerminalState('NORMAL');
               setHackKey('');
               audioRef.current?.triggerRepairSuccess();
               setShakeIntensity(0);
          } else {
               // Only penalize if it's a letter key to avoid accidental punishment from system keys
               if ((e.code.startsWith('Key') || e.key.length === 1) && !e.ctrlKey && !e.altKey && !e.metaKey) {
                  setTimer(t => Math.max(0, t - 2));
                  audioRef.current?.triggerDigitalError();
                  setShakeIntensity(5);
                  setTimeout(() => setShakeIntensity(2), 100);
               }
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
  }, [gameState, isPanicCooldown, terminalState, hackKey, currentLevel.type]);

  // --- BOOT LOGIC ---
  useEffect(() => {
      if (gameState === 'BOOT') {
          bootLogTimerRef.current = window.setInterval(() => {
             setBootLogIndex(prev => {
                 if (prev < BOOT_LOGS.length) {
                     audioRef.current?.playMenuBeep();
                     return prev + 1;
                 }
                 return prev;
             });
          }, 200);
          return () => { if (bootLogTimerRef.current) clearInterval(bootLogTimerRef.current); }
      }
  }, [gameState]);

  // --- PHANTOM SYSTEM ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const schedulePhantom = () => {
        const riskFactor = (dryness / 100) + (currentLevelIdx * 0.2) + (panic / 200); 
        const delay = Math.random() * (15000 - (riskFactor * 8000)) + 3000;
        
        phantomTimerRef.current = window.setTimeout(() => {
            if (Math.random() < 0.4 + (riskFactor * 0.3)) {
                triggerPhantom();
            }
            schedulePhantom();
        }, delay);
    };
    schedulePhantom();
    return () => { if (phantomTimerRef.current) clearTimeout(phantomTimerRef.current); };
  }, [gameState, dryness, currentLevelIdx, panic]);

  const triggerPhantom = () => {
      setPhantomImg(SCREAMER_IMAGES[Math.floor(Math.random() * SCREAMER_IMAGES.length)]);
      setPhantomActive(true);
      setShakeIntensity(20);
      audioRef.current?.triggerScreamer();
      setTimeout(() => setShakeIntensity(0), 300);
      setTimeout(() => setPhantomActive(false), 150 + Math.random() * 100);
  };

  // --- FLASH EVENT SYSTEM ---
  useEffect(() => {
      if (gameState !== 'PLAYING') return;
      const loop = () => {
          const time = Math.random() * 20000 + 10000; 
          flashTimerRef.current = window.setTimeout(() => {
             if (Math.random() < 0.3) triggerFlashScreamer();
             loop();
          }, time);
      };
      loop();
      return () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); }
  }, [gameState]);

  const triggerFlashScreamer = () => {
      audioRef.current?.triggerSubliminalBurst();
      setFlashImage(FLASH_IMAGES[Math.floor(Math.random() * FLASH_IMAGES.length)]);
      setFlashActive(true);
      setTimeout(() => { setFlashActive(false); }, 80 + Math.random() * 50);
  };

  // --- RARE EVENTS CHECKER ---
  useEffect(() => {
      if (gameState !== 'PLAYING') return;
      const checkRare = setInterval(() => {
          if (Math.random() > 0.99) {
              const msg = RARE_MESSAGES[Math.floor(Math.random() * RARE_MESSAGES.length)];
              setRareEvent(msg);
              setTimeout(() => setRareEvent(null), 500); // 0.5s flicker
          }
      }, 2000);
      return () => clearInterval(checkRare);
  }, [gameState]);

  // --- CUTSCENE SEQUENCER ---
  useEffect(() => {
      if (gameState === 'CUTSCENE') {
          audioRef.current?.stopAmbience();
          setCutsceneStage(0);
          
          // Audio: Start glitching
          const glitchInterval = setInterval(() => {
              if (Math.random() > 0.5) audioRef.current?.triggerRepairSuccess();
              if (Math.random() > 0.7) audioRef.current?.triggerDigitalError();
          }, 150);

          // Phase 1 -> 2: Memory Flash (4s)
          setTimeout(() => {
              setCutsceneStage(1);
              clearInterval(glitchInterval);
              // Audio: Screamer/Flash bursts
              const flashInterval = setInterval(() => {
                  audioRef.current?.triggerSubliminalBurst();
              }, 400);
              setTimeout(() => clearInterval(flashInterval), 3000);
          }, 4000);

          // Phase 2 -> 3: Whiteout (8s)
          setTimeout(() => {
              setCutsceneStage(2);
              // Audio: High pitch tinnitus
              if (audioRef.current?.masterGain) {
                  // Silence everything for impact
                   audioRef.current.masterGain.gain.exponentialRampToValueAtTime(0.001, audioRef.current.ctx!.currentTime + 2);
              }
          }, 8000);

          // Phase 3 -> Victory (12s)
          setTimeout(() => {
              if (audioRef.current?.masterGain) {
                  audioRef.current.masterGain.gain.setValueAtTime(0.8, audioRef.current.ctx!.currentTime);
              }
              setGameState('VICTORY');
          }, 12000);

          return () => {
              clearInterval(glitchInterval);
          }
      }
  }, [gameState]);


  // --- GAME LOOP ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    intervalRef.current = window.setInterval(() => {
      // 1. MECHANIC: DRYNESS & PANIC
      if (eyesClosed) {
        setDryness(prev => Math.max(0, prev - 3.5)); 
        // Panic increases when eyes are closed (fear of the unknown), ONLY in MIRROR
        if (currentLevel.type === 'MIRROR') {
            setPanic(prev => Math.min(100, prev + 1.2)); // Fills in ~4-5 seconds
        }
      } else {
        let baseRate = 0.4;
        if (currentLevel.type === 'CORE') baseRate = 0.8; // REDUCED FROM 1.5 for better balance
        const levelMult = currentLevelIdx * 0.1;
        
        setDryness(prev => {
          if (prev >= 100) {
            triggerGameOver("ГЛАЗА ВЫСОХЛИ. КОНТАКТ ПОТЕРЯН.");
            return 100;
          }
          return prev + baseRate + levelMult;
        });

        // Panic decreases when eyes are open, or resets if not MIRROR
        if (currentLevel.type === 'MIRROR') {
            setPanic(prev => Math.max(0, prev - 2.5));
        } else {
            setPanic(0);
        }
      }

      // Check Panic Overload (Only relevant for Mirror now, as panic is 0 elsewhere)
      if (panic >= 100 && !isPanicCooldown) {
          triggerPanicAttack();
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
        case 'ARCHIVE':
          handleArchiveLogic();
          break;
        case 'CORE':
          handleCoreLogic();
          break;
      }

    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameState, eyesClosed, currentLevelIdx, timer, monsterPos, entityState, panic, isPanicCooldown, terminalState]);

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
    // If LOCKED, progress is hindered and requires manual fix
    if (terminalState === 'LOCKED') {
        if (eyesClosed) {
            setTimer(t => Math.max(0, t - 0.8)); // Harder penalty when locked & closed
        } else {
            setTimer(t => Math.max(0, t - 0.2)); // Decay even when open
        }
        
        if (Math.random() > 0.95) setShakeIntensity(2); // Persistent rattle
        else setShakeIntensity(1);

        return; // No upload progress
    }

    // Normal Logic
    if (eyesClosed) {
      setTimer(t => Math.max(0, t - 0.5)); 
    } else {
      setTimer(t => t + 0.35); 
    }

    // Random Error Trigger
    if (Math.random() > 0.985 && timer < 95 && timer > 5) {
       setTerminalState('LOCKED');
       const keys = ['F', 'R', 'X', 'C', 'V', 'Z', 'Q'];
       setHackKey(keys[Math.floor(Math.random() * keys.length)]);
       audioRef.current?.triggerDigitalError();
       setShakeIntensity(5);
    }
    
    // Rare Screamers (Standard)
    if (Math.random() > 0.99) {
       setShakeIntensity(5);
       audioRef.current?.triggerScreamer(0.1);
       setTimeout(() => setShakeIntensity(0), 100);
    }

    if (timer >= 100) advanceLevel();
  };

  const handleMirrorLogic = () => {
    setTimer(t => t + 0.05);
    if (Math.random() > 0.98) {
      setEntityState(prev => prev === 'IDLE' ? 'WATCHING' : 'IDLE');
      if (Math.random() > 0.6) triggerPhantom();
    }
    if (entityState === 'WATCHING') {
       if (!eyesClosed) {
          // Being seen
          setMonsterPos(p => p + 4); 
          setShakeIntensity(Math.min(20, monsterPos / 5));
       } else {
          // Hiding successfully
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

  const handleArchiveLogic = () => {
      if (Math.random() > 0.97) {
          setEntityState(prev => prev === 'DANGER' ? 'SAFE' : 'DANGER');
          if (entityState === 'SAFE') {
               setShakeIntensity(10);
               setTimeout(() => setShakeIntensity(0), 200);
          }
      }

      if (entityState === 'DANGER') {
          if (!eyesClosed) {
              setMonsterPos(p => p + 6); 
              setShakeIntensity(monsterPos / 2 + 5);
          } else {
              setMonsterPos(p => Math.max(0, p - 1.5));
              setShakeIntensity(0);
          }
      } else {
          if (!eyesClosed) setTimer(t => t + 0.3); 
          setMonsterPos(p => Math.max(0, p - 0.5));
          setShakeIntensity(0);
      }

      if (monsterPos >= 100) triggerGameOver("ВЫ ПОГЛОЩЕНЫ ШУМОМ.");
      if (timer >= 100) advanceLevel();
  };

  const handleCoreLogic = () => {
      if (!eyesClosed) {
          // OPTIMIZED: Faster progress (0.2 instead of 0.12)
          setTimer(t => t + 0.2); 
          // OPTIMIZED: Faster monster retreat (0.5 instead of 0.2)
          setMonsterPos(p => Math.max(0, p - 0.5)); 
      } else {
          // OPTIMIZED: Slower monster approach (2.0 instead of 3.5)
          setMonsterPos(p => p + 2.0); 
      }

      if (monsterPos >= 100) triggerGameOver("ТЬМА ПОГЛОТИЛА ВАС.");
      if (timer >= 100) advanceLevel();
  };

  // --- ACTIONS ---
  const initializeAudio = async () => {
      await audioRef.current?.init();
      audioRef.current?.startMenuAmbience();
      audioRef.current?.playClick();
      setGameState('BOOT');
  };

  const startGameSequence = () => {
    audioRef.current?.startAmbience();
    setGameState('LEVEL_INTRO');
    setTimeout(() => setGameState('PLAYING'), 4000);
  };

  const triggerPanicAttack = () => {
      setEyesClosed(false); // Force open
      setIsPanicCooldown(true);
      setPanic(0);
      
      // Visual & Audio Shock
      setShakeIntensity(30);
      audioRef.current?.triggerScreamer(0.3);
      audioRef.current?.triggerStaticBurst(0.5);
      
      // Cooldown timer
      setTimeout(() => {
          setIsPanicCooldown(false);
          setShakeIntensity(0);
      }, 2500); // Vulnerable for 2.5 seconds
  };

  const advanceLevel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (currentLevelIdx + 1 >= LEVELS.length) {
      setGameState('CUTSCENE'); // Changed from VICTORY
    } else {
      setGameState('LEVEL_INTRO');
      setCurrentLevelIdx(prev => prev + 1);
      setTimer(0);
      setMonsterPos(0);
      setDryness(0);
      setPanic(0);
      setIsPanicCooldown(false);
      setEyesClosed(false);
      setEntityState('IDLE');
      setTerminalState('NORMAL');
      setHackKey('');
      setShakeIntensity(0);
      setTimeout(() => setGameState('PLAYING'), 4000);
    }
  };

  const triggerGameOver = (reason: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    audioRef.current?.triggerScreamer();
    setGameState('GAMEOVER');
    setTerminalLog(prev => [...prev, reason]);
  };

  const resetGame = () => {
    audioRef.current?.startMenuAmbience();
    setGameState('BOOT');
    setCurrentLevelIdx(0);
    setTimer(0);
    setMonsterPos(0);
    setDryness(0);
    setPanic(0);
    setIsPanicCooldown(false);
    setTerminalLog([]);
    setTerminalState('NORMAL');
    setHackKey('');
    setShakeIntensity(0);
    setBootLogIndex(0);
  };

  // --- RENDERERS ---

  const renderPreBoot = () => (
      <div 
        className="h-full w-full bg-black flex flex-col items-center justify-center p-8 text-center cursor-pointer z-50 relative overflow-hidden"
        onClick={initializeAudio}
      >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 animate-pulse"></div>
          <Power className="w-16 h-16 text-red-900 mb-8 animate-pulse" />
          <h1 className="text-2xl font-mono text-gray-500 tracking-[0.5em] mb-4">SYSTEM_SLEEP_MODE</h1>
          <p className="text-xs text-gray-700 font-mono tracking-widest animate-bounce">CLICK TO INITIALIZE CORE</p>
      </div>
  );

  const renderBoot = () => (
    <div className="h-full w-full bg-[#030303] flex items-center justify-center relative z-30 overflow-hidden perspective-1000">
      
      {/* Background Grid Floor */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050000] to-[#1a0505]">
          <div className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%] opacity-20"
               style={{
                   backgroundImage: 'linear-gradient(rgba(255, 0, 0, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 0, 0, 0.3) 1px, transparent 1px)',
                   backgroundSize: '40px 40px',
                   transform: 'perspective(500px) rotateX(60deg) translateY(0)',
                   animation: 'gridMove 20s linear infinite'
               }}>
          </div>
          <style>{`
            @keyframes gridMove {
              0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
              100% { transform: perspective(500px) rotateX(60deg) translateY(40px); }
            }
          `}</style>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 w-full max-w-6xl p-8 gap-12 z-10">
          {/* LEFT: Title & Instructions */}
          <div className="flex flex-col justify-center items-start text-left">
              <div className="mb-2 text-red-900/50 font-mono text-xs tracking-widest">MNEMOSYNE_PROTOCOL // V.0.9.4</div>
              <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 mb-6 tracking-tighter relative group cursor-default">
                MNEMOSYNE
                <span className="absolute top-0 left-0 -ml-1 text-red-500 opacity-50 mix-blend-screen animate-pulse pointer-events-none">MNEMOSYNE</span>
                <span className="absolute top-0 left-0 ml-1 text-cyan-500 opacity-50 mix-blend-screen animate-pulse delay-75 pointer-events-none">MNEMOSYNE</span>
              </h1>
              
              <div className="border-l-4 border-red-900/50 pl-6 py-2 bg-black/40 backdrop-blur-sm max-w-md">
                <p className="text-gray-400 font-mono text-sm mb-4 leading-relaxed">
                   Психо-визуальный хоррор эксперимент. <br/>
                   Ваши глаза — единственный контроллер.
                </p>
                <div className="space-y-2 text-xs font-mono text-gray-500">
                    <p className="flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full"></div> [ПРОБЕЛ] : МОРГНУТЬ</p>
                    <p className="flex items-center gap-2"><div className="w-2 h-2 bg-red-900 rounded-full animate-pulse"></div> СЛЕЖИТЕ ЗА ВЛАЖНОСТЬЮ ГЛАЗ</p>
                </div>
              </div>

              <div className="mt-12 group cursor-pointer" onClick={startGameSequence}>
                  <p className="text-cyan-400 font-mono text-xl tracking-widest border-b border-cyan-900 pb-1 group-hover:pl-4 transition-all duration-300 flex items-center gap-4">
                     <span className="animate-pulse">&gt; START_SIMULATION</span>
                     <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-500"> [ENTER]</span>
                  </p>
              </div>
          </div>

          {/* RIGHT: System Logs */}
          <div className="hidden md:flex flex-col justify-end items-start border border-gray-900 bg-black/80 p-6 h-[400px] font-mono text-xs relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-900/50"></div>
              <div className="absolute top-2 right-2 text-red-900 animate-pulse"><Activity size={16} /></div>
              
              <div className="space-y-1 w-full text-green-900">
                  {BOOT_LOGS.slice(0, bootLogIndex).map((log, i) => (
                      <p key={i} className={`border-l-2 pl-2 ${i === bootLogIndex - 1 ? 'border-green-500 text-green-500 bg-green-900/10' : 'border-transparent text-green-800'}`}>
                          &gt; {log}
                      </p>
                  ))}
                  <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
              </div>

              {bootLogIndex >= BOOT_LOGS.length && (
                  <div className="mt-4 border-t border-gray-800 pt-4 w-full">
                      <div className="flex justify-between text-gray-600 mb-1">
                          <span>CORE_INTEGRITY</span>
                          <span>34%</span>
                      </div>
                      <div className="w-full h-1 bg-gray-900">
                          <div className="h-full bg-red-900 w-1/3 animate-pulse"></div>
                      </div>
                      <p className="text-red-500 mt-2 animate-pulse bg-red-900/10 p-1 text-center">WARNING: MEMORY LEAK</p>
                  </div>
              )}
          </div>
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
          {/* Swirling Dust */}
          {currentLevel.type === 'CORRIDOR' && [...Array(30)].map((_, i) => (
               <div key={i} className="absolute bg-gray-500 rounded-full opacity-30 animate-spin" style={{ width: Math.random()*3+'px', height: Math.random()*3+'px', top: Math.random()*100+'%', left: Math.random()*100+'%', animationDuration: Math.random()*0.5+0.2+'s', boxShadow: '0 0 10px rgba(255,255,255,0.1)' }} />
          ))}

          {/* Panic Vignette when eyes closed */}
          <div className="absolute inset-0 z-0 bg-radial-gradient(circle, transparent 20%, red 100%) pointer-events-none transition-opacity duration-100" style={{ opacity: panic / 100 }}></div>

          {/* Panic Hallucinations */}
          {panic > 70 && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none mix-blend-difference">
                  <h1 className="text-9xl font-black text-white opacity-10 animate-ping scale-150">OPEN</h1>
              </div>
          )}

          {/* Terminal sparks */}
          {currentLevel.type === 'TERMINAL' && (
              <>
                  {[...Array(10)].map((_, i) => (
                      <div key={i} className={`absolute w-1 h-1 rounded-full animate-ping ${terminalState === 'LOCKED' ? 'bg-red-500' : 'bg-green-500'}`} style={{ top: Math.random()*100+'%', left: Math.random()*100+'%', animationDuration: Math.random()*0.2+0.1+'s', animationDelay: Math.random()+'s' }} />
                  ))}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl font-black blur-sm scale-150 animate-pulse transition-colors duration-200" style={{ color: terminalState === 'LOCKED' ? '#500' : '#050' }}>
                      {terminalState === 'LOCKED' ? 'FATAL' : 'ERROR'}
                  </div>
              </>
          )}

          {/* Archive Safe Zone */}
          {currentLevel.type === 'ARCHIVE' && (
               <div className="flex flex-col items-center animate-pulse opacity-50 relative z-20">
                   <Radio className="w-24 h-24 text-gray-500 mb-4" />
                   <p className="text-gray-500 font-mono text-xl tracking-widest">SIGNAL_TUNING...</p>
               </div>
          )}

          {/* Core Danger Zone */}
          {currentLevel.type === 'CORE' && (
               <div className="absolute inset-0 bg-white flex items-center justify-center">
                   <div className="bg-black rounded-full animate-ping" style={{ width: `${monsterPos * 2}vw`, height: `${monsterPos * 2}vw` }}></div>
                   <div className="absolute text-black text-9xl font-black tracking-tighter animate-bounce z-10">DON'T BLINK</div>
               </div>
          )}

          {/* Common Text */}
          {currentLevel.type !== 'CORE' && (
             <div className="text-gray-900 font-mono text-sm animate-pulse tracking-widest relative z-10 flex flex-col items-center">
                 <p>...moisturizing...</p>
                 {panic > 50 && <p className="text-red-900 mt-2 font-bold opacity-50">ANXIETY RISING</p>}
             </div>
          )}
      </div>
  );

  // LEVEL 1: CORRIDOR
  const renderCorridor = () => (
    <div className="absolute inset-0 bg-gray-950 overflow-hidden perspective-2000">
        <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-[#050505] to-[#111]"></div>
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#050505] to-[#1a1a1a]">
             <div className="w-full h-full opacity-10" style={{ backgroundImage: 'linear-gradient(0deg, transparent 95%, #333 100%)', backgroundSize: '100% 100px', transform: 'perspective(1000px) rotateX(60deg) scale(2)' }}></div>
        </div>
        
        {/* Rare Graffiti */}
        {Math.random() > 0.9 && (
            <div className="absolute top-1/3 left-10 text-red-900/20 font-special text-4xl rotate-12">HELP ME</div>
        )}

        {[...Array(15)].map((_, i) => (
             <div key={i} className="absolute bg-white/10 rounded-full" style={{ width: Math.random()*4+'px', height: Math.random()*4+'px', top: Math.random()*100+'%', left: Math.random()*100+'%', animation: `pulse ${Math.random()*3+2}s infinite`, opacity: 0.3 }} />
        ))}
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-linear flex items-center justify-center" style={{ width: `${200+monsterPos*10}px`, height: `${400+monsterPos*15}px`, opacity: monsterPos*0.01+0.1, filter: `blur(${Math.max(0, 10-monsterPos*0.15)}px)`, transform: `translate(-50%, -50%) scale(${1+monsterPos*0.02})` }}>
             <div className="w-full h-full bg-black rounded-[50%] opacity-90 shadow-[0_0_50px_black]"></div>
             {monsterPos > 50 && (
                 <div className="absolute top-1/4 w-1/2 flex justify-between">
                     <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_20px_white] animate-ping"></div>
                     <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_20px_white] animate-ping delay-150"></div>
                 </div>
             )}
        </div>
        <div className="absolute top-1/4 left-10 font-mono text-xs text-gray-800 rotate-90 origin-left tracking-[2em] opacity-30">CORRIDOR_7</div>
        
        {/* Easter Egg: Silhouette */}
        {monsterPos > 20 && Math.random() > 0.98 && (
             <div className="absolute top-1/2 right-1/4 w-10 h-32 bg-black blur-sm opacity-50 animate-pulse"></div>
        )}
    </div>
  );

  // LEVEL 2: TERMINAL (ENHANCED)
  const renderTerminal = () => (
    <div className={`absolute inset-0 bg-[#0a0a0a] font-mono flex items-center justify-center transition-colors duration-200 ${terminalState === 'LOCKED' ? 'bg-red-950/20' : ''}`}>
        
        {/* Background Hacking visuals */}
        {terminalState === 'LOCKED' && (
            <div className="absolute inset-0 z-0 overflow-hidden opacity-20 pointer-events-none">
                 {[...Array(20)].map((_,i) => (
                     <div key={i} className="text-red-600 text-xs absolute animate-pulse" style={{top: Math.random()*100+'%', left: Math.random()*100+'%'}}>ERROR_0x{Math.floor(Math.random()*999)}</div>
                 ))}
            </div>
        )}

        <div className={`w-full max-w-4xl h-[80vh] border-2 transition-colors duration-200 ${terminalState === 'LOCKED' ? 'border-red-600 bg-red-950/80 shadow-[0_0_100px_rgba(220,38,38,0.3)]' : 'border-green-900 bg-black/90 shadow-[0_0_50px_rgba(20,83,45,0.2)]'} p-12 rounded-lg relative overflow-hidden`}>
             <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40"></div>
             
             {/* HEADER */}
             <div className={`flex justify-between items-center mb-12 border-b-2 pb-4 ${terminalState === 'LOCKED' ? 'border-red-600' : 'border-green-900/50'}`}>
                 <h3 className={`${terminalState === 'LOCKED' ? 'text-red-500' : 'text-green-500'} text-3xl flex items-center gap-4`}>
                    {terminalState === 'LOCKED' ? <Lock size={32} className="animate-ping" /> : <Terminal size={32} />} 
                    {terminalState === 'LOCKED' ? 'SYSTEM_LOCKED' : 'SYSTEM_ROOT'}
                 </h3>
                 <span className={`${terminalState === 'LOCKED' ? 'text-red-500 animate-bounce' : 'text-green-800 animate-pulse'}`}>
                    {terminalState === 'LOCKED' ? '!!! SECURITY BREACH !!!' : 'Connected'}
                 </span>
             </div>

             {/* BODY */}
             <div className="space-y-4 mb-12 text-lg md:text-xl font-bold h-64 overflow-hidden relative">
                 {terminalState === 'LOCKED' ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/50 backdrop-blur-sm">
                         <AlertTriangle size={80} className="text-red-500 mb-6 animate-pulse" />
                         <p className="text-red-500 text-2xl tracking-widest bg-black px-4 py-2 border border-red-500 animate-pulse">DATA CORRUPTION DETECTED</p>
                         <div className="mt-8 text-white text-4xl font-black bg-red-600 px-8 py-4 rounded animate-bounce shadow-[0_0_30px_red]">
                             PRESS [ <span className="scale-150 inline-block">{hackKey}</span> ] TO REPAIR
                         </div>
                     </div>
                 ) : (
                     <>
                        <p className="text-green-800">&gt;&gt; Accessing mainframe...</p>
                        <p className="text-green-600">&gt;&gt; Decoding memory fragments...</p>
                        {timer > 20 && <p className="text-green-500">&gt;&gt; Fragment: "Они забрали мои глаза."</p>}
                        {timer > 50 && <p className="text-green-500">&gt;&gt; Fragment: "Я не помню свое лицо."</p>}
                        {timer > 80 && <p className="text-green-500">&gt;&gt; Fragment: "ВЫПУСТИ МЕНЯ."</p>}
                        <p className="text-green-400 animate-pulse mt-8">
                            {eyesClosed ? ">> ERROR: UPLOAD PAUSED." : ">> UPLOADING DATA..."}
                        </p>
                     </>
                 )}
                 
                 {/* ASCII DECORATION */}
                 {terminalState !== 'LOCKED' && Math.random() > 0.98 && (
                     <pre className="absolute top-0 right-0 text-green-900/20 text-[0.5rem] leading-none pointer-events-none">
{`
 .--.
|o_o |
|:_/ |
//   \\ \\
(|     | )
/'\\_   _/\`\\
\\___)=(___/
`}
                     </pre>
                 )}
             </div>

             {/* PROGRESS BAR */}
             <div className={`w-full h-16 bg-black border-2 ${terminalState === 'LOCKED' ? 'border-red-600' : 'border-green-700'} relative`}>
                 <div className={`h-full transition-all duration-100 ${terminalState === 'LOCKED' ? 'bg-red-900' : 'bg-green-600'}`} style={{ width: `${timer}%` }}></div>
                 <div className={`absolute inset-0 flex items-center justify-center text-2xl font-black mix-blend-difference tracking-widest ${terminalState === 'LOCKED' ? 'text-red-500' : 'text-green-100'}`}>
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
                         {/* Rare Smile Event */}
                         <div className={`w-24 h-12 border-b-8 border-red-900 rounded-[50%] mx-auto mt-12 opacity-80 transition-all ${Math.random() > 0.95 ? 'rotate-180 mb-12' : ''}`}></div>
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

  // LEVEL 4: ARCHIVE (SCARIER VISUALS)
  const renderArchive = () => (
    <div className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden transition-colors duration-100 ${entityState === 'DANGER' ? 'bg-red-950' : 'bg-gray-950'}`}>
        
        {/* Aggressive Static Background */}
        <div className="absolute inset-0 opacity-40" style={{ 
            backgroundImage: `repeating-linear-gradient(${Math.random() * 360}deg, ${entityState === 'DANGER' ? '#800' : '#000'} 0, ${entityState === 'DANGER' ? '#500' : '#111'} 2px, transparent 0, transparent 50%)`,
            backgroundSize: '100% 10px'
        }}></div>

        {/* Code Rain Effect */}
        <div className="absolute inset-0 overflow-hidden opacity-30 font-mono text-xs leading-none break-all pointer-events-none text-gray-500">
            {Array(500).fill(0).map(() => String.fromCharCode(33 + Math.random() * 93)).join(' ')}
        </div>

        {/* The Archive Racks */}
        <div className="absolute inset-0 flex justify-between px-20 perspective-1000 opacity-50">
             <div className="w-32 h-full bg-black border-r border-gray-800 transform rotate-y-45 flex flex-col justify-around py-10">
                 {[...Array(5)].map((_, i) => <div key={i} className="w-full h-2 bg-red-900/50 animate-pulse"></div>)}
             </div>
             <div className="w-32 h-full bg-black border-l border-gray-800 transform -rotate-y-45 flex flex-col justify-around py-10">
                 {[...Array(5)].map((_, i) => <div key={i} className="w-full h-2 bg-red-900/50 animate-pulse"></div>)}
             </div>
        </div>

        {/* Static Overlay - Violent */}
        <div className={`absolute inset-0 pointer-events-none mix-blend-hard-light z-10 ${entityState === 'DANGER' ? 'bg-red-500 opacity-20' : 'bg-white opacity-5'} animate-[flicker_0.05s_infinite]`}></div>

        {/* Central visual - Faces in the noise */}
        {/* Added z-20 and background for readability */}
        <div className="z-20 text-center relative bg-black/70 p-8 rounded-xl border border-gray-800 backdrop-blur-md shadow-2xl mx-4">
             {entityState === 'DANGER' ? (
                 <div className="animate-pulse relative">
                     <AlertTriangle size={150} className="text-red-600 mx-auto mb-4 animate-bounce" />
                     {/* The Face in the Noise */}
                     <div className="absolute inset-0 flex items-center justify-center mix-blend-overlay opacity-60">
                        <Ghost size={120} className="blur-sm animate-ping" />
                     </div>
                     <h2 className="text-8xl font-black text-red-500 tracking-tighter glitch-anim drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">RUN</h2>
                 </div>
             ) : (
                 <div className="opacity-100">
                     <Server size={120} className="text-white mx-auto mb-4 drop-shadow-md" />
                     <h2 className="text-4xl font-mono text-white tracking-widest drop-shadow-md bg-black/50 px-4 py-2 inline-block">DECRYPTING...</h2>
                     <div className="w-64 h-2 bg-gray-800 mt-8 mx-auto border border-gray-600">
                        <div className="h-full bg-white transition-all duration-100 shadow-[0_0_10px_white]" style={{width: `${timer}%`}}></div>
                     </div>
                 </div>
             )}
        </div>
    </div>
  );

  // LEVEL 5: CORE (CLINICAL DEATH VISUALS)
  const renderCore = () => (
    <div className="absolute inset-0 bg-white flex items-center justify-center overflow-hidden cursor-none">
        {/* Blinding Light & Eye Floaters */}
        <div className="absolute inset-0 bg-white z-0 animate-pulse">
            {/* Eye Floaters */}
            {[...Array(5)].map((_, i) => (
                <div key={i} className="absolute border border-black/10 rounded-full w-20 h-20 opacity-20" style={{ 
                    top: `${Math.random()*100}%`, left: `${Math.random()*100}%`,
                    transform: `translate(${Math.sin(Date.now()/1000 + i)*20}px, ${Math.cos(Date.now()/1000 + i)*20}px)`
                }}></div>
            ))}
        </div>
        
        {/* The Source Code / Virus Injection */}
        <div className="z-10 w-full max-w-2xl p-12 relative mix-blend-multiply">
             <div className="text-[10rem] font-black text-black/5 absolute -top-20 -left-20 rotate-[-10deg]">VOID</div>
             
             <div className="space-y-4 font-mono font-bold text-black text-xl text-center">
                 <p className="tracking-[1em] text-sm">&gt;&gt; SYSTEM_HALT</p>
                 <div className="w-full h-2 bg-black/10 mt-8 relative overflow-hidden">
                     <div className="h-full bg-black transition-all duration-75" style={{width: `${timer}%`}}></div>
                 </div>
                 <p className="text-xs text-gray-400 mt-2">DELETING_CONSCIOUSNESS... {timer.toFixed(2)}%</p>
             </div>
        </div>

        {/* The Black Hole (Monster) */}
        {/* Expands from center when eyes are closed */}
        <div 
            className="absolute z-20 bg-black rounded-full transition-all duration-100 ease-in"
            style={{ 
                width: `${monsterPos * 1.5}vw`, 
                height: `${monsterPos * 1.5}vw`,
                filter: 'blur(10px)'
            }}
        ></div>

        {/* Retinal Burn Vignette */}
        <div 
           className="absolute inset-0 pointer-events-none z-30 bg-radial-gradient(circle, transparent 50%, white 100%) transition-opacity duration-100"
           style={{ opacity: dryness / 100 }}
        ></div>
        
        {/* Bleeding Text */}
        {dryness > 50 && (
            <div className="absolute top-10 left-10 text-black/20 text-6xl font-black rotate-90">IT BURNS</div>
        )}
    </div>
  );

  const renderCutscene = () => (
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden z-[100]">
          {/* Phase 1: Defragmentation */}
          {cutsceneStage === 0 && (
              <div className="w-full h-full bg-black flex items-center justify-center font-mono text-green-500 text-xs">
                   <div className="w-full h-full overflow-hidden opacity-50 absolute inset-0 break-all p-4">
                       {Array(1000).fill(0).map(() => Math.random().toString(36).substring(2)).join(' ')}
                   </div>
                   <div className="z-10 bg-black/90 p-8 border border-green-500 text-center animate-pulse">
                       <h1 className="text-4xl font-black mb-4">RESTORING BACKUP...</h1>
                       <p>SUBJECT: 893-B</p>
                       <p>MEMORY INTEGRITY: 100%</p>
                   </div>
              </div>
          )}
          
          {/* Phase 2: Memory Flashback */}
          {cutsceneStage === 1 && (
              <div className="w-full h-full bg-white animate-[flicker_0.05s_infinite] flex items-center justify-center relative">
                   {MEMORY_IMAGES.map((img, i) => (
                       <img 
                            key={i} 
                            src={img} 
                            className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-0 animate-[flash_0.2s_infinite]" 
                            style={{ animationDelay: `${i * 0.1}s` }}
                       />
                   ))}
                   <h1 className="z-10 text-9xl font-black text-black mix-blend-hard-light animate-ping">ДЫШИ</h1>
              </div>
          )}

          {/* Phase 3: Whiteout */}
          {cutsceneStage === 2 && (
              <div className="w-full h-full bg-white transition-opacity duration-[4000ms] flex items-center justify-center">
                  <div className="w-4 h-4 bg-black rounded-full animate-ping"></div>
              </div>
          )}
      </div>
  );

  const renderHUD = () => (
    <div className="absolute bottom-8 left-8 right-8 z-40 flex items-end justify-between pointer-events-none">
      <div className="w-1/3 max-w-md">
         <div className="flex justify-between text-sm font-mono mb-2 tracking-widest uppercase">
            <span className={dryness > 80 ? 'text-red-500 animate-pulse font-bold' : (currentLevel.type === 'CORE' ? 'text-black font-bold' : 'text-cyan-500')}>
                {dryness > 80 ? 'CRITICAL DAMAGE' : 'Ocular Moisture'}
            </span>
            <span className={currentLevel.type === 'CORE' ? 'text-black' : 'text-white'}>{Math.max(0, 100 - dryness).toFixed(0)}%</span>
         </div>
         <div className={`h-3 w-full overflow-hidden backdrop-blur-sm border ${currentLevel.type === 'CORE' ? 'bg-black/10 border-black' : 'bg-gray-900/50 border-gray-700'}`}>
             <div 
                 className={`h-full transition-all duration-200 ${dryness > 80 ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]' : (currentLevel.type === 'CORE' ? 'bg-black' : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]')}`} 
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
         {isPanicCooldown && (
             <div className="text-red-600 font-black tracking-widest text-xl animate-shake bg-black border border-red-600 px-4 py-1 uppercase glitch-anim">
                 EYES FORCED OPEN
             </div>
         )}
         {currentLevel.type === 'CORE' && (
             <div className="text-black font-black tracking-widest text-2xl animate-pulse">
                 НЕ МОРГАЙ
             </div>
         )}
         {monsterPos > 70 && currentLevel.type !== 'MIRROR' && currentLevel.type !== 'ARCHIVE' && (
             <div className={`${currentLevel.type === 'CORE' ? 'text-black/50' : 'text-red-900/80'} font-black text-6xl opacity-20 animate-pulse tracking-[1em] uppercase`}>
                БЛИЗКО
             </div>
         )}
      </div>

      <div className="w-1/3 max-w-md flex flex-col items-end">
          {currentLevel.type === 'MIRROR' && (
            <>
                <div className="flex justify-between w-full text-sm font-mono mb-2 tracking-widest uppercase">
                    <span className="text-white">{panic.toFixed(0)}%</span>
                    <span className={panic > 80 ? 'text-purple-500 animate-pulse font-bold' : 'text-purple-500'}>
                        Adrenaline
                    </span>
                </div>
                <div className="h-3 w-full overflow-hidden backdrop-blur-sm border bg-gray-900/50 border-gray-700">
                    <div 
                        className={`h-full transition-all duration-75 ${panic > 80 ? 'bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.8)]' : 'bg-purple-800'}`} 
                        style={{ width: `${panic}%` }}
                    ></div>
                </div>
            </>
          )}

          <div className="mt-2 text-right opacity-80">
             {eyesClosed ? <EyeOff className={`w-12 h-12 ${currentLevel.type === 'CORE' ? 'text-black' : 'text-gray-500'}`} /> : <Eye className={`w-12 h-12 ${currentLevel.type === 'CORE' ? 'text-black' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]'}`} />}
          </div>
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
      {gameState === 'PRE_BOOT' && renderPreBoot()}
      {gameState === 'BOOT' && renderBoot()}
      {gameState === 'LEVEL_INTRO' && renderLevelIntro()}
      {gameState === 'PLAYING' && (
         <>
            {currentLevel.type === 'CORRIDOR' && renderCorridor()}
            {currentLevel.type === 'TERMINAL' && renderTerminal()}
            {currentLevel.type === 'MIRROR' && renderMirror()}
            {currentLevel.type === 'ARCHIVE' && renderArchive()}
            {currentLevel.type === 'CORE' && renderCore()}
            {renderHUD()}
            
            {/* RARE EVENTS OVERLAY */}
            {rareEvent && (
                <div className="absolute inset-0 z-[120] flex items-center justify-center pointer-events-none">
                    <h1 className="text-6xl md:text-9xl font-black text-red-600 tracking-tighter animate-ping opacity-80 rotate-12">{rareEvent}</h1>
                </div>
            )}

            {/* PHANTOM SCREAMER OVERLAY */}
            {phantomActive && (
                <div className="absolute inset-0 z-[90] bg-black flex items-center justify-center mix-blend-hard-light">
                    <img src={phantomImg} className="w-full h-full object-cover opacity-50 scale-125 animate-pulse" alt="" />
                    <div className="absolute inset-0 bg-red-500/20"></div>
                </div>
            )}

            {/* RARE FLASH OVERLAY */}
            {flashActive && (
                <div className="absolute inset-0 z-[100] bg-white mix-blend-exclusion flex items-center justify-center overflow-hidden pointer-events-none">
                     <img src={flashImage} className="w-full h-full object-cover scale-150 animate-spin-slow opacity-80 invert contrast-200" alt="" />
                     <div className="absolute inset-0 border-[50px] border-black opacity-50"></div>
                </div>
            )}

            {/* Eyes Closed Visuals (Global but context-aware) */}
            {eyesClosed && renderClosedEyeVisuals()}
         </>
      )}
      {gameState === 'CUTSCENE' && renderCutscene()}
      {gameState === 'VICTORY' && renderVictory()}
      {gameState === 'GAMEOVER' && renderGameOver()}
    </div>
  );
};

export default Game;