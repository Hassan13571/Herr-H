
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Peer } from 'peerjs';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { GameState, ClientState, Difficulty, QuizSession, Question, Player, NetworkMessage, ChatMessage, Theme, Language } from './types';
import { generateQuizQuestions, generateTopicSuggestions, generateQuizCover, fetchDailyNews } from './services/geminiService';
import { Button } from './components/Button';
import { Triangle, Diamond, Circle, Square, Sparkles } from './components/Shapes';

// --- Constants ---
const AVATARS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🦄", "🐝", "🐞", "🦖", "👻", "🤖", "👽", "💩", "🤡", "🤠", "🎃"];
const REACTION_EMOJIS = ["❤️", "😂", "😮", "🎉", "🔥", "💩"];
const PEER_ID_PREFIX = "herr-raza-game-";
const STORAGE_KEY_PROFILE = 'herr-raza-player-profile';
const STORAGE_KEY_SETTINGS = 'herr-raza-settings';

// --- TRANSLATIONS ---
const TEXTS = {
  DE: {
    welcome: "Willkommen", createQuiz: "Quiz erstellen", joinQuiz: "Beitreten", localGame: "Lokales Spiel", localDesc: "Ein Gerät (Pass-and-Play)",
    hostOnline: "Online Host", join: "Beitreten", topic: "THEMA", topicPlaceholder: "z.B. Harry Potter...",
    expertFocus: "EXPERTEN-FOKUS (OPTIONAL)", expertPlaceholder: "z.B. 'Erkläre es für 5-Jährige'...",
    liveData: "LIVE DATEN / WEB-SUCHE", liveDesc: "AKTUELLE NEWS & FAKTEN", difficulty: "SCHWIERIGKEIT",
    questionCount: "ANZAHL FRAGEN", players: "SPIELER", addPlayer: "Name...", startGame: "Spiel Starten 🚀",
    lobbyWait: "Warte auf Spieler...", nextRound: "Nächste Runde", ready: "Bereit!", pressSpace: "Leertaste zum Starten",
    question: "Frage", answers: "Antworten", skip: "Überspringen ⏩", correct: "PERFEKT!", wrong: "Schade...",
    points: "Punkte", noPoints: "Keine Punkte", correctWas: "Die richtige Antwort war", continue: "Weiter geht's (Leertaste)",
    leaderboard: "RANGLISTE", showLeaderboard: "Rangliste anzeigen", podium: "SIEGEREHRUNG", downloadPdf: "📄 PDF Speichern",
    newGame: "🔄 Neues Spiel", joinGame: "Spiel beitreten", connect: "Verbinden", back: "Zurück",
    createProfile: "Profil erstellen", yourName: "Dein Name", letsGo: "Los geht's!", youAreIn: "Du bist drin!",
    waitHost: "Sieh auf den großen Bildschirm", sent: "Gesendet!", goodLuck: "Viel Glück...", rank: "Platz",
    result: "Ergebnis", home: "Startseite", testPlayer: "📱 Test-Spieler", loading: "Laden...",
    generating: "Generiere Quiz & Bilder...", joker: "JOKER 50/50", news: "📰 News Ticker",
    newsLoading: "Lade Nachrichten...", newsTitle: "BREAKING NEWS",
    musicSettings: "Musik Einstellungen", volume: "Lautstärke", track: "Titel"
  },
  EN: {
    welcome: "Welcome", createQuiz: "Create Quiz", joinQuiz: "Join Quiz", localGame: "Local Game", localDesc: "One Device (Pass-and-Play)",
    hostOnline: "Online Host", join: "Join", topic: "TOPIC", topicPlaceholder: "e.g. Harry Potter...",
    expertFocus: "EXPERT FOCUS (OPTIONAL)", expertPlaceholder: "e.g. 'Explain like I'm 5'...",
    liveData: "LIVE DATA / WEB SEARCH", liveDesc: "CURRENT NEWS & FACTS", difficulty: "DIFFICULTY",
    questionCount: "QUESTION COUNT", players: "PLAYERS", addPlayer: "Name...", startGame: "Start Game 🚀",
    lobbyWait: "Waiting for players...", nextRound: "Next Round", ready: "Ready!", pressSpace: "Press Space to Start",
    question: "Question", answers: "Answers", skip: "Skip ⏩", correct: "PERFECT!", wrong: "Too bad...",
    points: "Points", noPoints: "No Points", correctWas: "The correct answer was", continue: "Continue (Space)",
    leaderboard: "LEADERBOARD", showLeaderboard: "Show Leaderboard", podium: "PODIUM", downloadPdf: "📄 Save PDF",
    newGame: "🔄 New Game", joinGame: "Join Game", connect: "Connect", back: "Back",
    createProfile: "Create Profile", yourName: "Your Name", letsGo: "Let's Go!", youAreIn: "You're in!",
    waitHost: "Look at the big screen", sent: "Sent!", goodLuck: "Good luck...", rank: "Rank",
    result: "Result", home: "Home", testPlayer: "📱 Test Player", loading: "Loading...",
    generating: "Generating Quiz & Images...", joker: "JOKER 50/50", news: "📰 News Ticker",
    newsLoading: "Loading News...", newsTitle: "BREAKING NEWS",
    musicSettings: "Music Settings", volume: "Volume", track: "Track"
  }
};

// --- THEMES ---
const THEMES: { [key: string]: Theme } = {
  default: { id: 'default', name: 'Cosmic Purple', gradient: 'from-[#1a0b2e] via-[#2d1b4e] to-[#0f0518]', primary: 'bg-purple-600', secondary: 'bg-purple-900', gridColor: 'rgba(168, 85, 247, 0.1)', accentText: 'from-purple-400 to-pink-600' },
  ocean: { id: 'ocean', name: 'Deep Ocean', gradient: 'from-[#0f172a] via-[#1e3a8a] to-[#020617]', primary: 'bg-blue-600', secondary: 'bg-blue-900', gridColor: 'rgba(56, 189, 248, 0.1)', accentText: 'from-cyan-400 to-blue-600' },
  matrix: { id: 'matrix', name: 'The Matrix', gradient: 'from-[#022c22] via-[#064e3b] to-[#000000]', primary: 'bg-emerald-600', secondary: 'bg-emerald-900', gridColor: 'rgba(34, 197, 94, 0.1)', accentText: 'from-green-400 to-emerald-600' },
  sunset: { id: 'sunset', name: 'Sunset Drive', gradient: 'from-[#4a044e] via-[#9a3412] to-[#450a0a]', primary: 'bg-orange-600', secondary: 'bg-orange-900', gridColor: 'rgba(251, 146, 60, 0.1)', accentText: 'from-orange-400 to-rose-600' },
  neon: { id: 'neon', name: 'Neon City', gradient: 'from-[#2a0a18] via-[#1e1b4b] to-[#0a182a]', primary: 'bg-fuchsia-600', secondary: 'bg-indigo-900', gridColor: 'rgba(232, 121, 249, 0.15)', accentText: 'from-fuchsia-400 to-cyan-400' },
  midas: { id: 'midas', name: 'Midas Gold', gradient: 'from-[#0c0a09] via-[#1c1917] to-[#000000]', primary: 'bg-yellow-600', secondary: 'bg-stone-800', gridColor: 'rgba(234, 179, 8, 0.15)', accentText: 'from-yellow-200 via-yellow-400 to-amber-600' },
  aurora: { id: 'aurora', name: 'Northern Lights', gradient: 'from-[#022c22] via-[#0f172a] to-[#111827]', primary: 'bg-teal-500', secondary: 'bg-teal-900', gridColor: 'rgba(45, 212, 191, 0.15)', accentText: 'from-teal-300 to-emerald-400' }
};

// --- Helper Functions ---

const loadProfile = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (stored) {
        const parsed = JSON.parse(stored);
        if (!AVATARS.includes(parsed.avatar)) parsed.avatar = AVATARS[0];
        return parsed;
    }
  } catch (e) {}
  return { name: '', avatar: AVATARS[0] };
};

const saveProfile = (name: string, avatar: string) => {
    try {
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify({ name, avatar }));
    } catch (e) {}
};

const loadSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (stored) {
        return JSON.parse(stored);
    }
  } catch(e) {}
  return { lang: 'DE', themeId: 'default' };
};

const saveSettings = (lang: Language, themeId: string) => {
    try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({ lang, themeId }));
    } catch(e) {}
};

// --- TEXT TO SPEECH ---
const speakText = (text: string, lang: Language) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'DE' ? 'de-DE' : 'en-US';
    utterance.rate = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(lang === 'DE' ? 'de' : 'en') && !v.name.includes('Google'));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
};

// --- AUDIO ENGINE ---
const createAudioContext = () => new (window.AudioContext || (window as any).webkitAudioContext)();
const playSoundEffect = (type: 'SUCCESS' | 'FAIL' | 'AIRHORN' | 'DRUMROLL' | 'APPLAUSE') => {
    try {
        const ctx = createAudioContext();
        const now = ctx.currentTime;
        if (type === 'SUCCESS') {
            [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, i) => {
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.type = 'triangle'; osc.frequency.value = f; osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now + i*0.05); gain.gain.setValueAtTime(0, now + i*0.05); gain.gain.linearRampToValueAtTime(0.1, now + i*0.05 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i*0.05 + 0.5); osc.stop(now + i*0.05 + 0.5);
            });
        }
        else if (type === 'FAIL') {
            const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(100, now + 0.5); osc.connect(gain); gain.connect(ctx.destination); gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.5); osc.start(now); osc.stop(now + 0.5);
        }
        else if (type === 'AIRHORN') {
             const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, now); osc.frequency.linearRampToValueAtTime(400, now + 0.2); osc.connect(gain); gain.connect(ctx.destination); gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0, now + 0.4); osc.start(now); osc.stop(now + 0.4);
             setTimeout(() => { const ctx2 = createAudioContext(); const osc2 = ctx2.createOscillator(); const gain2 = ctx2.createGain(); osc2.type = 'sawtooth'; osc2.frequency.setValueAtTime(800, ctx2.currentTime); osc2.frequency.linearRampToValueAtTime(400, ctx2.currentTime + 0.2); osc2.connect(gain2); gain2.connect(ctx2.destination); gain2.gain.setValueAtTime(0.3, ctx2.currentTime); gain2.gain.linearRampToValueAtTime(0, ctx2.currentTime + 0.4); osc2.start(ctx2.currentTime); osc2.stop(ctx2.currentTime + 0.4); }, 150);
        }
        else if (type === 'DRUMROLL') {
            const bufferSize = ctx.sampleRate * 2; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; } const noise = ctx.createBufferSource(); noise.buffer = buffer; const gain = ctx.createGain(); const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 200; noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination); const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 15; const lfoGain = ctx.createGain(); lfoGain.gain.value = 1000; lfo.connect(lfoGain); gain.gain.setValueAtTime(0.5, now); gain.gain.linearRampToValueAtTime(0, now + 2); noise.start(now); noise.stop(now + 2);
        }
        else if (type === 'APPLAUSE') {
            const bufferSize = ctx.sampleRate * 3; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) { data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.5)); } const noise = ctx.createBufferSource(); noise.buffer = buffer; const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1000; const gain = ctx.createGain(); gain.gain.value = 0.5; noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination); noise.start(now);
        }
    } catch (e) { console.error(e); }
};

