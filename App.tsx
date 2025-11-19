import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Peer } from 'peerjs';
import QRCode from 'qrcode';
import { GameState, ClientState, Difficulty, QuizSession, Question, Player, NetworkMessage } from './types';
import { generateQuizQuestions, generateTopicSuggestions, generateQuizCover } from './services/geminiService';
import { Button } from './components/Button';
import { Triangle, Diamond, Circle, Square, Sparkles } from './components/Shapes';

// --- Constants ---
const AVATARS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🦄", "🐝", "🐞", "🦖", "👻", "🤖", "👽", "💩", "🤡", "🤠", "🎃"];
const PEER_ID_PREFIX = "herr-raza-game-";
const STORAGE_KEY = 'herr-raza-player-profile';

// --- Helper Functions ---

const loadProfile = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, avatar }));
    } catch (e) {}
};

const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + (i * 0.05));
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, now + (i * 0.05));
        gain.gain.linearRampToValueAtTime(0.1, now + (i * 0.05) + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.05) + 0.3);
        osc.start(now + (i * 0.05));
        osc.stop(now + (i * 0.05) + 0.3);
    });
  } catch (e) { console.error(e); }
};

const generateShortId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const formatGameId = (id: string) => {
    const num = id.replace(PEER_ID_PREFIX, '');
    if (num.length === 6) {
        return `${num.substring(0,3)} ${num.substring(3)}`;
    }
    return num; 
};

// --- Components ---

const Layout: React.FC<{ children: React.ReactNode; className?: string, showHeader?: boolean }> = ({ children, className = "", showHeader = true }) => (
  <div className={`min-h-screen bg-gray-100 flex flex-col overflow-hidden ${className}`}>
    {showHeader && (
        <header className="bg-raza-purple text-white p-4 shadow-md flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 bg-white rounded-sm rotate-45 flex items-center justify-center shadow-sm">
                <span className="text-raza-purple font-display font-bold -rotate-45 text-xl">R</span>
            </div>
            <h1 className="font-display text-2xl font-black tracking-tight">Herr Raza</h1>
        </div>
        </header>
    )}
    <main className="flex-1 flex flex-col relative w-full h-full overflow-y-auto">
      {children}
    </main>
  </div>
);

const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  let colorClass = 'bg-raza-purple';
  if (percentage < 30) colorClass = 'bg-raza-red';
  else if (percentage < 60) colorClass = 'bg-raza-yellow';
  return (
    <div className="w-full h-3 bg-gray-300 rounded-full overflow-hidden">
      <div className={`h-full transition-all duration-1000 ease-linear ${colorClass}`} style={{ width: `${percentage}%` }} />
    </div>
  );
};

const LocalhostWarning = () => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalhost) return null;
  return (
    <div className="bg-raza-yellow text-raza-dark px-4 py-2 text-sm font-bold text-center">
      ⚠️ Hinweis: Auf "localhost" können Handys evtl. nicht verbinden.
    </div>
  );
};

// --- PEER CONFIG ---
const PEER_CONFIG = {
    debug: 1,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ]
    }
};

// --- HOST APP ---

