import { create } from 'zustand';
import { Chess, Square, Move, PieceSymbol, Color } from 'chess.js';
import { useStockfish } from '@/hooks/useStockfish';

// ===== Types =====
export type GameMode = 'friend' | 'bot';
export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';
export type PieceTheme = 'classic' | 'line' | 'neo';
export type PlayerSide = 'white' | 'black' | 'random';
export type PieceSize = 'small' | 'medium' | 'large';

export type Preset = '3|0' | '5|0' | '10|0' | '15|10';
type WB = 'w'|'b';

export interface ClockSide { remainingMs: number; incrementMs: number; }
export interface TimeState {
  preset: Preset | 'custom';
  customBaseMin?: number;
  customIncSec?: number;
  startedOnFirstMove: boolean;
  isRunning: boolean;
  lastTickAt: number | null;
  turnSide: WB; // whose clock is ticking
  whiteClock: ClockSide;
  blackClock: ClockSide;
  outOfTime: WB | null;
}

export type MoveQuality = 'Best'|'Excellent'|'Inaccuracy'|'Mistake'|'Blunder';
export interface AnnotatedMove {
  ply: number;                // 1-based ply count
  san: string;                // SAN
  nag?: string;               // !, ?!, ?, ??
  quality?: MoveQuality;
  evalBefore?: { cp:number|null; mate:number|null };
  evalAfter?:  { cp:number|null; mate:number|null };
  timeSpentMs?: number;       // time spent by mover
}

export interface ThemeDef {
  key: PieceTheme;
  name: string;
  board: { light: string; dark: string };
  highlight: { move: string; capture: string; last: string; check: string };
  pieceAssetBase: string; // e.g. "/assets/pieces/line"
}

const ls = (k: string) => localStorage.getItem(k);

// one-time default
if (ls('theme-migrated-line') !== '1') {
  localStorage.setItem('chess-piece-theme', 'line');
  localStorage.setItem('theme-migrated-line', '1');
}

// ===== Local Eval Helper (fallback) =====
const PIECE_CP = { p:100, n:320, b:330, r:500, q:900, k:0 };
function localEvalCp(chess: Chess): number {
  let cp = 0;
  const board = chess.board();
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      const sign = sq.color === 'w' ? 1 : -1;
      // @ts-ignore
      cp += sign * (PIECE_CP)[sq.type];
    }
  }
  const legal = chess.moves({ verbose: true }) as Move[];
  const mob = legal.length;
  cp += (chess.turn() === 'w' ? 1 : -1) * Math.min(30, mob) * 1;
  return cp;
}

function presetToMs(p: Preset) {
  const [m, inc] = p.split('|').map(Number);
  return { base: m*60_000, inc: inc*1000 };
}

// ===== PGN Utilities =====
function msToClock(ms:number) {
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  const ss = String(s%60).padStart(2,'0');
  return `${m}:${ss}`;
}
function resultToTag(chess: Chess) {
  if (chess.isCheckmate()) return chess.turn()==='w' ? '0-1' : '1-0';
  if (chess.isDraw()) return '1/2-1/2';
  return '*';
}
function pad2(n:number){ return String(n).padStart(2,'0'); }
function centipawnsFromEval(e:{cp:number|null; mate:number|null} | null): number | null {
  if (!e) return null;
  if (e.mate != null) return e.mate > 0 ? 10000 : -10000; // clamp
  return e.cp ?? null;
}
function classifyByDelta(before:{cp:number|null; mate:number|null} | null, after:{cp:number|null; mate:number|null} | null): { nag?:string; quality?:MoveQuality } {
  const b = centipawnsFromEval(before);
  const a = centipawnsFromEval(after);
  if (b==null || a==null) return {};
  const delta = a - b; // improvement from mover POV
  if (delta >= 30) return { nag:'!', quality:'Excellent' };
  if (delta >= -50) return { quality:'Best' };
  if (delta >= -150) return { nag:'?!', quality:'Inaccuracy' };
  if (delta >= -300) return { nag:'?',  quality:'Mistake' };
  return { nag:'??', quality:'Blunder' };
}