// --- KEYBOARD HOOK ---
const useKeyboardControls = (
    gameState: GameState | ClientState, 
    onAnswer: (idx: number) => void, 
    onNext: () => void,
    onFullscreen: () => void
) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'f') {
                e.preventDefault();
                onFullscreen();
            }

            if (gameState === GameState.PLAYING || gameState === ClientState.PLAYING) {
                if (['1', '2', '3', '4'].includes(e.key)) {
                    onAnswer(parseInt(e.key) - 1);
                }
            }
            if (e.code === 'Space' || e.key === 'Enter') {
                if (gameState === GameState.FEEDBACK || gameState === GameState.LEADERBOARD) {
                    onNext();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, onAnswer, onNext, onFullscreen]);
};

// --- UI COMPONENTS ---
const NewsTicker = ({ headlines, lang }: { headlines: string[], lang: Language }) => {
    const t = TEXTS[lang]; if(headlines.length===0) return null;
    return (<div className="fixed bottom-0 left-0 w-full bg-red-600 text-white z-50 overflow-hidden py-1 border-t-2 border-white/20 shadow-2xl group hover:cursor-pointer"><div className="flex items-center"><div className="bg-red-800 px-4 py-1 font-black text-xs md:text-sm uppercase tracking-widest z-20 shadow-xl whitespace-nowrap">{t.newsTitle}</div><div className="flex whitespace-nowrap overflow-hidden w-full relative"><div className="animate-marquee flex gap-12 font-bold text-sm md:text-base uppercase tracking-wide group-hover:paused">{headlines.map((h,i)=><span key={i} className="flex items-center gap-2"><span className="w-2 h-2 bg-white rounded-full inline-block animate-pulse"></span>{h}</span>)}{headlines.map((h,i)=><span key={i+'d'} className="flex items-center gap-2"><span className="w-2 h-2 bg-white rounded-full inline-block animate-pulse"></span>{h}</span>)}</div></div></div></div>);
};

const ChatOverlay = ({ messages, onSendMessage, onDeleteMessage, currentUserId, isHost = false, lang }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isOpen]);
    const handleSend = () => { if (!inputText.trim()) return; onSendMessage(inputText); setInputText(''); };
    return (
        <div className="fixed bottom-24 left-4 z-40 pointer-events-auto">
             {!isOpen && <button onClick={() => setIsOpen(true)} className="relative w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-white text-2xl border-2 border-white/20">💬{messages.length > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">{messages.length}</div>}</button>}
             {isOpen && (
                 <div className="bg-black/80 backdrop-blur-xl border border-white/10 w-80 md:w-96 rounded-2xl flex flex-col shadow-2xl animate-pop origin-bottom-left" style={{ height: '400px' }}>
                     <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl"><span className="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-2">💬 Live Chat {isHost && <span className="bg-red-500 text-[10px] px-2 py-0.5 rounded-full">MOD</span>}</span><button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">✕</button></div>
                     <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">{messages.length === 0 && <div className="text-white/30 text-center text-sm italic mt-10">{lang === 'DE' ? "Sag Hallo! 👋" : "Say Hello! 👋"}</div>}{messages.map((msg: any) => { const isMe = msg.senderId === currentUserId; const isSystem = msg.senderId === 'system'; return (<div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>{!isSystem && <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm border border-white/10 flex-shrink-0">{msg.senderAvatar}</div>}<div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>{!isSystem && <div className="flex items-center gap-1 mb-1"><span className="text-[10px] font-bold text-white/50">{msg.senderName}</span>{isHost && !isMe && !isSystem && <button onClick={() => onDeleteMessage && onDeleteMessage(msg.id)} className="text-[10px] text-red-400 hover:text-red-200 ml-1">🗑️</button>}</div>}<div className={`px-3 py-2 rounded-xl text-sm break-words ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : isSystem ? 'bg-white/5 text-yellow-300 italic text-center w-full' : 'bg-white/10 text-white rounded-tl-none'}`}>{msg.text}</div></div></div>); })}</div>
                     <div className="p-3 border-t border-white/10 bg-white/5 rounded-b-2xl"><div className="flex gap-2"><input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="..." className="flex-1 bg-black/20 border border-white/10 rounded-full px-4 py-2 text-white text-sm outline-none focus:border-blue-500" maxLength={100} /><button onClick={handleSend} disabled={!inputText.trim()} className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 disabled:opacity-50">➤</button></div></div>
                 </div>
             )}
        </div>
    );
};