const HostApp = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.WELCOME);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [topic, setTopic] = useState('');
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [joinLink, setJoinLink] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameId, setGameId] = useState('');

  // PeerJS State
  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<Map<string, any>>(new Map()); 
  const timerRef = useRef<number | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (peerRef.current) peerRef.current.destroy();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 1. Initialize Host
  const initializeHost = async (gameTopic: string, questions: Question[], coverImage: string | null, retryCount = 0) => {
    if (retryCount > 3) {
        alert("Konnte keinen Game Room erstellen. Bitte versuche es erneut.");
        setGameState(GameState.WELCOME);
        return;
    }

    const shortId = generateShortId();
    const fullPeerId = `${PEER_ID_PREFIX}${shortId}`;
    
    if (peerRef.current) peerRef.current.destroy();

    const peer = new Peer(fullPeerId, PEER_CONFIG);
    peerRef.current = peer;

    peer.on('open', (id: string) => {
      setGameId(fullPeerId);

      const isBlob = window.location.protocol === 'blob:';
      const baseUrl = window.location.href.split('?')[0];
      const url = new URL(baseUrl);
      url.searchParams.set('gameId', fullPeerId);
      const fullJoinUrl = url.toString();
      setJoinLink(fullJoinUrl);

      if (!isBlob) {
        QRCode.toDataURL(fullJoinUrl, { width: 300, margin: 2, color: { dark: '#46178f' } })
            .then(url => setQrCodeUrl(url))
            .catch(err => console.error('QR Code generation failed', err));
      }

      setSession({
        gameId: fullPeerId,
        topic: gameTopic,
        coverImage: coverImage || undefined,
        difficulty,
        questions,
        currentQuestionIndex: 0,
        players: []
      });
      setGameState(GameState.LOBBY);
    });

    peer.on('connection', (conn: any) => {
      conn.on('data', (data: NetworkMessage) => {
        handleNetworkMessage(conn, data);
      });
      conn.on('close', () => {
         setSession(prev => {
             if(!prev) return null;
             return {
                 ...prev,
                 players: prev.players.filter(p => p.connectionId !== conn.connectionId)
             };
         });
      });
    });
    
    peer.on('error', (err: any) => {
        if (err.type === 'unavailable-id') {
            initializeHost(gameTopic, questions, coverImage, retryCount + 1);
        }
    });
  };

  const handleNetworkMessage = (conn: any, data: NetworkMessage) => {
    if (data.type === 'JOIN') {
      connectionsRef.current.set(conn.connectionId, conn);
      
      setSession(prev => {
        if (!prev) return null;
        const exists = prev.players.find(p => p.connectionId === conn.connectionId);
        if (exists) {
             conn.send({ type: 'WELCOME', playerId: exists.id, gameTopic: prev.topic, coverImage: prev.coverImage });
             return prev;
        }

        const newPlayer: Player = {
          id: conn.peer,
          connectionId: conn.connectionId,
          name: data.name.substring(0, 15),
          avatar: data.avatar || "😎",
          score: 0,
          streak: 0,
          lastAnswerIndex: null,
          lastAnswerCorrect: null,
          lastPointsEarned: 0
        };
        
        setTimeout(() => {
            if (conn.open) {
                conn.send({ type: 'WELCOME', playerId: newPlayer.id, gameTopic: prev.topic, coverImage: prev.coverImage });
            }
        }, 50);

        return { ...prev, players: [...prev.players, newPlayer] };
      });
    } 
    else if (data.type === 'ANSWER') {
      setSession(prev => {
        if (!prev || prev.currentQuestionIndex >= prev.questions.length) return prev;
        const playerIndex = prev.players.findIndex(p => p.connectionId === conn.connectionId);
        if (playerIndex === -1) return prev;
        if (prev.players[playerIndex].lastAnswerIndex !== null) return prev;

        const updatedPlayers = [...prev.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          lastAnswerIndex: data.answerIndex
        };
        return { ...prev, players: updatedPlayers };
      });
    }
  };

  const broadcast = (msg: NetworkMessage) => {
    connectionsRef.current.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  };

  const handleGenerateTopics = async () => {
    setIsGeneratingTopics(true);
    try {
      const suggestions = await generateTopicSuggestions(topic);
      setSuggestedTopics(suggestions);
    } catch (e) { console.error(e); } 
    finally { setIsGeneratingTopics(false); }
  };

  const createGame = async () => {
    if (!topic) return;
    setGameState(GameState.LOADING);
    setLoadingMessage(`Quiz wird generiert...`);
    
    try {
      // Generate questions and cover image in parallel
      const [questions, coverImage] = await Promise.all([
        generateQuizQuestions(topic, difficulty, questionCount),
        generateQuizCover(topic)
      ]);

      await initializeHost(topic, questions, coverImage);
    } catch (e) {
      console.error(e);
      alert("Fehler bei der Erstellung. Bitte versuche es erneut.");
      setGameState(GameState.WELCOME);
    }
  };

  const startGame = () => {
    if (!session) return;
    broadcast({ type: 'START_GAME' });
    startRound();
  };

  const startRound = () => {
    if (!session) return;
    const q = session.questions[session.currentQuestionIndex];
    
    setSession(prev => {
        if(!prev) return null;
        return {
            ...prev,
            players: prev.players.map(p => ({...p, lastAnswerIndex: null, lastPointsEarned: 0, lastAnswerCorrect: null}))
        };
    });

    setGameState(GameState.PLAYING);
    broadcast({ 
      type: 'QUESTION_START', 
      question: q, 
      current: session.currentQuestionIndex + 1, 
      total: session.questions.length 
    });

    setTimeLeft(q.timeLimitSeconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endRound = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setSession(prev => {
      if (!prev) return null;
      const currentQ = prev.questions[prev.currentQuestionIndex];
      const updatedPlayers = prev.players.map(p => {
        const isCorrect = p.lastAnswerIndex === currentQ.correctIndex;
        let points = 0;
        if (isCorrect) {
          playSuccessSound();
          points = 1000 + (p.streak * 100); 
        }
        return {
          ...p,
          score: p.score + points,
          streak: isCorrect ? p.streak + 1 : 0,
          lastAnswerCorrect: isCorrect,
          lastPointsEarned: points
        };
      });

      updatedPlayers.forEach(p => {
        const conn = connectionsRef.current.get(p.connectionId);
        if (conn && conn.open) {
          conn.send({
            type: 'ROUND_END',
            correctIndex: currentQ.correctIndex,
            score: p.score,
            streak: p.streak,
            points: p.lastPointsEarned,
            isCorrect: !!p.lastAnswerCorrect
          });
        }
      });
      return { ...prev, players: updatedPlayers };
    });
    setGameState(GameState.FEEDBACK);
  };

  const nextQuestion = () => {
    if (!session) return;
    if (session.currentQuestionIndex + 1 >= session.questions.length) {
      const ranked = [...session.players].sort((a, b) => b.score - a.score);
      ranked.forEach((p, index) => {
          const conn = connectionsRef.current.get(p.connectionId);
          if(conn && conn.open) conn.send({ type: 'GAME_OVER', rank: index + 1 });
      });
      setGameState(GameState.GAME_OVER);
    } else {
      setSession(prev => prev ? ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }) : null);
      setTimeout(() => startRound(), 100);
    }
  };

  const skipCurrentQuestion = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    nextQuestion();
  };

  const openTestPlayer = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('gameId', gameId);
      window.open(url.toString(), '_blank');
  };

  // --- Host Renders ---

  if (gameState === GameState.WELCOME) {
    return (
      <Layout className="bg-raza-purple">
         <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center py-8">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full animate-slide-in">
            <h1 className="text-4xl font-display font-black text-raza-purple mb-2">Herr Raza</h1>
            <p className="text-gray-600 mb-6 font-medium">Erstelle ein Live-Quiz.</p>
            
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Thema</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="z.B. 80er Jahre, Mathe..."
                    className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-raza-blue outline-none font-bold text-lg"
                  />
                  <button 
                      onClick={handleGenerateTopics}
                      disabled={isGeneratingTopics}
                      className="bg-raza-yellow text-white p-3 rounded-lg font-bold hover:brightness-110"
                  >
                      {isGeneratingTopics ? "..." : <Sparkles className="w-6 h-6" />}
                  </button>
                </div>
                {suggestedTopics.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {suggestedTopics.map((t, i) => (
                            <button key={i} onClick={() => setTopic(t)} className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                                {t}
                            </button>
                        ))}
                    </div>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Schwierigkeit</label>
                <div className="grid grid-cols-2 gap-2">
                    {Object.values(Difficulty).map((d) => (
                        <button key={d} onClick={() => setDifficulty(d)} className={`px-3 py-2 rounded font-bold text-sm ${difficulty === d ? 'bg-raza-dark text-white' : 'bg-gray-100 text-gray-500'}`}>{d}</button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Anzahl Fragen</label>
                <div className="flex justify-between gap-2">
                    {[5, 10, 15, 20, 30].map((count) => (
                        <button key={count} onClick={() => setQuestionCount(count)} className={`flex-1 py-2 rounded font-bold text-sm ${questionCount === count ? 'bg-raza-dark text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</button>
                    ))}
                </div>
              </div>

              <Button onClick={createGame} className="w-full mt-4" disabled={!topic}>Lobby erstellen</Button>
            </div>
          </div>
         </div>
      </Layout>
    );
  }

  if (gameState === GameState.LOADING) {
      return (
        <Layout className="bg-raza-purple">
            <div className="flex flex-col items-center justify-center h-full text-white">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-bold">{loadingMessage}</h2>
                <p className="text-white/70 text-sm mt-2">Erstelle Fragen & Bild...</p>
            </div>
        </Layout>
      );
  }

  if (gameState === GameState.LOBBY && session) {
    const isBlob = window.location.protocol === 'blob:';
    return (
      <Layout className="bg-raza-blue">
        <LocalhostWarning />
        <div className="flex flex-col h-full p-6 text-center text-white overflow-y-auto">
           <div className="flex-1 flex flex-col items-center justify-start min-h-0">
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-5xl mb-8">
                 <div className="flex flex-col items-center">
                    {!isBlob && qrCodeUrl && (
                        <div className="bg-white p-4 rounded-xl shadow-xl mb-4 animate-pop min-w-[200px]">
                            <img src={qrCodeUrl} alt="Join QR Code" className="w-48 h-48 object-contain" />
                        </div>
                    )}
                    <div className="flex flex-col items-center gap-2">
                        <h2 className="text-xl font-display font-bold opacity-90">Game ID:</h2>
                        <div className="bg-white text-raza-purple font-black text-4xl md:text-6xl px-8 py-4 rounded-xl shadow-2xl tracking-widest select-all text-center">
                            {formatGameId(session.gameId)}
                        </div>
                    </div>
                 </div>
                 
                 {session.coverImage && (
                    <div className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl border-4 border-white/20 animate-slide-in">
                        <img src={`data:image/jpeg;base64,${session.coverImage}`} className="w-full h-auto object-cover" alt="Quiz Cover" />
                    </div>
                 )}
              </div>

              <div className="flex flex-wrap justify-center gap-3 max-w-4xl mt-4">
                  {session.players.map(p => (
                      <div key={p.id} className="px-4 py-2 bg-white text-raza-blue font-bold rounded-full shadow-md animate-pop flex items-center gap-2">
                          <span>{p.avatar || '😀'}</span>
                          <span>{p.name}</span>
                      </div>
                  ))}
                  {session.players.length === 0 && <div className="opacity-50 animate-pulse">Warte auf Spieler...</div>}
              </div>
           </div>
           <div className="py-4 border-t border-white/10 flex justify-between items-center px-4 md:px-8 mt-4">
              <div className="text-xl font-bold">{session.players.length} Spieler</div>
               <div className="flex gap-2">
                    <button onClick={openTestPlayer} className="text-sm font-bold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors">
                      📱 Test-Spieler
                    </button>
                    <Button onClick={startGame} disabled={session.players.length === 0} variant="success" size="lg">
                        Spiel starten
                    </Button>
               </div>
           </div>
        </div>
      </Layout>
    );
  }

  // ... GameState.PLAYING, FEEDBACK, GAME_OVER ...
  
  if (gameState === GameState.PLAYING && session) {
    const currentQ = session.questions[session.currentQuestionIndex];
    const answeredCount = session.players.filter(p => p.lastAnswerIndex !== null).length;
    
    return (
      <Layout>
        <div className="flex flex-col h-full">
            <div className="bg-white p-4 shadow-sm flex justify-between items-center text-lg font-bold text-raza-purple">
                <span>Frage {session.currentQuestionIndex + 1} / {session.questions.length}</span>
                <div className="flex items-center gap-2">
                   <span>{answeredCount}</span>
                   <span className="text-gray-400 text-sm">Antworten</span>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-gray-50 overflow-y-auto">
               <div className="bg-white p-6 md:p-10 rounded-2xl shadow-lg max-w-5xl w-full text-center mb-8 md:mb-12">
                   <h2 className="text-2xl md:text-4xl font-display font-bold leading-tight text-gray-800">
                       {currentQ.text}
                   </h2>
               </div>

               <div className="flex items-center gap-6 mb-6">
                   <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center text-2xl md:text-4xl font-bold text-white shadow-xl ${timeLeft < 10 ? 'bg-raza-red animate-pulse' : 'bg-raza-purple'}`}>
                       {timeLeft}
                   </div>
                   <div className="w-48 md:w-96">
                       <ProgressBar current={timeLeft} total={currentQ.timeLimitSeconds} />
                   </div>
               </div>

               <div className="mb-8 flex justify-center">
                   <Button onClick={skipCurrentQuestion} variant="secondary" size="sm" className="whitespace-nowrap">
                       Frage überspringen ⏩
                   </Button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl">
                   {currentQ.options.map((opt, idx) => {
                       const colors = ["bg-raza-red", "bg-raza-blue", "bg-raza-yellow", "bg-raza-green"];
                       const Shapes = [Triangle, Diamond, Circle, Square];
                       const Shape = Shapes[idx];
                       const answeredPlayers = session.players.filter(p => p.lastAnswerIndex === idx);

                       return (
                           <div key={idx} className={`${colors[idx]} p-4 md:p-6 rounded-xl shadow-md flex flex-col`}>
                               <div className="flex items-center mb-3">
                                   <Shape className="w-8 h-8 md:w-12 md:h-12 text-white mr-4 flex-shrink-0" />
                                   <span className="text-white font-bold text-xl md:text-2xl leading-tight">{opt}</span>
                               </div>
                               <div className="flex flex-wrap gap-2 min-h-[2rem]">
                                   {answeredPlayers.map(p => (
                                       <div key={p.id} className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center text-lg shadow-sm animate-pop" title={p.name}>
                                           {p.avatar}
                                       </div>
                                   ))}
                               </div>
                           </div>
                       );
                   })}
               </div>
            </div>
        </div>
      </Layout>
    );
  }

  if (gameState === GameState.FEEDBACK && session) {
      const currentQ = session.questions[session.currentQuestionIndex];
      const counts = [0,0,0,0];
      session.players.forEach(p => {
          if(p.lastAnswerIndex !== null) counts[p.lastAnswerIndex]++;
      });

      return (
          <Layout>
             <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
                 <h2 className="text-center text-2xl md:text-3xl font-bold text-gray-700 mb-4 md:mb-8">{currentQ.text}</h2>
                 <div className="flex-1 flex items-end justify-center gap-2 md:gap-8 pb-12 px-2">
                     {currentQ.options.map((opt, idx) => {
                         const isCorrect = idx === currentQ.correctIndex;
                         const height = Math.max(10, counts[idx] * 10);
                         const colors = ["bg-raza-red", "bg-raza-blue", "bg-raza-yellow", "bg-raza-green"];
                         return (
                             <div key={idx} className={`flex flex-col items-center w-1/4 md:w-1/5 ${isCorrect ? '' : 'opacity-50'}`}>
                                 <div className="mb-2 text-xl md:text-2xl font-black text-gray-600">{counts[idx]}</div>
                                 <div className={`${colors[idx]} w-full rounded-t-lg transition-all duration-1000 relative ${isCorrect ? 'animate-boost shadow-[0_0_30px_rgba(255,255,255,0.6)] z-10' : ''}`} style={{ height: `${height}%` }}>
                                    {isCorrect && <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-3xl md:text-4xl animate-bounce">✅</div>}
                                 </div>
                                 <div className={`mt-4 p-2 md:p-3 rounded-lg w-full text-center font-bold text-white text-xs md:text-base ${colors[idx]} ${isCorrect ? 'animate-pulse' : ''}`}>
                                     {isCorrect ? "Richtig" : " "}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
                 <div className="flex justify-center">
                     <Button onClick={nextQuestion} size="lg">
                        {session.currentQuestionIndex + 1 >= session.questions.length ? "Podium ansehen" : "Nächste Frage"}
                     </Button>
                 </div>
             </div>
          </Layout>
      );
  }

  if (gameState === GameState.GAME_OVER && session) {
     const sorted = [...session.players].sort((a,b) => b.score - a.score);
     const [first, second, third] = sorted;
     
     return (
         <Layout className="bg-raza-dark">
             <div className="flex flex-col items-center justify-center h-full text-white p-6">
                 <h1 className="text-5xl font-display font-black mb-12 text-raza-yellow">Podium</h1>
                 <div className="flex items-end gap-2 md:gap-4 mb-12 h-80 md:h-96 w-full max-w-3xl justify-center">
                     {second && (
                         <div className="flex flex-col items-center animate-slide-in w-1/3" style={{animationDelay: '0.2s'}}>
                             <div className="mb-2 font-bold text-xl flex flex-col items-center">
                                 <span className="text-sm text-raza-blue font-black mb-1 bg-white px-2 py-0.5 rounded-full">2. Platz</span>
                                 <span className="text-3xl">{second.avatar}</span>
                                 <span className="truncate max-w-[100px]">{second.name}</span>
                             </div>
                             <div className="w-full h-48 bg-raza-blue rounded-t-lg flex items-end justify-center pb-4 shadow-xl"><span className="text-3xl font-black">2</span></div>
                             <div className="mt-2 font-bold opacity-75">{second.score} Pkt</div>
                         </div>
                     )}
                     <div className="flex flex-col items-center z-10 animate-slide-in w-1/3" style={{animationDelay: '0.4s'}}>
                         <div className="text-5xl md:text-6xl mb-4 animate-bounce">👑</div>
                         <div className="mb-2 font-bold text-3xl text-raza-yellow flex flex-col items-center">
                            <span className="text-lg text-raza-yellow font-black mb-1 bg-white px-3 py-0.5 rounded-full shadow-lg">1. Platz</span>
                            <span className="text-5xl">{first?.avatar}</span>
                            <span className="truncate max-w-[120px]">{first?.name}</span>
                         </div>
                         <div className="w-full h-64 bg-raza-yellow text-raza-dark rounded-t-lg flex items-end justify-center pb-4 shadow-2xl"><span className="text-5xl font-black">1</span></div>
                         <div className="mt-2 font-bold text-xl">{first?.score} Pkt</div>
                     </div>
                     {third && (
                         <div className="flex flex-col items-center animate-slide-in w-1/3" style={{animationDelay: '0.3s'}}>
                             <div className="mb-2 font-bold text-xl flex flex-col items-center">
                                 <span className="text-sm text-raza-red font-black mb-1 bg-white px-2 py-0.5 rounded-full">3. Platz</span>
                                 <span className="text-3xl">{third.avatar}</span>
                                 <span className="truncate max-w-[100px]">{third.name}</span>
                             </div>
                             <div className="w-full h-32 bg-raza-red rounded-t-lg flex items-end justify-center pb-4 shadow-xl"><span className="text-3xl font-black">3</span></div>
                             <div className="mt-2 font-bold opacity-75">{third.score} Pkt</div>
                         </div>
                     )}
                 </div>
                 <Button onClick={() => window.location.reload()} variant="secondary">Neues Spiel</Button>
             </div>
         </Layout>
     );
  }

  return <div className="flex items-center justify-center h-screen text-white bg-raza-purple">Lade Host...</div>;
};

// --- CLIENT APP ---

const ClientApp = ({ initialGameId }: { initialGameId?: string }) => {
  const [state, setState] = useState<ClientState>(initialGameId ? ClientState.CONNECTING : ClientState.JOINING);
  const [gameId, setGameId] = useState(initialGameId || '');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [result, setResult] = useState<{correct: boolean, points: number, score: number, rank: number} | null>(null);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [gameTopic, setGameTopic] = useState<string>('');
  const [connectionError, setConnectionError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);

  // Connect to Host
  const connectToGame = useCallback((inputCode: string) => {
      if (!inputCode) return;
      
      // Cleanup previous
      if (peerRef.current) peerRef.current.destroy();
      setConnectionError('');
      setIsJoining(false);

      let targetPeerId = inputCode.trim().replace(/\s/g, '');
      if (!targetPeerId.startsWith(PEER_ID_PREFIX)) {
          targetPeerId = `${PEER_ID_PREFIX}${targetPeerId}`;
      }

      const peer = new Peer(undefined as any, PEER_CONFIG);
      peerRef.current = peer;

      peer.on('open', () => {
        setState(ClientState.CONNECTING);
        const conn = peer.connect(targetPeerId);
        connRef.current = conn;

        const timeout = setTimeout(() => {
            if (state === ClientState.CONNECTING) {
                setConnectionError("Zeitüberschreitung. Ist der Host online?");
                setState(ClientState.JOINING);
            }
        }, 5000);

        conn.on('open', () => {
          clearTimeout(timeout);
          setState(ClientState.JOINING);
        });

        conn.on('data', (data: NetworkMessage) => {
          handleMessage(data);
        });
        
        conn.on('error', (err) => {
            console.error("Conn error", err);
            setConnectionError("Verbindung fehlgeschlagen. Code prüfen.");
            setState(ClientState.JOINING);
        });

        conn.on('close', () => {
            alert("Verbindung zum Host verloren.");
            window.location.href = window.location.origin;
        });
      });

      peer.on('error', (err) => {
          console.error("Peer error", err);
          setConnectionError("Netzwerkfehler.");
          setState(ClientState.JOINING);
      });
  }, []);

  useEffect(() => {
      if(initialGameId) {
          connectToGame(initialGameId);
      }
      return () => {
          if(peerRef.current) peerRef.current.destroy();
      };
  }, [initialGameId, connectToGame]);

  const handleMessage = (data: NetworkMessage) => {
      switch(data.type) {
          case 'WELCOME':
              setIsJoining(false);
              setGameTopic(data.gameTopic);
              setCoverImage(data.coverImage);
              setState(ClientState.WAITING);
              break;
          case 'START_GAME':
              setState(ClientState.WAITING);
              break;
          case 'QUESTION_START':
              setCurrentQ(data.question);
              setState(ClientState.PLAYING);
              setResult(null);
              break;
          case 'ROUND_END':
              setResult({ correct: data.isCorrect, points: data.points, score: data.score, rank: 0 });
              setState(ClientState.FEEDBACK);
              break;
          case 'GAME_OVER':
              setResult(prev => prev ? ({...prev, rank: data.rank}) : {correct: false, points:0, score:0, rank: data.rank});
              setState(ClientState.GAME_OVER);
              break;
      }
  };

  const joinGame = () => {
      if (!connRef.current && gameId) {
          connectToGame(gameId);
          return;
      }
      if(!name.trim() || !connRef.current) return;

      setIsJoining(true);
      
      setTimeout(() => {
          if (isJoining) {
              setIsJoining(false);
              setConnectionError("Keine Antwort vom Host. Versuche es erneut.");
          }
      }, 5000);

      try {
        // Save profile locally for convenience
        saveProfile(name.trim(), avatar);
        connRef.current.send({ type: 'JOIN', name: name.trim(), avatar });
      } catch (e) {
          setIsJoining(false);
          setConnectionError("Sende-Fehler. Neu verbinden...");
      }
  };

  const sendAnswer = (idx: number) => {
      if(!connRef.current) return;
      connRef.current.send({ type: 'ANSWER', answerIndex: idx });
      setState(ClientState.ANSWERED);
  };

  // --- Client Renders ---
  // Security Note: Client Layout intentionally hides header links to prevent switching to Host mode

  // Manual Entry
  if (!initialGameId && !connRef.current) {
       return (
        <Layout className="bg-raza-purple">
            <div className="flex flex-col items-center justify-center h-full p-6">
                <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm text-center">
                    <h1 className="text-2xl font-display font-black text-raza-purple mb-6">Spiel beitreten</h1>
                    {connectionError && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm font-bold">{connectionError}</div>}
                    <input 
                        type="text" 
                        placeholder="Game ID (z.B. 123 456)" 
                        value={gameId}
                        onChange={e => setGameId(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 mb-4 font-mono text-center text-xl tracking-widest uppercase"
                    />
                    <Button onClick={() => connectToGame(gameId)} disabled={!gameId}>Verbinden</Button>
                    <button onClick={() => window.location.reload()} className="mt-4 text-gray-500 underline text-sm">Zurück</button>
                </div>
            </div>
        </Layout>
       );
  }

  if (state === ClientState.CONNECTING) {
      return <Layout className="bg-raza-purple text-white flex items-center justify-center" showHeader={false}><div className="animate-pulse text-xl font-bold">Verbinde zum Raum...</div></Layout>;
  }

  if (state === ClientState.JOINING) {
      return (
          <Layout className="bg-raza-purple" showHeader={false}>
              <div className="flex flex-col items-center justify-center h-full p-6">
                  <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
                      <h1 className="text-2xl font-display font-black text-raza-purple mb-4 text-center">Wer bist du?</h1>
                      {connectionError && <div className="bg-red-50 text-red-500 p-2 text-xs font-bold rounded mb-2 text-center">{connectionError}</div>}
                      <div className="flex justify-center mb-4">
                        <div className="text-6xl cursor-pointer select-none hover:scale-110 transition-transform" onClick={() => setAvatar(AVATARS[(AVATARS.indexOf(avatar) + 1) % AVATARS.length])}>
                          {avatar}
                        </div>
                      </div>
                      <div className="text-center text-xs text-gray-400 mb-4">Tippen zum Ändern</div>
                      <input 
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Dein Spitzname"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 mb-4 font-bold text-lg focus:border-raza-blue outline-none"
                        maxLength={15}
                      />
                      <Button onClick={joinGame} className="w-full" disabled={!name.trim() || isJoining}>
                          {isJoining ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : "Los geht's!"}
                      </Button>
                  </div>
              </div>
          </Layout>
      );
  }

  if (state === ClientState.WAITING) {
      return (
          <Layout className="bg-raza-dark text-white" showHeader={false}>
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <h2 className="text-3xl font-bold mb-2">Du bist drin!</h2>
                  <div className="text-xl opacity-75 mb-8">Sieh auf den großen Bildschirm</div>
                  
                  {coverImage && (
                      <div className="w-64 h-auto rounded-lg shadow-2xl border-4 border-white/10 mb-8 overflow-hidden animate-slide-in">
                           <img src={`data:image/jpeg;base64,${coverImage}`} alt="Quiz Topic" className="w-full h-full object-cover" />
                      </div>
                  )}

                  <div className="animate-pulse text-6xl mb-4">{avatar}</div>
                  <div className="mt-4 font-bold bg-white/10 px-6 py-3 rounded-full text-xl">{name}</div>
              </div>
          </Layout>
      );
  }

  if (state === ClientState.PLAYING) {
      const shapes = [Triangle, Diamond, Circle, Square];
      const colors = ["bg-raza-red", "bg-raza-blue", "bg-raza-yellow", "bg-raza-green"];

      return (
          <div className="h-screen grid grid-cols-2 grid-rows-2 gap-3 p-3 bg-gray-900">
              {shapes.map((Shape, idx) => (
                  <button 
                    key={idx}
                    onClick={() => sendAnswer(idx)}
                    className={`${colors[idx]} rounded-xl flex items-center justify-center active:scale-95 transition-transform shadow-[0_4px_0_0_rgba(0,0,0,0.2)]`}
                  >
                      <Shape className="w-20 h-20 text-white" />
                  </button>
              ))}
          </div>
      );
  }

  if (state === ClientState.ANSWERED) {
      return (
        <Layout className="bg-raza-blue text-white" showHeader={false}>
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <span className="text-4xl">🚀</span>
                </div>
                <h2 className="text-2xl font-bold">Antwort gesendet!</h2>
                <p className="opacity-75">Viel Glück...</p>
            </div>
        </Layout>
      );
  }

  if (state === ClientState.FEEDBACK) {
      const isCorrect = result?.correct;
      return (
          <Layout className={isCorrect ? "bg-raza-green" : "bg-raza-red"} showHeader={false}>
             <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center animate-pop">
                 <div className={`text-4xl font-bold mb-6 ${isCorrect ? 'animate-boost' : ''}`}>{isCorrect ? "Richtig!" : "Falsch"}</div>
                 <div className={`text-7xl font-black mb-8 ${isCorrect ? 'animate-boost' : ''}`} style={{ animationDelay: '0.2s' }}>{isCorrect ? `+${result?.points}` : "X"}</div>
                 <div className="bg-black/20 p-6 rounded-2xl w-full max-w-xs backdrop-blur-sm">
                     <div className="text-sm uppercase font-bold opacity-75 mb-1">Gesamtpunkte</div>
                     <div className="text-4xl font-bold">{result?.score}</div>
                 </div>
             </div>
          </Layout>
      );
  }

  if (state === ClientState.GAME_OVER) {
      return (
          <Layout className="bg-raza-dark text-white" showHeader={false}>
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <h1 className="text-4xl font-bold mb-8">Spiel vorbei</h1>
                  <div className="text-xl mb-2">Du hast den</div>
                  <div className="text-7xl font-black text-raza-yellow mb-6">{result?.rank}. Platz</div>
                  <div className="text-xl">erreicht!</div>
              </div>
          </Layout>
      );
  }

  return null;
};

// --- HOME / ENTRY ---

const Home = ({ onModeSelect }: { onModeSelect: (mode: 'HOST' | 'JOIN') => void }) => {
    return (
        <Layout className="bg-raza-purple">
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
                <div className="mb-8 animate-pop">
                    <div className="w-24 h-24 bg-white rounded-lg rotate-12 flex items-center justify-center shadow-2xl mx-auto mb-4">
                        <span className="text-raza-purple font-display font-black -rotate-12 text-6xl">R</span>
                    </div>
                    <h1 className="text-5xl font-display font-black text-white tracking-tight">Herr Raza</h1>
                    <p className="text-white/80 text-xl mt-2">Das KI-Quiz für alle.</p>
                </div>

                <div className="flex flex-col gap-4 w-full max-w-xs animate-slide-in" style={{animationDelay: '0.2s'}}>
                    <button 
                        onClick={() => onModeSelect('HOST')}
                        className="bg-white text-raza-purple font-bold text-xl py-4 px-8 rounded-xl shadow-[0_6px_0_0_rgba(0,0,0,0.2)] active:translate-y-[6px] active:shadow-none transition-all"
                    >
                        Quiz erstellen
                    </button>
                    <button 
                        onClick={() => onModeSelect('JOIN')}
                        className="bg-black/20 text-white border-2 border-white/30 font-bold text-xl py-4 px-8 rounded-xl hover:bg-black/30 transition-all"
                    >
                        Beitreten
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [mode, setMode] = useState<'HOME' | 'HOST' | 'CLIENT'>('HOME');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('gameId');
    if (id) {
        setGameId(id);
        setMode('CLIENT');
    }
  }, []);

  if (mode === 'HOME') {
      return <Home onModeSelect={(m) => setMode(m === 'HOST' ? 'HOST' : 'CLIENT')} />;
  }

  if (mode === 'CLIENT') {
    return <ClientApp initialGameId={gameId || undefined} />;
  } else {
    return <HostApp />;
  }
}