// ===== IndexedDB (Games) =====
const DB_NAME = 'scholars-chess';
const DB_VER = 1;
const STORE = 'games';

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function idbAddGame(record:any){ const db=await openDB(); return new Promise<number>((res,rej)=>{ const tx=db.transaction(STORE,'readwrite'); const rq=tx.objectStore(STORE).add(record); rq.onsuccess=()=>res(rq.result as number); rq.onerror=()=>rej(rq.error); });}
async function idbPutGame(record:any){ const db=await openDB(); return new Promise<void>((res,rej)=>{ const tx=db.transaction(STORE,'readwrite'); const rq=tx.objectStore(STORE).put(record); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); });}
async function idbListGames(){ const db=await openDB(); return new Promise<any[]>((res,rej)=>{ const tx=db.transaction(STORE,'readonly'); const rq=tx.objectStore(STORE).getAll(); rq.onsuccess=()=>res(rq.result||[]); rq.onerror=()=>rej(rq.error); });}
async function idbDeleteGame(id:number){ const db=await openDB(); return new Promise<void>((res,rej)=>{ const tx=db.transaction(STORE,'readwrite'); const rq=tx.objectStore(STORE).delete(id); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); });}

// ===== Store =====
interface GameState {
  chess: Chess;
  gameMode: GameMode;
  gameStatus: GameStatus;
  selectedSquare: Square | null;
  validMoves: Square[];
  lastMove: { from: Square; to: Square } | null;
  history: string[];
  currentPlayer: 'white' | 'black';
  isGameOver: boolean;
  winner: 'white' | 'black' | 'draw' | null;

  pendingPromotion: { from: Square; to: Square; color: WB } | null;

  // Settings / UI
  pieceTheme: PieceTheme;
  themeDefs: Record<PieceTheme, ThemeDef>;
  pieceSize: PieceSize;
  difficulty: number;
  playerSide: PlayerSide;
  botSide: Color;
  viewSide: Color;
  showEval: boolean;
  showThemePreview: boolean;

  // Engine eval (White POV centipawns or mate plies)
  evalCp: number | null;
  evalMate: number | null;

  // HUD helpers
  phaseLabel: 'opening'|'midgame'|'endgame';

  // Time controls (start-on-first-move, increments, pause/resume, timeout)
  time: TimeState;

  // Notation / annotations
  moves: AnnotatedMove[];
  lastMoveStartAt: number;

  // Review
  reviewCursor: number | null;
  previewFEN: string | null;

  // Saves / history
  currentGameId?: number;

  isThinking: boolean;
}

interface GameActions {
  // Basic
  setGameMode: (mode: GameMode) => void;
  selectSquare: (square: Square) => void;
  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => Promise<boolean>;
  confirmPromotion: (piece: PieceSymbol) => Promise<void>;
  cancelPromotion: () => void;
  undoMove: () => void;
  resetGame: () => void;
  updateGameStatus: () => void;

  // Settings
  setPieceTheme: (theme: PieceTheme) => void;
  setPieceSize: (size: PieceSize) => void;
  setDifficulty: (difficulty: number) => void;
  setPlayerSide: (side: PlayerSide) => void;
  applyStartingSide: () => void;
  setShowEval: (v: boolean) => void;
  toggleShowEval: () => void;
  toggleThemePreview: (v?: boolean) => void;

  // Clocks
  setPreset: (p: Preset) => void;
  setCustomTime: (baseMin:number, incSec:number) => void;
  pause: () => void;
  resume: () => void;
  tickClock: (deltaMs: number) => void; // keep external driver compatibility
  startOnFirstMove: () => void;
  applyIncrementAndSwap: () => void;

  // Engine / Bot
  makeStockfishMove: () => Promise<void>;
  updateEvaluation: () => Promise<{cp:number|null; mate:number|null}>;

  // Notation timing
  startMoveTimer: () => void;

  // PGN
  buildPGN: (headers?: Partial<Record<string,string>>) => string;

  // Saves
  autosaveSnapshot: () => Promise<void>;
  manualSave: (name:string) => Promise<number>;
  listSavedGames: () => Promise<any[]>;
  loadGame: (id:number) => Promise<void>;
  deleteGame: (id:number) => Promise<void>;