// --- SOUNDBOARD ---
const Soundboard = () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={`fixed bottom-4 left-4 z-50 transition-all ${isOpen ? 'w-auto' : 'w-12 h-12'}`}>
            {!isOpen && <button onClick={() => setIsOpen(true)} className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-2xl hover:scale-110 transition-transform shadow-lg" title="DJ Soundboard">🔊</button>}
            {isOpen && (
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-pop">
                    <div className="flex justify-between items-center mb-3"><span className="text-xs font-bold text-white/50 uppercase tracking-widest">DJ Pult</span><button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">✕</button></div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => playSoundEffect('AIRHORN')} className="bg-red-500/20 hover:bg-red-500/50 border border-red-500/50 text-white p-3 rounded-lg flex flex-col items-center gap-1 transition-all active:scale-95"><span className="text-2xl">📢</span><span className="text-[10px] font-bold uppercase">Airhorn</span></button>
                        <button onClick={() => playSoundEffect('APPLAUSE')} className="bg-green-500/20 hover:bg-green-500/50 border border-green-500/50 text-white p-3 rounded-lg flex flex-col items-center gap-1 transition-all active:scale-95"><span className="text-2xl">👏</span><span className="text-[10px] font-bold uppercase">Applaus</span></button>
                        <button onClick={() => playSoundEffect('DRUMROLL')} className="bg-yellow-500/20 hover:bg-yellow-500/50 border border-yellow-500/50 text-white p-3 rounded-lg flex flex-col items-center gap-1 transition-all active:scale-95"><span className="text-2xl">🥁</span><span className="text-[10px] font-bold uppercase">Trommel</span></button>
                        <button onClick={() => playSoundEffect('FAIL')} className="bg-blue-500/20 hover:bg-blue-500/50 border border-blue-500/50 text-white p-3 rounded-lg flex flex-col items-center gap-1 transition-all active:scale-95"><span className="text-2xl">🤡</span><span className="text-[10px] font-bold uppercase">Fail</span></button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface FloatingEmoji { id: string; emoji: string; x: number; duration: number; }
const FloatingReactions = ({ emojis }: { emojis: FloatingEmoji[] }) => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">{emojis.map((e) => (<div key={e.id} className="absolute text-4xl animate-float-up" style={{ left: `${e.x}%`, bottom: '-50px', animationDuration: `${e.duration}s` }}>{e.emoji}</div>))} <style>{`@keyframes float-up { 0% { transform: translateY(0) scale(0.5); opacity: 0; } 10% { opacity: 1; transform: translateY(-50px) scale(1.2); } 100% { transform: translateY(-120vh) scale(1); opacity: 0; } } .animate-float-up { animation-name: float-up; animation-timing-function: ease-out; animation-fill-mode: forwards; }`}</style></div>
);

const BackgroundMusic = ({ playing, volume = 0.5, track = 'COSMIC' }: any) => {
    const ctxRef = useRef<AudioContext | null>(null);
    const gainRef = useRef<GainNode | null>(null);
    const nodesRef = useRef<any[]>([]);

    useEffect(() => {
        if (!playing) return;
        const cleanup = () => {
             nodesRef.current.forEach(n => { try { n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} });
             nodesRef.current = [];
             if (ctxRef.current && ctxRef.current.state !== 'closed') { ctxRef.current.close(); }
             ctxRef.current = null;
        };
        try {
             const AC = window.AudioContext || (window as any).webkitAudioContext;
             if (!AC) return;
             const ctx = new AC();
             ctxRef.current = ctx;
             const masterGain = ctx.createGain();
             masterGain.gain.setValueAtTime(volume * 0.05, ctx.currentTime);
             masterGain.connect(ctx.destination);
             gainRef.current = masterGain;

             if (track === 'COSMIC') {
                 const osc = ctx.createOscillator();
                 const filter = ctx.createBiquadFilter();
                 osc.type = 'sawtooth';
                 osc.frequency.setValueAtTime(55, ctx.currentTime);
                 filter.type = 'lowpass';
                 filter.frequency.setValueAtTime(200, ctx.currentTime);
                 const lfo = ctx.createOscillator(); lfo.frequency.value = 0.1; const lfoGain = ctx.createGain(); lfoGain.gain.value = 50;
                 lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start();
                 osc.connect(filter); filter.connect(masterGain); osc.start();
                 nodesRef.current.push(osc, lfo, lfoGain, filter);
             } else if (track === 'ZEN') {
                 const osc1 = ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.setValueAtTime(200, ctx.currentTime);
                 const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.setValueAtTime(202, ctx.currentTime);
                 const g = ctx.createGain(); g.gain.value = 0.5;
                 osc1.connect(g); osc2.connect(g); g.connect(masterGain);
                 osc1.start(); osc2.start();
                 nodesRef.current.push(osc1, osc2, g);
             } else if (track === 'ACTION') {
                  const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(40, ctx.currentTime);
                  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(120, ctx.currentTime);
                  const lfo = ctx.createOscillator(); lfo.frequency.value = 4; // fast pulsing
                  const lfoG = ctx.createGain(); lfoG.gain.value = 20;
                  lfo.connect(lfoG); lfoG.connect(filter.frequency); lfo.start();
                  osc.connect(filter); filter.connect(masterGain); osc.start();
                  nodesRef.current.push(osc, filter, lfo, lfoG);
             }
        } catch (e) { console.error(e); }
        return cleanup;
    }, [playing, track]);

    useEffect(() => {
        if (gainRef.current && ctxRef.current) {
            gainRef.current.gain.setTargetAtTime(volume * 0.05, ctxRef.current.currentTime, 0.1);
        }
    }, [volume]);

    return null;
};

const MusicControlWidget = ({ playing, onToggle, volume, onVolumeChange, track, onTrackChange, allowReactions, onToggleReactions, showReactionsToggle, lang }: any) => {
    const [expanded, setExpanded] = useState(false);
    const t = TEXTS[lang];
    return (
        <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
            <div className="flex gap-2">
                 {showReactionsToggle && onToggleReactions && (
                      <button onClick={onToggleReactions} className={`p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg transition-all ${allowReactions ? 'bg-green-500/20 ring-2 ring-green-500' : 'bg-red-500/20 ring-2 ring-red-500 opacity-50'}`} title="Reaktionen">
                          {allowReactions ? '😍' : '🚫'}
                      </button>
                 )}
                 <button onClick={onToggle} className={`p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg transition-all ${playing ? 'scale-110 ring-2 ring-purple-500' : ''}`}>
                    {playing ? '🔊' : '🔇'}
                 </button>
                 <button onClick={() => setExpanded(!expanded)} className={`p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg ${expanded ? 'bg-white/20' : ''}`}>
                    ⚙️
                 </button>
            </div>
            {expanded && (
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl animate-pop w-64 origin-top-right">
                    <div className="mb-4">
                        <label className="text-xs font-bold text-white/50 uppercase block mb-2">{t.volume}</label>
                        <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => onVolumeChange(parseFloat(e.target.value))} className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase block mb-2">{t.track}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['COSMIC', 'ZEN', 'ACTION'].map(tr => (
                                <button key={tr} onClick={() => onTrackChange(tr)} className={`text-[10px] font-bold py-2 rounded-lg border transition-colors ${track === tr ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/20 hover:bg-white/10'}`}>
                                    {tr}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <BackgroundMusic playing={playing} volume={volume} track={track} />
        </div>
    );
};

const generateShortId = () => Math.floor(100000 + Math.random() * 900000).toString();
const formatGameId = (id: string) => { const num = id.replace(PEER_ID_PREFIX, ''); return num.length === 6 ? `${num.substring(0,3)} ${num.substring(3)}` : num; };
const calculateScore = (timeLeft: number, totalTime: number, streak: number) => 1000 + Math.ceil((timeLeft / totalTime) * 500) + (streak * 100);

// --- DYNAMIC BACKGROUND ---
const DynamicBackground = ({ theme }: { theme: Theme }) => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} animate-gradient-xy transition-colors duration-1000`}></div>
        <div className="absolute inset-0 opacity-20 perspective-500">
            <div className="absolute inset-[-100%] bg-grid animate-grid-flow w-[300%] h-[300%] origin-top" style={{ backgroundImage: `linear-gradient(to right, ${theme.gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${theme.gridColor} 1px, transparent 1px)` }}></div>
        </div>
        <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-white/10 rounded-full blur-[100px] opacity-30 animate-float"></div>
        <div className="absolute bottom-[20%] right-[20%] w-80 h-80 bg-white/10 rounded-full blur-[100px] opacity-30 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="star w-[200px]" style={{top: '10%', left: '80%', animationDelay: '0s'}}></div>
        <div className="star w-[150px]" style={{top: '30%', left: '10%', animationDelay: '3s'}}></div>
    </div>
);

// --- Components ---
const Layout: React.FC<{ children?: React.ReactNode; className?: string, showHeader?: boolean, theme?: Theme, isEmbedded?: boolean }> = ({ children, className = "", showHeader = true, theme = THEMES.default, isEmbedded = false }) => {
    const toggleFullscreen = () => {
        const doc = window.document as any; const docEl = doc.documentElement as any;
        const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
        if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) { if (requestFullScreen) requestFullScreen.call(docEl); } else { if (cancelFullScreen) cancelFullScreen.call(doc); }
    };
    return (
        <div className={`${isEmbedded ? 'h-full absolute inset-0' : 'fixed inset-0'} flex flex-col overflow-hidden bg-black ${className}`}>
            <DynamicBackground theme={theme} />
            {showHeader && (
                <header className="glass text-white p-4 shadow-lg flex justify-between items-center z-10 relative shrink-0">
                <div className="flex items-center gap-2 select-none cursor-pointer group" onClick={() => window.location.href = window.location.origin}>
                    <div className="w-10 h-10 bg-white rounded-lg rotate-12 group-hover:rotate-0 transition-transform flex items-center justify-center shadow-lg"><span className={`font-display font-black -rotate-12 group-hover:rotate-0 transition-transform text-2xl text-transparent bg-clip-text bg-gradient-to-br ${theme.accentText}`}>R</span></div>
                    <h1 className="font-display text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 drop-shadow-sm">Herr Raza</h1>
                </div>
                {!isEmbedded && <button onClick={toggleFullscreen} className="p-2 text-white/50 hover:text-white transition-colors" title="Vollbild (F)">⛶</button>}
                </header>
            )}
            <main className="flex-1 w-full relative overflow-y-auto z-10 overscroll-contain scroll-smooth">
                <div className="flex flex-col min-h-full w-full pb-64">{children}</div>
            </main>
        </div>
    );
};

const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  let colorClass = 'bg-gradient-to-r from-purple-500 to-pink-500';
  if (percentage < 30) colorClass = 'bg-gradient-to-r from-red-500 to-orange-500'; else if (percentage < 60) colorClass = 'bg-gradient-to-r from-yellow-400 to-orange-400';
  return (<div className="w-full h-4 bg-gray-800/50 rounded-full overflow-hidden border border-white/10 backdrop-blur-sm shadow-inner"><div className={`h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.5)] ${colorClass}`} style={{ width: `${percentage}%` }} /></div>);
};

const LocalhostWarning = () => { const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'; if (!isLocalhost) return null; return (<div className="bg-yellow-500/90 text-black px-4 py-2 text-sm font-bold text-center backdrop-blur-md">⚠️ Hinweis: Auf "localhost" können Handys evtl. nicht verbinden.</div>); };
const PlayerAvatar = ({ player, size = 'md' }: { player: Player, size?: 'sm' | 'md' | 'lg' | 'xl' }) => { const sizes = { sm: 'text-lg w-8 h-8', md: 'text-2xl w-12 h-12', lg: 'text-4xl w-16 h-16', xl: 'text-6xl w-24 h-24' }; const isOnFire = player.streak >= 3; return (<div className={`relative flex items-center justify-center rounded-full bg-white shadow-lg ${sizes[size]} z-10`}><span className="z-10">{player.avatar}</span>{isOnFire && (<div className="absolute -inset-2 -z-10 animate-pulse-fast"><div className="text-4xl absolute -top-4 left-1/2 -translate-x-1/2 opacity-80">🔥</div></div>)}</div>); };

// --- SHARED PDF ---
const generatePdf = (topic: string, questions: Question[], players: Player[], lang: Language) => {
    const doc = new jsPDF(); const pageHeight = doc.internal.pageSize.height; let y = 20; const checkPageBreak = () => { if (y > pageHeight - 20) { doc.addPage(); y = 20; } };
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(70, 23, 143); doc.text(`Herr Raza Quiz: ${topic}`, 105, y, { align: 'center' }); y += 20;
    questions.forEach((q, index) => { checkPageBreak(); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(0, 0, 0); const splitQuestion = doc.splitTextToSize(`${index + 1}. ${q.text}`, 180); doc.text(splitQuestion, 15, y); y += (Array.isArray(splitQuestion) ? splitQuestion.length : 1) * 7 + 5; q.options.forEach((option, optIndex) => { checkPageBreak(); if (optIndex === q.correctIndex) { doc.setFont('helvetica', 'bold'); doc.setTextColor(38, 137, 12); } else { doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); } const splitOption = doc.splitTextToSize((optIndex === q.correctIndex ? '✓ ' : '  - ') + option, 170); doc.text(splitOption, 20, y); y += (Array.isArray(splitOption) ? splitOption.length : 1) * 6; }); if (q.explanation) { checkPageBreak(); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100); const splitExp = doc.splitTextToSize(`Info: ${q.explanation}`, 170); doc.text(splitExp, 20, y); y += (Array.isArray(splitExp) ? splitExp.length : 1) * 6; } y += 10; });
    if (players.length > 0) { doc.addPage(); y = 20; doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(70, 23, 143); doc.text(lang === 'DE' ? 'Endergebnis' : 'Final Results', 105, y, { align: 'center' }); y += 15; const sorted = [...players].sort((a, b) => b.score - a.score); doc.setFontSize(12); doc.setTextColor(100); doc.text(lang === 'DE' ? 'Rang' : 'Rank', 15, y); doc.text(lang === 'DE' ? 'Name' : 'Name', 40, y); doc.text(lang === 'DE' ? 'Punkte' : 'Score', 195, y, { align: 'right' }); y += 7; doc.line(15, y-2, 195, y-2); sorted.forEach((p, i) => { checkPageBreak(); doc.setFont('helvetica', 'normal'); doc.setTextColor(0); doc.text(`${i + 1}.`, 15, y); doc.text(p.name, 40, y); doc.text(p.score.toString(), 195, y, { align: 'right' }); y += 8; }); }
    const sanitizedTopic = topic.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(); doc.save(`herr_raza_quiz_${sanitizedTopic}.pdf`);
};

// --- PEER CONFIG ---
const PEER_CONFIG = { debug: 1, config: { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' } ] } };

// --- LOCAL APP ---
const LocalApp = ({ theme, lang }: { theme: Theme, lang: Language }) => {
    const t = TEXTS[lang];
    const [gameState, setGameState] = useState<GameState>(GameState.WELCOME);
    const [topic, setTopic] = useState('');
    const [customInstructions, setCustomInstructions] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [jokersUsed, setJokersUsed] = useState<{[playerId: string]: boolean}>({});
    const [musicOn, setMusicOn] = useState(false);
    const [musicVolume, setMusicVolume] = useState(0.5);
    const [musicTrack, setMusicTrack] = useState('COSMIC');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [loadingMessage, setLoadingMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<number | null>(null);
    const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
    const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
    const [useRealTime, setUseRealTime] = useState(false);
    const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
    const [newsHeadlines, setNewsHeadlines] = useState<string[]>([]);
    const [isLoadingNews, setIsLoadingNews] = useState(false);

    const activePlayerIndex = players.length > 0 ? currentQuestionIndex % players.length : 0;
    const activePlayer = players[activePlayerIndex];
    const hasJoker = activePlayer ? !jokersUsed[activePlayer.id] : false;

    useKeyboardControls(
        gameState,
        (idx) => { if (gameState === GameState.PLAYING) handleAnswer(idx); },
        () => { if (gameState === GameState.FEEDBACK) advanceGame(); else if (gameState === GameState.PLAYING) handleAnswer(-1); },
        () => { 
            const doc = window.document as any; const docEl = doc.documentElement as any;
            const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
            const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
            if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) { if (requestFullScreen) requestFullScreen.call(docEl); } else { if (cancelFullScreen) cancelFullScreen.call(doc); }
        }
    );

    const handleAddPlayer = () => { if (!newPlayerName.trim()) return; const newId = Date.now().toString(); setPlayers([...players, { id: newId, name: newPlayerName.trim(), avatar: AVATARS[players.length % AVATARS.length], score: 0, streak: 0, lastAnswerIndex: null, lastAnswerCorrect: null, lastPointsEarned: 0, connectionId: 'local' }]); setJokersUsed(prev => ({...prev, [newId]: false})); setNewPlayerName(''); };
    const handleGenerateTopics = async () => { setIsGeneratingTopics(true); try { const suggestions = await generateTopicSuggestions(topic, lang); setSuggestedTopics(suggestions); } catch (e) { console.error(e); } finally { setIsGeneratingTopics(false); } };
    const startGame = async () => { if (!topic || players.length === 0) return; setGameState(GameState.LOADING); setLoadingMessage(t.generating); try { const q = await generateQuizQuestions(topic, difficulty, questionCount, useRealTime, customInstructions, lang); setQuestions(q); setGameState(GameState.LOBBY); } catch (e) { console.error(e); setGameState(GameState.WELCOME); } };
    const nextTurn = () => { setHiddenOptions([]); setGameState(GameState.LOBBY); };
    const startQuestion = () => { setGameState(GameState.PLAYING); const q = questions[currentQuestionIndex]; speakText(q.text, lang); setTimeLeft(q.timeLimitSeconds); if (timerRef.current) clearInterval(timerRef.current); timerRef.current = window.setInterval(() => { setTimeLeft(prev => { if (prev <= 1) { handleAnswer(-1); return 0; } return prev - 1; }); }, 1000); };
    const useJoker = () => { if (!hasJoker || gameState !== GameState.PLAYING) return; const q = questions[currentQuestionIndex]; const correct = q.correctIndex; const wrongIndices = [0, 1, 2, 3].filter(i => i !== correct); const shuffled = wrongIndices.sort(() => 0.5 - Math.random()); setHiddenOptions(shuffled.slice(0, 2)); setJokersUsed(prev => ({...prev, [activePlayer.id]: true})); playSoundEffect('AIRHORN'); };
    const handleAnswer = (index: number) => { if (timerRef.current) clearInterval(timerRef.current); const q = questions[currentQuestionIndex]; const isCorrect = index === q.correctIndex; let points = 0; if (isCorrect) { playSoundEffect('SUCCESS'); points = calculateScore(timeLeft, q.timeLimitSeconds, activePlayer.streak); } else { playSoundEffect('FAIL'); } const updatedPlayers = [...players]; updatedPlayers[activePlayerIndex] = { ...activePlayer, score: activePlayer.score + points, streak: isCorrect ? activePlayer.streak + 1 : 0, lastAnswerIndex: index, lastAnswerCorrect: isCorrect, lastPointsEarned: points }; setPlayers(updatedPlayers); setGameState(GameState.FEEDBACK); };
    const advanceGame = () => { if (currentQuestionIndex + 1 >= questions.length) { setGameState(GameState.GAME_OVER); } else { setCurrentQuestionIndex(prev => prev + 1); nextTurn(); } };
    const toggleNews = async () => { if (newsHeadlines.length > 0) { setNewsHeadlines([]); return; } setIsLoadingNews(true); const news = await fetchDailyNews(lang); setNewsHeadlines(news); setIsLoadingNews(false); };

    if (gameState === GameState.WELCOME) return ( <Layout theme={theme}><div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 relative z-20"><div className="glass-panel p-8 rounded-3xl shadow-2xl max-w-lg w-full animate-slide-in border border-white/50"><div className="flex items-center gap-3 mb-6"><span className="text-4xl">📱</span><div><h1 className={`text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.accentText}`}>{t.localGame}</h1><p className="text-gray-500 font-medium text-sm">{t.localDesc}</p></div></div><div className="space-y-6"><div><label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-wider">{t.topic}</label><div className="flex gap-2"><input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t.topicPlaceholder} className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-purple-500 outline-none font-bold text-gray-700 transition-all"/><button onClick={handleGenerateTopics} disabled={isGeneratingTopics} className={`bg-gradient-to-br ${theme.accentText} text-white p-3 rounded-xl hover:scale-105 transition-transform shadow-lg`}>{isGeneratingTopics ? "..." : <Sparkles className="w-6 h-6" />}</button></div>{suggestedTopics.length > 0 && <div className="flex flex-wrap gap-2 mt-3 animate-slide-in">{suggestedTopics.map((t, i) => <button key={i} onClick={() => setTopic(t)} className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">{t}</button>)}</div>}</div><div><label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-wider flex items-center gap-2"><span>🧠 {t.expertFocus}</span></label><textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder={t.expertPlaceholder} className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-purple-500 outline-none font-medium text-gray-700 transition-all h-20 resize-none text-sm"/></div><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="flex items-center justify-between cursor-pointer group"><div className="flex flex-col"><span className="font-bold text-gray-700 text-sm">🌐 {t.liveData}</span><span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{t.liveDesc}</span></div><div className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${useRealTime ? 'bg-green-500' : 'bg-gray-300'}`} onClick={() => setUseRealTime(!useRealTime)}><div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${useRealTime ? 'translate-x-5' : ''}`} /></div></label></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-wider">{t.difficulty}</label><select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="w-full px-3 py-2 rounded-xl bg-gray-50 border-2 border-gray-100 font-bold text-gray-700 outline-none focus:border-purple-500 appearance-none">{Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}</select></div><div><label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-wider">{t.questionCount}</label><select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-gray-50 border-2 border-gray-100 font-bold text-gray-700 outline-none focus:border-purple-500 appearance-none">{[10, 20, 30, 40, 50].map(c => <option key={c} value={c}>{c}</option>)}</select></div></div><div><label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-wider">{t.players} ({players.length})</label><div className="flex gap-2 mb-3"><input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()} placeholder={t.addPlayer} className="flex-1 px-4 py-2 rounded-xl bg-gray-50 border-2 border-gray-100 outline-none focus:border-purple-500"/><Button onClick={handleAddPlayer} size="sm" variant="secondary" disabled={!newPlayerName.trim()}>+</Button></div><div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">{players.map((p, i) => <div key={i} className="bg-white border border-gray-200 pl-2 pr-1 py-1 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm animate-pop"><span>{p.avatar}</span><span className="text-gray-700">{p.name}</span><button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="w-5 h-5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">×</button></div>)}</div></div><Button onClick={startGame} className={`w-full py-4 text-xl shadow-xl ${theme.primary} border-none`} disabled={!topic || players.length === 0}>{t.startGame}</Button></div></div></div></Layout> );
    if (gameState === GameState.LOADING) return <Layout theme={theme} className="flex items-center justify-center"><div className="animate-pulse font-black text-4xl text-white drop-shadow-lg">{loadingMessage}</div></Layout>;
    if (gameState === GameState.LOBBY) return ( <Layout theme={theme}><NewsTicker headlines={newsHeadlines} lang={lang} /> <MusicControlWidget playing={musicOn} onToggle={() => setMusicOn(!musicOn)} volume={musicVolume} onVolumeChange={setMusicVolume} track={musicTrack} onTrackChange={setMusicTrack} lang={lang} /> <Soundboard /><div className="flex flex-col items-center justify-center h-full p-8 text-center animate-slide-in relative z-20"><div className="glass p-12 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] max-w-2xl w-full flex flex-col items-center border border-white/20"><div className="absolute top-4 left-4"><button onClick={toggleNews} className={`px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all ${newsHeadlines.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}>{isLoadingNews ? t.newsLoading : t.news}</button></div><h2 className="text-2xl font-bold text-white/80 mb-6 uppercase tracking-widest">{t.nextRound}</h2><div className="relative mb-8"><PlayerAvatar player={activePlayer} size="xl" /></div><div className="text-6xl font-display font-black text-white mb-8 drop-shadow-lg">{activePlayer.name}</div><Button onClick={startQuestion} size="lg" className={`w-full max-w-sm text-2xl py-6 shadow-2xl ${theme.primary} border-none`}>{t.ready}</Button><div className="mt-4 text-white/40 text-sm font-bold uppercase tracking-widest">{t.pressSpace}</div></div></div></Layout> );
    if (gameState === GameState.PLAYING) { const currentQ = questions[currentQuestionIndex]; return ( <Layout theme={theme}><NewsTicker headlines={newsHeadlines} lang={lang} /><MusicControlWidget playing={musicOn} onToggle={() => setMusicOn(!musicOn)} volume={musicVolume} onVolumeChange={setMusicVolume} track={musicTrack} onTrackChange={setMusicTrack} lang={lang} /> <Soundboard /><div className="flex flex-col h-full relative z-20"><div className="glass px-6 py-4 flex justify-between items-center text-white mx-4 mt-4 rounded-2xl"><div className="flex items-center gap-3"><PlayerAvatar player={activePlayer} size="sm" /><span className="font-bold text-xl">{activePlayer.name}</span></div>{hasJoker && <button onClick={useJoker} className={`bg-gradient-to-r ${theme.accentText} px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/20`}><span>🃏 {t.joker}</span></button>}<div className={`px-4 py-2 rounded-xl font-mono font-bold text-xl min-w-[80px] text-center transition-all ${timeLeft < 10 ? 'bg-red-500 animate-pulse shadow-red-500/50 shadow-lg' : 'bg-white/10'}`}>{timeLeft}s</div></div><div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col items-center justify-center"><div className="glass p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-4xl text-center mb-6 border border-white/20 backdrop-blur-xl relative flex flex-col items-center">{currentQ.imageUrl && (<div className="w-full max-w-2xl h-48 md:h-64 rounded-2xl overflow-hidden shadow-2xl mb-6 border-4 border-white/10 relative group"><img src={`data:image/jpeg;base64,${currentQ.imageUrl}`} alt="Quiz Visual" className="w-full h-full object-cover transition-transform duration-[20s] ease-linear group-hover:scale-110" /></div>)}<button onClick={() => speakText(currentQ.text, lang)} className="absolute top-4 right-4 text-3xl opacity-50 hover:opacity-100 transition-opacity hover:scale-110 active:scale-95" title="Vorlesen">🔊</button><h2 className="text-xl md:text-3xl font-display font-black text-white leading-tight drop-shadow-md">{currentQ.text}</h2></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">{currentQ.options.map((opt, idx) => { if (hiddenOptions.includes(idx)) return <div key={idx} className="bg-black/10 rounded-2xl border border-white/5 opacity-50 flex items-center justify-center"><span className="text-2xl opacity-50">🚫</span></div>; const colors = ["bg-gradient-to-br from-red-500 to-rose-600 border-red-400", "bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400", "bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-300", "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400"]; const Shapes = [Triangle, Diamond, Circle, Square]; const Shape = Shapes[idx]; return (<button key={idx} onClick={() => handleAnswer(idx)} className={`${colors[idx]} border-t border-l p-6 rounded-2xl shadow-xl flex items-center text-left hover:brightness-110 active:scale-95 transition-all group relative overflow-hidden`}><div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="absolute top-2 right-2 bg-black/20 rounded px-2 py-0.5 text-xs font-bold text-white/80">{idx + 1}</div><Shape className="w-12 h-12 text-white mr-6 drop-shadow-md group-hover:rotate-12 transition-transform duration-300" /><span className="text-white font-black text-xl md:text-2xl drop-shadow-sm">{opt}</span></button>); })}</div><div className="mt-8"><Button onClick={() => handleAnswer(-1)} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md" size="sm">{t.skip}</Button></div></div></div></Layout> ); }
    if (gameState === GameState.FEEDBACK) { const currentQ = questions[currentQuestionIndex]; const isCorrect = activePlayer.lastAnswerCorrect; return ( <Layout theme={theme}><NewsTicker headlines={newsHeadlines} lang={lang} /><MusicControlWidget playing={musicOn} onToggle={() => setMusicOn(!musicOn)} volume={musicVolume} onVolumeChange={setMusicVolume} track={musicTrack} onTrackChange={setMusicTrack} lang={lang} /><div className={`flex flex-col items-center justify-center h-full text-white p-6 text-center animate-pop relative z-20 pb-40`}><div className={`absolute inset-0 opacity-20 ${isCorrect ? 'bg-green-500' : 'bg-red-500'} z-[-1]`}></div><div className="text-8xl mb-6 animate-bounce drop-shadow-2xl">{isCorrect ? "🌟" : "💔"}</div><h2 className={`text-6xl font-black mb-4 tracking-tight drop-shadow-lg ${isCorrect ? 'text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-white' : 'text-white'}`}>{isCorrect ? t.correct : t.wrong}</h2><div className="text-3xl font-bold mb-8 bg-black/20 px-8 py-2 rounded-full backdrop-blur-md border border-white/10">{isCorrect ? `+${activePlayer.lastPointsEarned} ${t.points}` : t.noPoints}</div><div className="glass p-8 rounded-3xl max-w-2xl w-full mb-12 border border-white/30 text-left"><div className="text-sm uppercase font-black text-white/50 mb-3 tracking-widest">{t.correctWas}</div><div className="text-3xl font-black text-white drop-shadow-md mb-4">{currentQ.options[currentQ.correctIndex]}</div>{currentQ.explanation && (<div className="mt-4 pt-4 border-t border-white/10 relative"><button onClick={() => speakText(currentQ.explanation || '', lang)} className="absolute top-4 right-0 text-xl opacity-50 hover:opacity-100">🔊</button><div className="flex items-start gap-3"><span className="text-2xl">💡</span><p className="text-lg text-white/90 font-medium leading-relaxed italic pr-8">"{currentQ.explanation}"</p></div></div>)}</div><Button onClick={advanceGame} size="lg" className={`bg-white text-indigo-900 hover:scale-105 shadow-2xl shadow-white/20`}>{t.continue}</Button></div></Layout> ); }
    if (gameState === GameState.GAME_OVER) { const sorted = [...players].sort((a,b) => b.score - a.score); const [first, second, third] = sorted; return ( <Layout theme={theme}><NewsTicker headlines={newsHeadlines} lang={lang} /><div className="flex flex-col items-center justify-center h-full text-white p-6 relative z-20 pb-40"><h1 className="text-6xl font-display font-black mb-16 text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg tracking-tight">{t.podium}</h1><div className="flex items-end gap-4 md:gap-8 mb-16 h-80 w-full max-w-4xl justify-center"> {second && <div className="flex flex-col items-center w-1/3 animate-slide-in" style={{animationDelay: '0.2s'}}><div className="mb-4 flex flex-col items-center"><PlayerAvatar player={second} size="lg" /><div className="font-bold text-xl truncate w-32 text-center text-white/90 mt-2">{second.name}</div></div><div className="w-full h-40 bg-gradient-to-t from-slate-600 to-slate-400 rounded-t-2xl flex items-end justify-center pb-4 font-black text-4xl shadow-2xl border-t border-white/30 relative"><span className="text-slate-800/50 absolute top-2 font-black text-6xl">2</span></div><div className="mt-3 font-bold text-2xl text-slate-300">{second.score}</div></div>} {first && <div className="flex flex-col items-center w-1/3 animate-slide-in relative z-10" style={{animationDelay: '0.5s'}}><div className="text-6xl absolute -top-16 animate-bounce drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">👑</div><div className="mb-4 flex flex-col items-center"><PlayerAvatar player={first} size="xl" /><div className="font-black text-2xl truncate w-40 text-center text-yellow-200 mt-2">{first.name}</div></div><div className="w-full h-64 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-2xl flex items-end justify-center pb-6 font-black text-6xl shadow-[0_0_40px_rgba(255,200,0,0.4)] border-t border-yellow-200 relative"><span className="text-yellow-800/30 absolute top-4 font-black text-8xl">1</span></div><div className="mt-3 font-black text-4xl text-yellow-400 drop-shadow-md">{first.score}</div></div>} {third && <div className="flex flex-col items-center w-1/3 animate-slide-in" style={{animationDelay: '0.3s'}}><div className="mb-4 flex flex-col items-center"><PlayerAvatar player={third} size="lg" /><div className="font-bold text-xl truncate w-32 text-center text-white/90 mt-2">{third.name}</div></div><div className="w-full h-24 bg-gradient-to-t from-orange-700 to-orange-500 rounded-t-2xl flex items-end justify-center pb-4 font-black text-3xl shadow-2xl border-t border-white/30 relative"><span className="text-orange-900/40 absolute top-2 font-black text-5xl">3</span></div><div className="mt-3 font-bold text-2xl text-orange-300">{third.score}</div></div>} </div> <div className="flex gap-6"><Button onClick={() => generatePdf(topic, questions, players, lang)} className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white">{t.downloadPdf}</Button><Button onClick={() => window.location.reload()} variant="primary" className={`shadow-lg ${theme.primary} border-none`}>{t.newGame}</Button></div></div></Layout>); }
    return null;
};

// --- HOST APP (Online) ---
const HostApp = ({ theme, lang, onBack }: { theme: Theme, lang: Language, onBack: () => void }) => {
  const t = TEXTS[lang];
  const [gameState, setGameState] = useState<GameState>(GameState.WELCOME);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [topic, setTopic] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [useRealTime, setUseRealTime] = useState(false); 
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [joinLink, setJoinLink] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameId, setGameId] = useState('');
  const [musicOn, setMusicOn] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [musicTrack, setMusicTrack] = useState('COSMIC');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<FloatingEmoji[]>([]);
  const [allowReactions, setAllowReactions] = useState(true);
  const [showTestClient, setShowTestClient] = useState(false);
  const [newsHeadlines, setNewsHeadlines] = useState<string[]>([]);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<Map<string, any>>(new Map()); 
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (peerRef.current) peerRef.current.destroy();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const initializeHost = async (gameTopic: string, questions: Question[], coverImage: string | null, retryCount = 0) => {
    if (retryCount > 3) { alert("Error creating room."); setGameState(GameState.WELCOME); return; }
    const shortId = generateShortId(); const fullPeerId = `${PEER_ID_PREFIX}${shortId}`;
    if (peerRef.current) peerRef.current.destroy();
    const peer = new Peer(fullPeerId, PEER_CONFIG); peerRef.current = peer;
    peer.on('open', (id: string) => {
      setGameId(fullPeerId);
      const isBlob = window.location.protocol === 'blob:';
      const baseUrl = window.location.href.split('?')[0]; const url = new URL(baseUrl); url.searchParams.set('gameId', fullPeerId);
      const fullJoinUrl = url.toString(); setJoinLink(fullJoinUrl);
      if (!isBlob) { QRCode.toDataURL(fullJoinUrl, { width: 300, margin: 2, color: { dark: '#46178f' } }).then(u => setQrCodeUrl(u)).catch(console.error); }
      setSession({ gameId: fullPeerId, topic: gameTopic, coverImage: coverImage || undefined, difficulty, questions, currentQuestionIndex: 0, players: [], language: lang });
      setGameState(GameState.LOBBY);
    });
    peer.on('connection', (conn: any) => {
      conn.on('data', (data: NetworkMessage) => handleNetworkMessage(conn, data));
      conn.on('close', () => {
         connectionsRef.current.delete(conn.connectionId);
         setSession(prev => prev ? ({ ...prev, players: prev.players.filter(p => p.connectionId !== conn.connectionId) }) : null);
      });
    });
    peer.on('error', (err: any) => { if (err.type === 'unavailable-id') initializeHost(gameTopic, questions, coverImage, retryCount + 1); });
  };

  const broadcast = (msg: NetworkMessage) => { connectionsRef.current.forEach(conn => { if (conn.open) conn.send(msg); }); };
  
  const handleNetworkMessage = (conn: any, data: NetworkMessage) => {
    if (data.type === 'JOIN') {
      connectionsRef.current.set(conn.connectionId, conn);
      setSession(prev => {
        if (!prev) return null;
        if (prev.players.find(p => p.connectionId === conn.connectionId)) { conn.send({ type: 'WELCOME', playerId: conn.peer, gameTopic: prev.topic, coverImage: prev.coverImage, language: lang }); return prev; }
        const newPlayer: Player = { id: conn.peer, connectionId: conn.connectionId, name: data.name.substring(0, 15), avatar: data.avatar || "😎", score: 0, streak: 0, lastAnswerIndex: null, lastAnswerCorrect: null, lastPointsEarned: 0 };
        setTimeout(() => conn.open && conn.send({ type: 'WELCOME', playerId: newPlayer.id, gameTopic: prev.topic, coverImage: prev.coverImage, language: lang }), 50);
        return { ...prev, players: [...prev.players, newPlayer] };
      });
    } else if (data.type === 'ANSWER') {
      setSession(prev => {
        if (!prev || prev.currentQuestionIndex >= prev.questions.length) return prev;
        const pIdx = prev.players.findIndex(p => p.connectionId === conn.connectionId);
        if (pIdx === -1 || prev.players[pIdx].lastAnswerIndex !== null) return prev;
        const updated = [...prev.players]; updated[pIdx] = { ...updated[pIdx], lastAnswerIndex: data.answerIndex };
        return { ...prev, players: updated };
      });
    } else if (data.type === 'CHAT_MESSAGE') {
        const msg = { ...data.message, id: Date.now().toString() };
        setMessages(prev => [...prev, msg].slice(-50)); broadcast({ type: 'CHAT_MESSAGE', message: msg });
    } else if (data.type === 'REACTION') {
        if (!allowReactions) return;
        const id = Date.now().toString() + Math.random();
        setReactions(prev => [...prev, { id, emoji: data.emoji, x: Math.random() * 90 + 5, duration: 4 + Math.random() * 2 }]);
        broadcast({ type: 'REACTION', emoji: data.emoji, senderId: data.senderId });
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 6000);
    }
  };

  const createGame = async () => {
    if (!topic) return;
    setGameState(GameState.LOADING); setLoadingMessage(t.generating);
    try {
      const [questions, coverImage] = await Promise.all([ generateQuizQuestions(topic, difficulty, questionCount, useRealTime, customInstructions, lang), generateQuizCover(topic) ]);
      await initializeHost(topic, questions, coverImage);
    } catch (e) { console.error(e); setGameState(GameState.WELCOME); }
  };
  
  const startGame = () => { if (!session) return; broadcast({ type: 'START_GAME' }); startRound(); };
  const startRound = () => {
    if (!session) return;
    const q = session.questions[session.currentQuestionIndex];
    setSession(prev => prev ? ({ ...prev, players: prev.players.map(p => ({...p, lastAnswerIndex: null, lastPointsEarned: 0, lastAnswerCorrect: null})) }) : null);
    setGameState(GameState.PLAYING);
    broadcast({ type: 'QUESTION_START', question: q, current: session.currentQuestionIndex + 1, total: session.questions.length });
    speakText(q.text, lang);
    setTimeLeft(q.timeLimitSeconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => { setTimeLeft(prev => { if (prev <= 1) { endRound(); return 0; } return prev - 1; }); }, 1000);
  };
  const endRound = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSession(prev => {
      if (!prev) return null;
      const currentQ = prev.questions[prev.currentQuestionIndex];
      const updatedPlayers = prev.players.map(p => {
        const isCorrect = p.lastAnswerIndex === currentQ.correctIndex;
        let points = 0; if (isCorrect) { playSoundEffect('SUCCESS'); points = calculateScore(timeLeft, currentQ.timeLimitSeconds, p.streak); }
        return { ...p, score: p.score + points, streak: isCorrect ? p.streak + 1 : 0, lastAnswerCorrect: isCorrect, lastPointsEarned: points };
      });
      updatedPlayers.forEach(p => { const c = connectionsRef.current.get(p.connectionId); if(c && c.open) c.send({ type: 'ROUND_END', correctIndex: currentQ.correctIndex, score: p.score, streak: p.streak, points: p.lastPointsEarned, isCorrect: !!p.lastAnswerCorrect }); });
      return { ...prev, players: updatedPlayers };
    });
    setGameState(GameState.FEEDBACK);
  };
  const nextQuestion = () => {
      if(!session) return;
      if (session.currentQuestionIndex + 1 >= session.questions.length) {
          const ranked = [...session.players].sort((a,b)=>b.score-a.score);
          ranked.forEach((p,i) => { const c = connectionsRef.current.get(p.connectionId); if(c && c.open) c.send({ type: 'GAME_OVER', rank: i+1 }); });
          setGameState(GameState.GAME_OVER);
      } else {
          setSession(prev => prev ? ({...prev, currentQuestionIndex: prev.currentQuestionIndex + 1}) : null);
          setTimeout(startRound, 100);
      }
  };
  const handleGenerateTopics = async () => { setIsGeneratingTopics(true); try { const suggestions = await generateTopicSuggestions(topic, lang); setSuggestedTopics(suggestions); } catch (e) { } finally { setIsGeneratingTopics(false); } };
  const toggleNews = async () => { if (newsHeadlines.length > 0) { setNewsHeadlines([]); return; } const news = await fetchDailyNews(lang); setNewsHeadlines(news); };
  const kickPlayer = (id: string) => { const c = connectionsRef.current.get(id); if(c) c.close(); };

  if (gameState === GameState.WELCOME) return (
      <Layout theme={theme}>
         <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 relative z-20">
          <div className="glass-panel p-8 rounded-3xl shadow-2xl max-w-lg w-full animate-slide-in border border-white/50">
            <h1 className={`text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.accentText} mb-6`}>{t.hostOnline}</h1>
            <div className="space-y-6">
              <div><label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-wider">{t.topic}</label><div className="flex gap-2"><input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t.topicPlaceholder} className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-purple-500 outline-none font-bold text-gray-700 transition-all"/><button onClick={handleGenerateTopics} disabled={isGeneratingTopics} className={`bg-gradient-to-br ${theme.accentText} text-white p-3 rounded-xl hover:scale-105 transition-transform shadow-lg`}>{isGeneratingTopics ? "..." : <Sparkles className="w-6 h-6" />}</button></div>{suggestedTopics.length > 0 && <div className="flex flex-wrap gap-2 mt-3 animate-slide-in">{suggestedTopics.map((t, i) => <button key={i} onClick={() => setTopic(t)} className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">{t}</button>)}</div>}</div>
              <div><label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-wider flex items-center gap-2"><span>🧠 {t.expertFocus}</span></label><textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder={t.expertPlaceholder} className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-purple-500 outline-none font-medium text-gray-700 transition-all h-20 resize-none text-sm"/></div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="flex items-center justify-between cursor-pointer group"><div className="flex flex-col"><span className="font-bold text-gray-700 text-sm">🌐 {t.liveData}</span><span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{t.liveDesc}</span></div><div className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${useRealTime ? 'bg-green-500' : 'bg-gray-300'}`} onClick={() => setUseRealTime(!useRealTime)}><div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${useRealTime ? 'translate-x-5' : ''}`} /></div></label></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-wider">{t.difficulty}</label><select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="w-full px-3 py-2 rounded-xl bg-gray-50 border-2 border-gray-100 font-bold text-gray-700 outline-none focus:border-purple-500 appearance-none">{Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}</select></div><div><label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-wider">{t.questionCount}</label><select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-gray-50 border-2 border-gray-100 font-bold text-gray-700 outline-none focus:border-purple-500 appearance-none">{[10, 20, 30, 40, 50].map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
              <Button onClick={createGame} className={`w-full py-4 text-xl shadow-xl ${theme.primary} border-none`} disabled={!topic}>Lobby erstellen</Button>
              <button onClick={onBack} className="w-full text-center text-gray-500 text-sm hover:underline">{t.back}</button>
            </div>
          </div>
         </div>
      </Layout>
  );
  if (gameState === GameState.LOADING) return <Layout theme={theme} className="flex items-center justify-center"><div className="animate-pulse font-black text-4xl text-white drop-shadow-lg">{loadingMessage}</div></Layout>;
  if (gameState === GameState.LOBBY && session) {
      const isBlob = window.location.protocol === 'blob:';
      return (
      <Layout theme={theme}>
        <NewsTicker headlines={newsHeadlines} lang={lang} /> <MusicControlWidget playing={musicOn} onToggle={() => setMusicOn(!musicOn)} volume={musicVolume} onVolumeChange={setMusicVolume} track={musicTrack} onTrackChange={setMusicTrack} lang={lang} /> <LocalhostWarning />
        <div className="flex flex-col h-full p-6 text-center text-white relative z-20 pb-40">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-5xl mb-8 mx-auto">
                 <div className="flex flex-col items-center">
                    {!isBlob && qrCodeUrl && <div className="bg-white p-4 rounded-xl shadow-xl mb-4 animate-pop min-w-[200px]"><img src={qrCodeUrl} alt="Join QR Code" className="w-48 h-48 object-contain" /></div>}
                    <div className="flex flex-col items-center gap-2"><h2 className="text-xl font-display font-bold opacity-90">Game ID:</h2><div className="bg-white text-raza-purple font-black text-4xl md:text-6xl px-8 py-4 rounded-xl shadow-2xl tracking-widest select-all text-center">{formatGameId(session.gameId)}</div></div>
                 </div>
                 {session.coverImage && <div className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl border-4 border-white/20 animate-slide-in"><img src={`data:image/jpeg;base64,${session.coverImage}`} className="w-full h-auto object-cover" alt="Quiz Cover" /></div>}
            </div>
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mt-4 mx-auto">{session.players.map(p => <div key={p.id} className="px-4 py-2 bg-white text-raza-blue font-bold rounded-full shadow-md animate-pop flex items-center gap-2"><span>{p.avatar}</span><span>{p.name}</span><button onClick={() => kickPlayer(p.connectionId)} className="w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs font-mono ml-1 font-bold transition-colors">✕</button></div>)}{session.players.length === 0 && <div className="opacity-50 animate-pulse">{t.lobbyWait}</div>}</div>
            <div className="mt-8 flex gap-4 justify-center"><button onClick={() => setShowTestClient(!showTestClient)} className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-full">{t.testPlayer}</button><Button onClick={startGame} disabled={session.players.length === 0} variant="success" size="lg" className="shadow-xl animate-pulse">{t.startGame}</Button></div>
        </div>
        {showTestClient && <div className="fixed bottom-4 right-4 w-80 h-[500px] bg-black rounded-3xl border-8 border-gray-800 shadow-2xl overflow-hidden z-50 animate-slide-in origin-bottom-right"><ClientApp theme={theme} lang={lang} initialGameId={formatGameId(gameId).replace(' ', '')} isEmbedded={true} /></div>}
      </Layout>
    );
  }
  if (gameState === GameState.PLAYING && session) {
    const currentQ = session.questions[session.currentQuestionIndex]; const answered = session.players.filter(p => p.lastAnswerIndex !== null).length;
    return ( <Layout theme={theme}><NewsTicker headlines={newsHeadlines} lang={lang} /><MusicControlWidget playing={musicOn} onToggle={() => setMusicOn(!musicOn)} volume={musicVolume} onVolumeChange={setMusicVolume} track={musicTrack} onTrackChange={setMusicTrack} allowReactions={allowReactions} onToggleReactions={() => setAllowReactions(!allowReactions)} showReactionsToggle={true} lang={lang} /><FloatingReactions emojis={reactions} /><ChatOverlay messages={messages} onSendMessage={(txt:string)=>handleNetworkMessage(null, {type:'CHAT_MESSAGE', message:{id:'', senderId:'host', senderName:'HOST', senderAvatar:'👑', text:txt, timestamp:Date.now()}})} onDeleteMessage={(id:string)=> {setMessages(p=>p.filter(m=>m.id!==id)); broadcast({type:'DELETE_CHAT_MESSAGE', messageId:id});}} currentUserId="host" isHost={true} lang={lang} /><div className="flex flex-col h-full relative z-20"><div className="glass px-6 py-4 flex justify-between items-center text-white mx-4 mt-4 rounded-2xl"><div className="flex items-center gap-3"><span className="font-bold text-xl">{t.question} {session.currentQuestionIndex + 1}/{session.questions.length}</span><span className="text-white/50 text-sm">({answered} {t.answers})</span></div><div className={`px-4 py-2 rounded-xl font-mono font-bold text-xl min-w-[80px] text-center transition-all ${timeLeft < 10 ? 'bg-red-500 animate-pulse shadow-red-500/50 shadow-lg' : 'bg-white/10'}`}>{timeLeft}s</div></div><div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col items-center justify-center"><div className="glass p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-4xl text-center mb-6 border border-white/20 backdrop-blur-xl relative flex flex-col items-center">{currentQ.imageUrl && (<div className="w-full max-w-2xl h-48 md:h-64 rounded-2xl overflow-hidden shadow-2xl mb-6 border-4 border-white/10 relative group"><img src={`data:image/jpeg;base64,${currentQ.imageUrl}`} alt="Quiz Visual" className="w-full h-full object-cover transition-transform duration-[20s] ease-linear group-hover:scale-110" /></div>)}<button onClick={() => speakText(currentQ.text, lang)} className="absolute top-4 right-4 text-3xl opacity-50 hover:opacity-100 transition-opacity hover:scale-110 active:scale-95" title="Vorlesen">🔊</button><h2 className="text-xl md:text-3xl font-display font-black text-white leading-tight drop-shadow-md">{currentQ.text}</h2></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">{currentQ.options.map((opt, idx) => { const colors = ["bg-gradient-to-br from-red-500 to-rose-600 border-red-400", "bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400", "bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-300", "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400"]; const Shapes = [Triangle, Diamond, Circle, Square]; const Shape = Shapes[idx]; const whoAnswered = session.players.filter(p => p.lastAnswerIndex === idx); return (<div key={idx} className={`${colors[idx]} border-t border-l p-6 rounded-2xl shadow-xl flex flex-col relative overflow-hidden`}><div className="flex items-center mb-2"><Shape className="w-12 h-12 text-white mr-4 drop-shadow-md" /><span className="text-white font-black text-xl drop-shadow-sm leading-tight">{opt}</span></div><div className="flex flex-wrap gap-1 mt-auto min-h-[1.5rem]">{whoAnswered.map(p => <div key={p.id} className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs shadow-sm animate-pop" title={p.name}>{p.avatar}</div>)}</div></div>); })}</div><div className="mt-8"><Button onClick={() => { if(timerRef.current) clearInterval(timerRef.current); nextQuestion(); }} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md" size="sm">{t.skip}</Button></div></div></div></Layout> );
  }
  if (gameState === GameState.FEEDBACK && session) { const currentQ = session.questions[session.currentQuestionIndex]; return ( <Layout theme={theme}><NewsTicker headlines={newsHeadlines} lang={lang} /><MusicControlWidget playing={musicOn} onToggle={() => setMusicOn(!musicOn)} volume={musicVolume} onVolumeChange={setMusicVolume} track={musicTrack} onTrackChange={setMusicTrack} lang={lang} /><div className="flex flex-col items-center justify-center h-full text-white p-6 text-center animate-pop relative z-20 pb-40"><h2 className="text-4xl font-bold mb-8">{currentQ.text}</h2><div className="glass p-8 rounded-3xl max-w-2xl w-full mb-12 border border-white/30 text-left"><div className="text-sm uppercase font-black text-white/50 mb-3 tracking-widest">{t.correctWas}</div><div className="text-3xl font-black text-white drop-shadow-md mb-4">{currentQ.options[currentQ.correctIndex]}</div>{currentQ.explanation && <p className="text-lg text-white/90 italic">"{currentQ.explanation}"</p>}</div><Button onClick={() => { broadcast({type:'SHOW_LEADERBOARD'}); setGameState(GameState.LEADERBOARD); }} size="lg" className="bg-white text-indigo-900 hover:scale-105 shadow-2xl">{t.showLeaderboard}</Button></div></Layout> ); }
  if (gameState === GameState.LEADERBOARD && session) { const sorted = [...session.players].sort((a,b)=>b.score-a.score); return ( <Layout theme={theme}><NewsTicker headlines={newsHeadlines} lang={lang} /><div className="flex flex-col h-full p-4 md:p-8 text-white relative z-20 pb-40"><h1 className="text-4xl font-display font-black text-center mb-8 text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600">{t.leaderboard}</h1><div className="flex-1 overflow-y-auto space-y-3 pr-2 max-w-2xl mx-auto w-full">{sorted.map((p, i) => <div key={p.id} className="glass p-4 rounded-xl flex items-center gap-4 animate-slide-in border border-white/10" style={{animationDelay:`${i*50}ms`}}><div className="text-2xl font-bold w-8 text-center text-yellow-400">{i+1}</div><div className="text-3xl">{p.avatar}</div><div className="flex-1 font-bold text-xl truncate">{p.name}</div><div className="text-xl font-bold">{p.score}</div></div>)}</div><div className="flex justify-center mt-8"><Button onClick={nextQuestion} size="lg">{session.currentQuestionIndex+1>=session.questions.length?t.podium:t.nextRound}</Button></div></div></Layout> ); }
  if (gameState === GameState.GAME_OVER && session) { const sorted = [...session.players].sort((a,b) => b.score - a.score); const [first, second, third] = sorted; return ( <Layout theme={theme}><div className="flex flex-col items-center justify-center h-full text-white p-6 relative z-20 pb-40"><h1 className="text-6xl font-black mb-8">{t.podium}</h1><div className="flex gap-4 mb-8">{session.players.sort((a,b)=>b.score-a.score).slice(0,3).map((p,i)=><div key={i} className="text-center"><PlayerAvatar player={p} size="lg" /><div className="font-bold mt-2">{p.name}</div><div className="text-2xl font-black">{p.score}</div></div>)}</div><div className="flex gap-4"><Button onClick={()=>generatePdf(session.topic,session.questions,session.players, lang)}>{t.downloadPdf}</Button><Button onClick={()=>window.location.reload()} variant="secondary">{t.newGame}</Button></div></div></Layout> ); }
  return <div className="text-white">...</div>;
};

// --- CLIENT APP ---
const ClientApp = ({ theme, lang, onBack, initialGameId, isEmbedded = false }: { theme: Theme, lang: Language, onBack?: () => void, initialGameId?: string, isEmbedded?: boolean }) => {
  const t = TEXTS[lang];
  const [state, setState] = useState<ClientState>(initialGameId ? ClientState.CONNECTING : ClientState.JOINING);
  const [gameId, setGameId] = useState(initialGameId || '');
  const [name, setName] = useState(() => loadProfile().name);
  const [avatar, setAvatar] = useState(() => loadProfile().avatar);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [result, setResult] = useState<any>(null);
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [waitingMessage, setWaitingMessage] = useState(t.waitHost);
  const [connError, setConnError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<FloatingEmoji[]>([]);
  
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);

  useEffect(() => { if(initialGameId && !connRef.current) connectToGame(initialGameId); }, [initialGameId]);
  useEffect(() => {
    return () => { if(peerRef.current) peerRef.current.destroy(); };
  }, []);

  const connectToGame = useCallback((inputCode: string) => {
      if (!inputCode) return;
      if (peerRef.current) peerRef.current.destroy();
      setConnError(''); setIsJoining(false);
      let target = inputCode.trim().replace(/\s/g, ''); if (!target.startsWith(PEER_ID_PREFIX)) target = `${PEER_ID_PREFIX}${target}`;
      const peer = new Peer(PEER_CONFIG); peerRef.current = peer;
      peer.on('open', () => {
        setState(ClientState.CONNECTING);
        const conn = peer.connect(target, { reliable: true }); connRef.current = conn;
        const to = setTimeout(() => { if (state === ClientState.CONNECTING) { setConnError("Timeout"); setState(ClientState.JOINING); } }, 8000);
        conn.on('open', () => { clearTimeout(to); setState(ClientState.JOINING); });
        conn.on('data', (d: NetworkMessage) => handleMessage(d));
        conn.on('close', () => { alert("Lost connection"); if(!isEmbedded) window.location.reload(); });
      });
      peer.on('error', () => { setConnError("Room not found"); setState(ClientState.JOINING); });
  }, []);

  const handleMessage = (data: NetworkMessage) => {
      if (data.type === 'WELCOME') { setIsJoining(false); setWaitingMessage(t.waitHost); setCoverImage(data.coverImage); setState(ClientState.WAITING); }
      else if (data.type === 'START_GAME') setState(ClientState.WAITING);
      else if (data.type === 'SHOW_LEADERBOARD') { setWaitingMessage(t.leaderboard); setState(ClientState.WAITING); }
      else if (data.type === 'QUESTION_START') { setCurrentQ(data.question); setState(ClientState.PLAYING); setResult(null); }
      else if (data.type === 'ROUND_END') { setResult({ correct: data.isCorrect, points: data.points, score: data.score }); setState(ClientState.FEEDBACK); }
      else if (data.type === 'GAME_OVER') { setResult(prev => ({...(prev||{}), rank: data.rank})); setState(ClientState.GAME_OVER); }
      else if (data.type === 'CHAT_MESSAGE') setMessages(p => [...p, data.message].slice(-50));
      else if (data.type === 'DELETE_CHAT_MESSAGE') setMessages(p => p.filter(m => m.id !== data.messageId));
      else if (data.type === 'REACTION') setReactions(p => [...p, { id: Date.now()+Math.random().toString(), emoji: data.emoji, x: Math.random()*90+5, duration: 4+Math.random()*2 }]);
  };

  const joinGame = () => {
      if (!connRef.current && gameId) { connectToGame(gameId); return; }
      if(!name.trim() || !connRef.current) return;
      setIsJoining(true); saveProfile(name, avatar);
      connRef.current.send({ type: 'JOIN', name: name.trim(), avatar });
  };
  const sendAnswer = (idx: number) => { connRef.current?.send({ type: 'ANSWER', answerIndex: idx }); setState(ClientState.ANSWERED); };
  const sendReaction = (emoji: string) => { connRef.current?.send({ type: 'REACTION', emoji, senderId: peerRef.current?.id }); };

  const commonUI = (content: React.ReactNode, showHeader = true) => (
      <Layout theme={theme} isEmbedded={isEmbedded} showHeader={showHeader}>
          <FloatingReactions emojis={reactions} />
          {state !== ClientState.JOINING && state !== ClientState.CONNECTING && <div className="fixed top-20 right-4 z-40 flex flex-col gap-2 pointer-events-auto">{REACTION_EMOJIS.map(e => <button key={e} onClick={() => sendReaction(e)} className="w-10 h-10 bg-white/10 backdrop-blur rounded-full text-xl hover:scale-125 transition-transform">{e}</button>)}</div>}
          {state !== ClientState.JOINING && state !== ClientState.CONNECTING && <ChatOverlay messages={messages} onSendMessage={(txt:string)=>connRef.current?.send({type:'CHAT_MESSAGE', message:{id:'', senderId:peerRef.current?.id, senderName:name, senderAvatar:avatar, text:txt, timestamp:Date.now()}})} currentUserId={peerRef.current?.id} lang={lang} />}
          {content}
      </Layout>
  );

  if (!initialGameId && !connRef.current) return commonUI(<div className="flex flex-col items-center justify-center min-h-full px-6 text-center"><h1 className="text-3xl font-black text-white mb-8">{t.joinGame}</h1>{connError && <div className="bg-red-500 text-white p-2 rounded mb-4">{connError}</div>}<input type="text" placeholder="123 456" value={gameId} onChange={e=>setGameId(e.target.value)} className="w-full max-w-xs px-6 py-4 rounded-xl text-center text-2xl font-mono tracking-widest mb-6" /><Button onClick={()=>connectToGame(gameId)} disabled={!gameId} size="lg" className="w-full max-w-xs">{t.connect}</Button>{onBack && <button onClick={onBack} className="mt-8 text-white/50">{t.back}</button>}</div>);
  if (state === ClientState.CONNECTING) return commonUI(<div className="flex items-center justify-center min-h-full"><div className="animate-pulse text-2xl text-white font-bold">{t.loading}</div></div>);
  if (state === ClientState.JOINING) return commonUI(<div className="flex flex-col items-center justify-center min-h-full px-6"><h1 className="text-2xl font-black text-white mb-6">{t.createProfile}</h1>{connError && <div className="bg-red-500 text-white p-2 rounded mb-4">{connError}</div>}<div className="text-8xl mb-4 cursor-pointer hover:scale-110 transition-transform" onClick={()=>setAvatar(AVATARS[(AVATARS.indexOf(avatar)+1)%AVATARS.length])}>{avatar}</div><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder={t.yourName} className="w-full max-w-xs px-6 py-4 rounded-xl text-center text-xl font-bold mb-6" /><Button onClick={joinGame} disabled={!name.trim()||isJoining} className="w-full max-w-xs shadow-xl">{isJoining?"...":t.letsGo}</Button></div>, !isEmbedded);
  if (state === ClientState.WAITING) return commonUI(<div className="flex flex-col items-center justify-center min-h-full px-6 text-center text-white"><h2 className="text-3xl font-bold mb-2">{waitingMessage===t.waitHost?t.youAreIn:t.leaderboard}</h2><p className="opacity-75 mb-8">{waitingMessage}</p>{coverImage&&waitingMessage===t.waitHost&&<div className="w-48 h-auto rounded-lg shadow-2xl overflow-hidden mb-8 animate-slide-in"><img src={`data:image/jpeg;base64,${coverImage}`} className="w-full h-full object-cover"/></div>}<div className="text-6xl animate-bounce">{avatar}</div><div className="mt-4 font-bold text-xl">{name}</div></div>, !isEmbedded);
  if (state === ClientState.PLAYING) return commonUI(<div className="min-h-full grid grid-cols-2 gap-4 p-4 content-center bg-gray-900">{[Triangle, Diamond, Circle, Square].map((S,i)=>{const c=["bg-red-600","bg-blue-600","bg-yellow-500","bg-green-600"]; return <button key={i} onClick={()=>sendAnswer(i)} className={`${c[i]} rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform aspect-square`}><S className="w-16 h-16 text-white"/></button>})}</div>, !isEmbedded);
  if (state === ClientState.ANSWERED) return commonUI(<div className="flex flex-col items-center justify-center min-h-full text-white text-center"><div className="text-6xl mb-4 animate-pulse">🚀</div><h2 className="text-3xl font-bold">{t.sent}</h2></div>, !isEmbedded);
  if (state === ClientState.FEEDBACK) { const ok = result?.correct; return commonUI(<div className={`flex flex-col items-center justify-center min-h-full text-white text-center ${ok?'bg-green-600':'bg-red-600'}`}><div className="text-8xl mb-6">{ok?"🌟":"💔"}</div><h2 className="text-4xl font-black mb-4">{ok?t.correct:t.wrong}</h2><div className="text-6xl font-black mb-8">{ok?`+${result.points}`:"0"}</div><div className="bg-black/20 px-6 py-3 rounded-xl"><div className="text-xs uppercase font-bold opacity-75">{t.points}</div><div className="text-2xl font-bold">{result.score}</div></div></div>, !isEmbedded); }
  if (state === ClientState.GAME_OVER) return commonUI(<div className="flex flex-col items-center justify-center min-h-full text-white text-center"><h1 className="text-4xl font-black mb-8">{t.result}</h1><div className="text-xl mb-2">{t.rank}</div><div className="text-8xl font-black text-yellow-400 mb-6">{result?.rank||"-"}</div><Button onClick={()=>window.location.reload()} className="mt-8">{t.home}</Button></div>, !isEmbedded);
  return null;
}

// --- MAIN APP ---
const App = () => {
    const [mode, setMode] = useState<'HOME' | 'LOCAL' | 'HOST' | 'JOIN'>('HOME');
    const [lang, setLang] = useState<Language>(() => loadSettings().lang as Language);
    const [theme, setTheme] = useState<Theme>(() => THEMES[loadSettings().themeId] || THEMES.default);

    useEffect(() => {
        saveSettings(lang, theme.id);
    }, [lang, theme]);

    if (mode === 'LOCAL') return <LocalApp theme={theme} lang={lang} />;
    if (mode === 'HOST') return <HostApp theme={theme} lang={lang} onBack={() => setMode('HOME')} />;
    if (mode === 'JOIN') return <ClientApp theme={theme} lang={lang} onBack={() => setMode('HOME')} />;

    return (
        <Layout theme={theme} showHeader={false}>
            <div className="flex flex-col items-center justify-center min-h-screen relative z-20">
                <div className="absolute top-4 right-4 flex gap-2">
                     <button onClick={() => setLang(l => l === 'DE' ? 'EN' : 'DE')} className="px-3 py-1 bg-white/10 rounded-full text-white font-bold">{lang}</button>
                </div>
                <h1 className="text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 mb-12 drop-shadow-lg text-center px-4">Herr Raza</h1>
                <div className="grid gap-6 w-full max-w-md px-6">
                    <Button onClick={() => setMode('LOCAL')} className="w-full py-6 text-xl shadow-2xl border border-white/20">{TEXTS[lang].localGame}</Button>
                    <div className="grid grid-cols-2 gap-4">
                        <Button onClick={() => setMode('HOST')} variant="secondary" className="w-full py-4 text-sm">{TEXTS[lang].hostOnline}</Button>
                        <Button onClick={() => setMode('JOIN')} variant="secondary" className="w-full py-4 text-sm">{TEXTS[lang].joinGame}</Button>
                    </div>
                </div>
                <div className="mt-12 flex gap-4 overflow-x-auto max-w-full px-4 pb-4">
                    {Object.values(THEMES).map(t => (
                        <button key={t.id} onClick={() => setTheme(t)} className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.gradient} border-2 ${theme.id === t.id ? 'border-white scale-110' : 'border-transparent opacity-50'} transition-all shadow-lg`}></button>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default App;
