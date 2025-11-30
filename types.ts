
export enum GameState {
  WELCOME = 'WELCOME',
  LOADING = 'LOADING',
  LOBBY = 'LOBBY', // Waiting for players to join
  LEADERBOARD = 'LEADERBOARD', // Showing scores between rounds
  PLAYING = 'PLAYING', // Question is shown
  FEEDBACK = 'FEEDBACK', // Round results
  GAME_OVER = 'GAME_OVER',
  ERROR = 'ERROR'
}

export enum ClientState {
  CONNECTING = 'CONNECTING',
  JOINING = 'JOINING', // Entering name
  WAITING = 'WAITING', // Waiting for host
  PLAYING = 'PLAYING', // Answering
  ANSWERED = 'ANSWERED', // Waiting for others
  FEEDBACK = 'FEEDBACK', // Result of round
  GAME_OVER = 'GAME_OVER'
}

export enum Difficulty {
  EASY = 'Einfach',
  MEDIUM = 'Mittel',
  HARD = 'Schwer',
  EXTREME = 'Extrem'
}

export type Language = 'DE' | 'EN';

export interface Theme {
  id: string;
  name: string;
  gradient: string; // Background gradient class
  primary: string; // Button/Accent color class
  secondary: string; // Secondary elements
  gridColor: string; // Color of the background grid
  accentText: string; // Gradient text for titles
}

export interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  timeLimitSeconds: number;
  explanation?: string; // New: AI explanation why the answer is correct
  imageUrl?: string;
  imagePrompt?: string;
}

export interface Player {
  id: string;
  connectionId: string; // PeerJS connection ID
  name: string;
  avatar: string;
  score: number;
  streak: number;
  lastAnswerIndex: number | null; // For the current round
  lastAnswerCorrect: boolean | null;
  lastPointsEarned: number;
}

export interface QuizSession {
  gameId: string; // Peer ID of host
  topic: string;
  coverImage?: string; // Base64 image string
  difficulty: Difficulty;
  questions: Question[];
  currentQuestionIndex: number;
  players: Player[];
  language: Language;
}

export interface ShapeProps {
  className?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  isHost?: boolean;
}

// Network Messages

export type NetworkMessage = 
  | { type: 'JOIN'; name: string; avatar: string }
  | { type: 'WELCOME'; playerId: string; gameTopic: string; coverImage?: string; language: Language }
  | { type: 'START_GAME' }
  | { type: 'SHOW_LEADERBOARD' }
  | { type: 'QUESTION_START'; question: Question; current: number; total: number }
  | { type: 'ANSWER'; answerIndex: number }
  | { type: 'ROUND_END'; correctIndex: number; score: number; streak: number; points: number; isCorrect: boolean }
  | { type: 'GAME_OVER'; rank: number }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'DELETE_CHAT_MESSAGE'; messageId: string }
  | { type: 'REACTION'; emoji: string; senderId: string }; // New: Live Emoji Reaction