  // Review
  setReviewCursor: (i:number|null) => void;
  setPreviewPosition: (fen:string|null) => void;
}

// ===== Initial State =====
const initialChess = new Chess();
const defaultPreset: Preset = '5|0';
const { base:base0, inc:inc0 } = presetToMs(defaultPreset);

const initialGameState: GameState = {
  chess: initialChess,
  gameMode: 'friend',
  gameStatus: 'playing',
  selectedSquare: null,
  validMoves: [],
  lastMove: null,
  history: [],
  currentPlayer: 'white',
  isGameOver: false,
  winner: null,

  pendingPromotion: null,

  pieceTheme: (ls('chess-piece-theme') as PieceTheme) || 'line',
  themeDefs: {
    classic: {
      key: 'classic', name: 'Classic',
      board: { light: '#f0d9b5', dark: '#b58863' },
      highlight: { move:'#b4e7ff80', capture:'#ff9ea380', last:'#fff17680', check:'#ff525280' },
      pieceAssetBase: '/pieces/line'
    },
    line: {
      key: 'line', name: 'Line',
      board: { light: '#e8e8e8', dark: '#4d4d4d' },
      highlight: { move:'#90caf980', capture:'#ffab9180', last:'#ffd54f80', check:'#ef535080' },
      pieceAssetBase: '/pieces/line'
    },
    neo: {
      key: 'neo', name: 'Neo',
      board: { light: '#cdd6f4', dark: '#1e1e2e' },
      highlight: { move:'#94e2d580', capture:'#f38ba880', last:'#f9e2af80', check:'#f38ba880' },
      pieceAssetBase: '/pieces/line'
    },
  },
  pieceSize: (ls('chess-piece-size') as PieceSize) ?? 'medium',

  difficulty: Number(ls('chess-difficulty') || 1350),
  playerSide: (ls('chess-player-side') as PlayerSide) || 'white',
  botSide: 'b',
  viewSide: 'w',
  showEval: (ls('chess-show-eval') ?? '1') !== '0',
  showThemePreview: false,

  evalCp: 0,
  evalMate: null,

  phaseLabel: 'opening',

  time: {
    preset: defaultPreset,
    startedOnFirstMove: false,
    isRunning: false,
    lastTickAt: null,
    turnSide: 'w',
    whiteClock: { remainingMs: base0, incrementMs: inc0 },
    blackClock: { remainingMs: base0, incrementMs: inc0 },
    outOfTime: null,
  },

  moves: [],
  lastMoveStartAt: performance.now(),

  reviewCursor: null,
  previewFEN: null,

  isThinking: false,
};

