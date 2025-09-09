import { create } from 'zustand';
import { Chess, Square, Move, PieceSymbol, Color } from 'chess.js';
import { useStockfish } from '@/hooks/useStockfish';

export type GameMode = 'friend' | 'bot';
export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';
export type PieceTheme = 'classic' | 'alpha' | 'neo' | 'solid' | 'line';
export type PlayerSide = 'white' | 'black' | 'random';

const ls = (k: string) => localStorage.getItem(k);

// force default theme = line once
if (ls('theme-migrated-line') !== '1') {
  localStorage.setItem('chess-piece-theme', 'line');
  localStorage.setItem('theme-migrated-line', '1');
}

interface PendingPromotion { from: Square; to: Square; color: 'w'|'b'; }

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

  pendingPromotion: PendingPromotion | null;

  // Settings
  pieceTheme: PieceTheme;
  difficulty: number;
  playerSide: PlayerSide;
  botSide: Color;
  viewSide: Color;

  // Eval (centipawns White POV) and mate plies
  evalCp: number | null;
  evalMate: number | null;

  // UI toggles
  showEval: boolean;

  isThinking: boolean;
}

interface GameActions {
  setGameMode: (mode: GameMode) => void;
  selectSquare: (square: Square) => void;

  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  confirmPromotion: (piece: PieceSymbol) => void;
  cancelPromotion: () => void;

  undoMove: () => void;
  resetGame: () => void;

  updateGameStatus: () => void;

  setPieceTheme: (theme: PieceTheme) => void;
  setDifficulty: (difficulty: number) => void;
  setPlayerSide: (side: PlayerSide) => void;
  applyStartingSide: () => void;

  setShowEval: (v: boolean) => void;
  toggleShowEval: () => void;

  makeStockfishMove: () => Promise<void>;
  updateEvaluation: () => Promise<void>;
}

// simple local eval: material + tiny mobility (in centipawns)
const PIECE_CP = { p:100, n:320, b:330, r:500, q:900, k:0 };
function localEvalCp(chess: Chess): number {
  let cp = 0;
  const board = chess.board();
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      const sign = sq.color === 'w' ? 1 : -1;
      cp += sign * (PIECE_CP as any)[sq.type];
    }
  }
  const legal = chess.moves({ verbose: true }) as Move[];
  const mob = legal.length;
  cp += (chess.turn() === 'w' ? 1 : -1) * Math.min(30, mob) * 1;
  return cp;
}

const initialGameState: GameState = {
  chess: new Chess(),
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
  difficulty: Number(ls('chess-difficulty') || 1350),
  playerSide: (ls('chess-player-side') as PlayerSide) || 'white',
  botSide: 'b',
  viewSide: 'w',

  evalCp: 0,
  evalMate: null,

  showEval: (ls('chess-show-eval') ?? '1') !== '0', // default: shown

  isThinking: false,
};

export const useChessStore = create<GameState & GameActions>((set, get) => ({
  ...initialGameState,

  setGameMode: (mode) => {
    set({ gameMode: mode, selectedSquare: null, validMoves: [] });
    const { chess, botSide } = get();
    if (mode === 'bot' && chess.turn() === botSide) {
      get().makeStockfishMove();
    } else {
      get().updateEvaluation();
    }
  },

  selectSquare: (square) => {
    const { chess, selectedSquare, gameMode, botSide } = get();
    if (gameMode === 'bot' && chess.turn() === botSide) return;

    if (selectedSquare) {
      const moved = get().makeMove(selectedSquare, square);
      if (moved) set({ selectedSquare: null, validMoves: [] });
      else set({ selectedSquare: get().pendingPromotion ? selectedSquare : null });
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

  makeMove: (from, to, promotion) => {
    const { chess, botSide, gameMode } = get();
    try {
      const moving = chess.get(from);
      const isPawn = moving?.type === 'p';
      const aboutToPromote = isPawn && ((moving!.color === 'w' && to[1] === '8') || (moving!.color === 'b' && to[1] === '1'));

      if (aboutToPromote && !promotion) {
        set({ pendingPromotion: { from, to, color: moving!.color } });
        return false;
      }

      const move = chess.move({ from, to, promotion });
      if (!move) return false;

      const history = chess.history();
      const moves = chess.history({ verbose: true }) as Move[];
      const lastMove = moves.length ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : null;

      set({
        lastMove,
        history,
        selectedSquare: null,
        validMoves: [],
        currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
        pendingPromotion: null,
      });

      get().updateGameStatus();

      if (gameMode === 'bot' && chess.turn() === botSide) {
        get().makeStockfishMove();
      } else {
        get().updateEvaluation();
      }
      return true;
    } catch {
      return false;
    }
  },

  confirmPromotion: (piece) => {
    const { pendingPromotion } = get();
    if (!pendingPromotion) return;

    const { chess } = get();
    chess.move({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece });

    const moves = chess.history({ verbose: true }) as Move[];
    const lastMove = moves.length ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : null;

    set({
      lastMove,
      history: chess.history(),
      currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
      pendingPromotion: null,
    });

    get().updateGameStatus();
    get().updateEvaluation();
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
    const moves = chess.history({ verbose: true }) as Move[];
    const lastMove = moves.length ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : null;

    set({
      history, lastMove,
      currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
      gameStatus: 'playing', isGameOver: false, winner: null,
      selectedSquare: null, validMoves: [], pendingPromotion: null,
    });

    get().updateEvaluation();
  },

  resetGame: () => {
    const newChess = new Chess();
    set({
      chess: newChess,
      gameStatus: 'playing',
      selectedSquare: null, validMoves: [],
      lastMove: null, history: [],
      currentPlayer: 'white', isGameOver: false, winner: null,
      pendingPromotion: null,
      evalCp: 0,
      evalMate: null,
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

  setPieceTheme: (theme) => {
    set({ pieceTheme: theme });
    localStorage.setItem('chess-piece-theme', theme);
  },

  setDifficulty: (difficulty) => {
    const rating = Math.max(200, Math.min(2500, Math.round(difficulty)));
    set({ difficulty: rating });
    localStorage.setItem('chess-difficulty', rating.toString());
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

  makeStockfishMove: async () => {
    const { chess, difficulty, isGameOver, botSide } = get();
    if (isGameOver) return;
    if (chess.turn() !== botSide) return;

    set({ isThinking: true });
    try {
      const sf = useStockfish();
      const rating = Math.max(200, Math.min(2500, Math.round(difficulty)));
      await sf.setRating(rating);

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

      chess.move({ from, to, promotion: promo });

      const moves = chess.history({ verbose: true }) as Move[];
      const lastMove = moves.length ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : null;

      set({
        lastMove,
        history: chess.history(),
        currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
      });

      get().updateGameStatus();
    } finally {
      set({ isThinking: false });
      await get().updateEvaluation();
    }
  },

  updateEvaluation: async () => {
    const { chess, difficulty } = get();
    // First try remote
    try {
      const sf = useStockfish();
      const rating = Math.max(200, Math.min(2500, Math.round(difficulty)));
      await sf.setRating(rating);
      const { cp, mate } = await sf.getEvaluation(chess.fen());
      if (cp !== null || mate !== null) {
        set({ evalCp: cp, evalMate: mate });
        return;
      }
    } catch { /* ignore, use local */ }

    // Fallback: local heuristic so the bar always moves
    const localCp = localEvalCp(chess);
    set({ evalCp: localCp, evalMate: null });
  },
}));