// ===== Store Impl =====
export const useChessStore = create<GameState & GameActions>((set, get) => ({
  ...initialGameState,

  // ===== Settings / UI =====
  setPieceTheme: (theme) => {
    set({ pieceTheme: theme });
    localStorage.setItem('chess-piece-theme', theme);
  },
  setPieceSize: (size) => {
    set({ pieceSize: size });
    localStorage.setItem('chess-piece-size', size);
  },
  setDifficulty: (difficulty) => {
    const rating = Math.max(200, Math.min(2500, Math.round(difficulty)));
    set({ difficulty: rating });
    localStorage.setItem('chess-difficulty', rating.toString());
    // keep eval fresh
    get().updateEvaluation();
  },
  setPlayerSide: (side) => {
    set({ playerSide: side });
    localStorage.setItem('chess-player-side', side);
  },
  applyStartingSide: () => {
    const { playerSide, gameMode } = get();
    let botSide: Color; let viewSide: Color;
    if (playerSide === 'white') { botSide = 'b'; viewSide = 'w'; }
    else if (playerSide === 'black') { botSide = 'w'; viewSide = 'b'; }
    else { botSide = Math.random() < 0.5 ? 'w' : 'b'; viewSide = botSide === 'w' ? 'b' : 'w'; }
    set({ botSide, viewSide });
    get().resetGame();
    if (gameMode === 'bot') {
      const { chess } = get();
      if (chess.turn() === botSide) get().makeStockfishMove();
    } else {
      get().updateEvaluation();
    }
  },
  setShowEval: (v) => {
    set({ showEval: v });
    localStorage.setItem('chess-show-eval', v ? '1' : '0');
  },
  toggleShowEval: () => {
    const v = !get().showEval;
    set({ showEval: v });
    localStorage.setItem('chess-show-eval', v ? '1' : '0');
  },
  toggleThemePreview: (v) => set(s => ({ showThemePreview: v ?? !s.showThemePreview })),

  // ===== Game Mode =====
  setGameMode: (mode) => {
    set({ gameMode: mode, selectedSquare: null, validMoves: [] });
    const { chess, botSide } = get();
    if (mode === 'bot' && chess.turn() === botSide) {
      get().makeStockfishMove();
    } else {
      get().updateEvaluation();
    }
  },

  // ===== Clocks =====
  setPreset: (p) => {
    const { base, inc } = presetToMs(p as Preset);
    set((s) => ({
      time: {
        preset: p,
        startedOnFirstMove: false,
        isRunning: false,
        lastTickAt: null,
        turnSide: 'w',
        outOfTime: null,
        whiteClock: { remainingMs: base, incrementMs: inc },
        blackClock: { remainingMs: base, incrementMs: inc },
      }
    }));
  },
  setCustomTime: (baseMin:number, incSec:number) => {
    set(() => ({
      time: {
        preset: 'custom',
        customBaseMin: baseMin,
        customIncSec: incSec,
        startedOnFirstMove: false,
        isRunning: false,
        lastTickAt: null,
        turnSide: 'w',
        outOfTime: null,
        whiteClock: { remainingMs: baseMin*60_000, incrementMs: incSec*1000 },
        blackClock: { remainingMs: baseMin*60_000, incrementMs: incSec*1000 },
      }
    }));
  },
  pause: () => set(s => ({ time: { ...s.time, isRunning:false, lastTickAt:null } })),
  resume: () => set(s => s.time.outOfTime ? ({}) as any : ({ time: { ...s.time, isRunning:true, lastTickAt: performance.now() } })),
  startOnFirstMove: () => set(s => s.time.startedOnFirstMove ? ({}) as any : ({ time: { ...s.time, startedOnFirstMove:true, isRunning:true, lastTickAt: performance.now() } })),
  tickClock: (deltaMs) => {
    const { time, chess, isGameOver } = get();
    if (!time.startedOnFirstMove || !time.isRunning || isGameOver || time.outOfTime) return;

    const turn = time.turnSide;
    const cur = turn==='w' ? time.whiteClock : time.blackClock;
    const newRemaining = Math.max(0, cur.remainingMs - deltaMs);

    if (newRemaining === 0) {
      // timeout; check insufficient material for opponent
      const loser: WB = turn;
      const winByTime = !insufficientMaterialForWin(chess, loser);
      set(s => ({
        time: {
          ...s.time,
          isRunning:false,
          outOfTime: loser,
          whiteClock: turn==='w' ? { ...s.time.whiteClock, remainingMs:0 } : s.time.whiteClock,
          blackClock: turn==='b' ? { ...s.time.blackClock, remainingMs:0 } : s.time.blackClock,
        },
        isGameOver: true,
        gameStatus: winByTime ? 'checkmate' : 'draw',
        winner: winByTime ? (loser==='w'?'black':'white') : 'draw'
      }));
      return;
    }

    set(s => ({
      time: {
        ...s.time,
        whiteClock: turn==='w' ? { ...s.time.whiteClock, remainingMs: newRemaining } : s.time.whiteClock,
        blackClock: turn==='b' ? { ...s.time.blackClock, remainingMs: newRemaining } : s.time.blackClock,
      }
    }));
  },
  applyIncrementAndSwap: () => {
    set(s => {
      const mover = s.time.turnSide;
      const incSide = mover==='w' ? s.time.whiteClock : s.time.blackClock;
      const incd = { ...incSide, remainingMs: incSide.remainingMs + incSide.incrementMs };
      const nextTurn = mover==='w' ? 'b' : 'w';
      return {
        time: {
          ...s.time,
          whiteClock: mover==='w' ? incd : s.time.whiteClock,
          blackClock: mover==='b' ? incd : s.time.blackClock,
          turnSide: nextTurn,
          lastTickAt: performance.now()
        }
      };
    });
  },

  // ===== Selection / Moves =====
  selectSquare: (square) => {
    const { chess, selectedSquare, gameMode, botSide } = get();
    if (gameMode === 'bot' && chess.turn() === botSide) return;

    if (selectedSquare) {
      // try move
      get().makeMove(selectedSquare, square).then((moved) => {
        if (moved) set({ selectedSquare: null, validMoves: [] });
        else set({ selectedSquare: get().pendingPromotion ? selectedSquare : null });
      });
      return;
    }

    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      const moves = chess.moves({ square, verbose: true }) as Move[];
      set({ selectedSquare: square, validMoves: moves.map(m => m.to as Square) });
    } else {
      set({ selectedSquare: null, validMoves: [] });
    }
  },

  makeMove: async (from, to, promotion) => {
    const { chess, botSide, gameMode, time } = get();
    try {
      const moving = chess.get(from);
      const isPawn = moving?.type === 'p';
      const aboutToPromote = isPawn && ((moving!.color === 'w' && to[1] === '8') || (moving!.color === 'b' && to[1] === '1'));
      if (aboutToPromote && !promotion) {
        set({ pendingPromotion: { from, to, color: moving!.color as WB } });
        return false;
      }

      // snapshot eval BEFORE
      const evalBefore = { cp: get().evalCp, mate: get().evalMate };

      const move = chess.move({ from, to, promotion });
      if (!move) return false;

      // clocks: start on first move
      if (!time.startedOnFirstMove && chess.history().length === 1) get().startOnFirstMove();

      const movesV = chess.history({ verbose: true }) as Move[];
      const lastMove = movesV.length ? { from: movesV[movesV.length - 1].from, to: movesV[movesV.length - 1].to } : null;

      set({
        lastMove,
        history: chess.history(),
        selectedSquare: null,
        validMoves: [],
        currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
        pendingPromotion: null,
      });

      // Update HUD phase
      updatePhaseLabel();

      // Eval AFTER
      const { cp, mate } = await get().updateEvaluation();

      // record annotated move & time spent
      const san = move.san;
      const dt = Math.max(0, performance.now() - get().lastMoveStartAt);
      const { nag, quality } = classifyByDelta(evalBefore, { cp, mate });
      set(s => ({
        moves: [...s.moves, { ply: s.chess.history().length, san, nag, quality, evalBefore, evalAfter:{cp,mate}, timeSpentMs: dt }],
        lastMoveStartAt: performance.now()
      }));

      // increment for mover and swap ticking side
      get().applyIncrementAndSwap();

      get().updateGameStatus();
      await get().autosaveSnapshot();

      if (gameMode === 'bot' && chess.turn() === botSide) {
        get().makeStockfishMove();
      }
      return true;
    } catch {
      return false;
    }
  },

  confirmPromotion: async (piece) => {
    const { pendingPromotion, chess, time } = get();
    if (!pendingPromotion) return;

    // eval BEFORE
    const evalBefore = { cp: get().evalCp, mate: get().evalMate };

    chess.move({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece });

    const movesV = chess.history({ verbose: true }) as Move[];
    const lastMove = movesV.length ? { from: movesV[movesV.length - 1].from, to: movesV[movesV.length - 1].to } : null;

    // start clock if first move
    if (!time.startedOnFirstMove && chess.history().length === 1) get().startOnFirstMove();

    set({
      lastMove,
      history: chess.history(),
      currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
      pendingPromotion: null,
    });

    updatePhaseLabel();

    const { cp, mate } = await get().updateEvaluation();

    const san = movesV[movesV.length-1].san;
    const dt = Math.max(0, performance.now() - get().lastMoveStartAt);
    const { nag, quality } = classifyByDelta(evalBefore, { cp, mate });
    set(s => ({
      moves: [...s.moves, { ply: s.chess.history().length, san, nag, quality, evalBefore, evalAfter:{cp,mate}, timeSpentMs: dt }],
      lastMoveStartAt: performance.now()
    }));

    get().applyIncrementAndSwap();

    get().updateGameStatus();
    await get().autosaveSnapshot();
  },

  cancelPromotion: () => set({ pendingPromotion: null }),

  undoMove: () => {
    const { chess, gameMode, botSide } = get();
    if (gameMode === 'bot') {
      if (chess.turn() !== botSide) { chess.undo(); chess.undo(); }
      else { chess.undo(); }
    } else {
      chess.undo();
    }

    const history = chess.history();
    const movesV = chess.history({ verbose: true }) as Move[];
    const lastMove = movesV.length ? { from: movesV[movesV.length - 1].from, to: movesV[movesV.length - 1].to } : null;

    set({
      history, lastMove,
      currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
      gameStatus: 'playing', isGameOver: false, winner: null,
      selectedSquare: null, validMoves: [], pendingPromotion: null,
      moves: movesTrimmedTo(history.length) // keep annotations length in sync
    });

    updatePhaseLabel();
    get().updateEvaluation();
  },

  resetGame: () => {
    const newChess = new Chess();
    const s = get();
    const base = s.time.preset==='custom' ? (s.time.customBaseMin ?? 5)*60_000 : presetToMs((s.time.preset as Preset)).base;
    const inc  = s.time.preset==='custom' ? (s.time.customIncSec ?? 0)*1000   : presetToMs((s.time.preset as Preset)).inc;

    set({
      chess: newChess,
      gameStatus: 'playing',
      selectedSquare: null, validMoves: [],
      lastMove: null, history: [],
      currentPlayer: 'white', isGameOver: false, winner: null,
      pendingPromotion: null,
      evalCp: 0,
      evalMate: null,
      phaseLabel: 'opening',
      moves: [],
      lastMoveStartAt: performance.now(),
      time: {
        preset: s.time.preset,
        customBaseMin: s.time.customBaseMin,
        customIncSec: s.time.customIncSec,
        startedOnFirstMove: false,
        isRunning: false,
        lastTickAt: null,
        turnSide: 'w',
        outOfTime: null,
        whiteClock: { remainingMs: base, incrementMs: inc },
        blackClock: { remainingMs: base, incrementMs: inc },
      }
    });

    const { gameMode, botSide } = get();
    if (gameMode === 'bot' && newChess.turn() === botSide) {
      get().makeStockfishMove();
    } else {
      get().updateEvaluation();
    }
  },

  updateGameStatus: () => {
    const { chess } = get();
    let gameStatus: GameStatus = 'playing';
    let isGameOver = false;
    let winner: GameState['winner'] = null;

    if (chess.isCheckmate()) { gameStatus = 'checkmate'; isGameOver = true; winner = chess.turn() === 'w' ? 'black' : 'white'; }
    else if (chess.isStalemate()) { gameStatus = 'stalemate'; isGameOver = true; winner = 'draw'; }
    else if (chess.isDraw()) { gameStatus = 'draw'; isGameOver = true; winner = 'draw'; }
    else if (chess.inCheck()) { gameStatus = 'check'; }

    set({ gameStatus, isGameOver, winner });
  },

  // ===== Engine / Bot =====
  makeStockfishMove: async () => {
    const { chess, difficulty, isGameOver, botSide, time } = get();
    if (isGameOver) return;
    if (chess.turn() !== botSide) return;

    set({ isThinking: true });
    try {
      const sf = useStockfish();
      const rating = Math.max(200, Math.min(2500, Math.round(difficulty)));
      await sf.setRating(rating);

      // eval BEFORE
      const evalBefore = { cp: get().evalCp, mate: get().evalMate };

      const fen = chess.fen();
      let best = await sf.getBestMove(fen, 1200);

      if (!best) {
        const legal = chess.moves({ verbose: true }) as Move[];
        if (!legal.length) return;
        const pick = legal[Math.floor(Math.random() * legal.length)];
        best = `${pick.from}${pick.to}${pick.promotion ?? ''}`;
      }

      if (chess.turn() !== botSide) return;

      const from = best.substring(0, 2) as Square;
      const to = best.substring(2, 4) as Square;
      const promo = best.length > 4 ? (best[4] as PieceSymbol) : undefined;

      const mv = chess.move({ from, to, promotion: promo });
      if (!mv) return;

      // start-on-first-move
      if (!time.startedOnFirstMove && chess.history().length === 1) get().startOnFirstMove();

      const movesV = chess.history({ verbose: true }) as Move[];
      const lastMove = movesV.length ? { from: movesV[movesV.length - 1].from, to: movesV[movesV.length - 1].to } : null;

      set({
        lastMove,
        history: chess.history(),
        currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
      });

      updatePhaseLabel();

      const { cp, mate } = await get().updateEvaluation();

      // annotate bot move
      const san = mv.san;
      const dt = Math.max(0, performance.now() - get().lastMoveStartAt);
      const { nag, quality } = classifyByDelta(evalBefore, { cp, mate });
      set(s => ({
        moves: [...s.moves, { ply: s.chess.history().length, san, nag, quality, evalBefore, evalAfter:{cp,mate}, timeSpentMs: dt }],
        lastMoveStartAt: performance.now()
      }));

      get().applyIncrementAndSwap();
      get().updateGameStatus();
      await get().autosaveSnapshot();
    } finally {
      set({ isThinking: false });
    }
  },

  updateEvaluation: async () => {
    const { chess, difficulty } = get();
    try {
      const sf = useStockfish();
      const rating = Math.max(200, Math.min(2500, Math.round(difficulty)));
      await sf.setRating(rating);
      const { cp, mate } = await sf.getEvaluation(chess.fen());
      if (cp !== null || mate !== null) {
        set({ evalCp: cp, evalMate: mate });
        return { cp, mate };
      }
    } catch { /* ignore and fall back */ }

    const localCp = localEvalCp(chess);
    set({ evalCp: localCp, evalMate: null });
    return { cp: localCp, mate: null };
  },

  // ===== Notation timing =====
  startMoveTimer: () => set({ lastMoveStartAt: performance.now() }),

  // ===== PGN Export =====
  buildPGN: (headers) => {
    const s = get();
    const now = new Date();
    const DateTag = `${now.getFullYear()}.${pad2(now.getMonth()+1)}.${pad2(now.getDate())}`;

    const timeControlStr = (() => {
      if (s.time.preset==='custom') {
        const b = (s.time.customBaseMin ?? 5)*60;
        const i = (s.time.customIncSec ?? 0);
        return `${b}+${i}`;
      } else {
        const [m, inc] = (s.time.preset as Preset).split('|').map(Number);
        return `${m*60}+${inc}`;
      }
    })();

    const hdrs = {
      Event: headers?.Event ?? 'Casual Game',
      Site:  headers?.Site  ?? 'Scholars',
      Date:  headers?.Date  ?? DateTag,
      Round: headers?.Round ?? '-',
      White: headers?.White ?? 'White',
      Black: headers?.Black ?? 'Black',
      Result: headers?.Result ?? resultToTag(s.chess),
      TimeControl: headers?.TimeControl ?? timeControlStr,
    };

    const headerStr = Object.entries(hdrs).map(([k,v]) => `[${k} "${v}"]`).join('\n');

    let body = '';
    let moveNo = 1;
    for (let i=0;i<s.moves.length;i++) {
      const m = s.moves[i];
      const isWhite = (m.ply % 2)===1;
      if (isWhite) body += `${moveNo}. `;
      let san = m.san + (m.nag ? ` ${m.nag}` : '');
      const evalStr = m.evalAfter?.mate!=null
        ? `M${m.evalAfter.mate}`
        : (m.evalAfter?.cp!=null ? `${m.evalAfter.cp>=0?'+':''}${(m.evalAfter.cp/100).toFixed(2)}` : '—');
      const timeStr = m.timeSpentMs!=null ? msToClock(m.timeSpentMs) : '0:00';
      san += ` { eval: ${evalStr}, time: ${timeStr} } `;
      body += san;
      if (!isWhite) moveNo++;
    }

    const res = resultToTag(s.chess);
    body += ` ${res}`;

    return `${headerStr}\n\n${body}\n`;
  },

  // ===== Saves / History =====
  autosaveSnapshot: async () => {
    const s = get();
    if (!s.currentGameId) return;
    await idbPutGame({
      id: s.currentGameId,
      savedAt: Date.now(),
      name: 'Autosave',
      fen: s.chess.fen(),
      moves: s.moves,
      headers: {},
      clocks: {
        white: s.time.whiteClock,
        black: s.time.blackClock,
        preset: s.time.preset,
        customBaseMin: s.time.customBaseMin,
        customIncSec: s.time.customIncSec
      },
      result: resultToTag(s.chess)
    });
  },
  manualSave: async (name:string) => {
    const s = get();
    const id = await idbAddGame({
      name,
      createdAt: Date.now(),
      fen: s.chess.fen(),
      moves: s.moves,
      headers: {},
      clocks: {
        white: s.time.whiteClock,
        black: s.time.blackClock,
        preset: s.time.preset,
        customBaseMin: s.time.customBaseMin,
        customIncSec: s.time.customIncSec
      },
      result: resultToTag(s.chess)
    });
    set({ currentGameId: id });
    return id;
  },
  listSavedGames: async () => {
    return await idbListGames();
  },
  loadGame: async (id:number) => {
    const all = await idbListGames();
    const g = all.find(x => x.id===id);
    if (!g) return;
    const c = new Chess();
    // reconstruct from PGN or apply FEN
    if (g.pgn) {
      c.loadPgn(g.pgn);
    } else if (g.fen) {
      c.load(g.fen);
    }
    set({
      chess: c,
      history: c.history(),
      lastMove: null,
      currentPlayer: c.turn()==='w' ? 'white':'black',
      gameStatus: 'playing',
      isGameOver: false,
      winner: null,
      moves: g.moves ?? [],
      time: {
        preset: g.clocks?.preset ?? 'custom',
        customBaseMin: g.clocks?.customBaseMin,
        customIncSec: g.clocks?.customIncSec,
        startedOnFirstMove: false,
        isRunning: false,
        lastTickAt: null,
        turnSide: 'w',
        outOfTime: null,
        whiteClock: g.clocks?.white ?? { remainingMs: 300000, incrementMs: 0 },
        blackClock: g.clocks?.black ?? { remainingMs: 300000, incrementMs: 0 },
      },
      currentGameId: id,
      previewFEN: null,
      reviewCursor: null,
    });
    updatePhaseLabel();
    await get().updateEvaluation();
  },
  deleteGame: async (id:number) => {
    await idbDeleteGame(id);
    const s = get();
    if (s.currentGameId === id) set({ currentGameId: undefined });
  },

  // ===== Review =====
  setReviewCursor: (i) => set({ reviewCursor: i }),
  setPreviewPosition: (fen) => set({ previewFEN: fen }),

}));

// ===== Helpers bound to store =====
function movesTrimmedTo(len:number): AnnotatedMove[] {
  const s = useChessStore.getState();
  if (s.moves.length <= len) return s.moves;
  return s.moves.slice(0, len);
}
function updatePhaseLabel() {
  const s = useChessStore.getState();
  const p = s.chess.board().flat().filter(Boolean) as {type:string,color:'w'|'b'}[];
  const nonKings = p.filter(q => q.type!=='k').length;
  if (s.chess.history().length <= 12) useChessStore.setState({ phaseLabel:'opening' });
  else if (nonKings <= 6) useChessStore.setState({ phaseLabel:'endgame' });
  else useChessStore.setState({ phaseLabel:'midgame' });
}
function insufficientMaterialForWin(chess: Chess, flagFaller: WB) {
  // If the opponent (the "winner") has insufficient mating material, it's a draw on time.
  const opp: WB = flagFaller==='w' ? 'b' : 'w';
  const pieces = chess.board().flat().filter(Boolean) as {type:PieceSymbol,color:WB}[];
  const oppNonKings = pieces.filter(p => p.color===opp && p.type!=='k');
  // very simple version: king or king+minor-only → insufficient
  if (oppNonKings.length===0) return true;
  if (oppNonKings.every(p => p.type==='n' || p.type==='b')) return true;
  return false;
}
