import { create } from 'zustand';
import { Chess, Square, Move, PieceSymbol, Color } from 'chess.js';
import { useStockfish } from '@/hooks/useStockfish';
import { sfx } from '@/sfx/sfx';
import { useSfxStore } from '@/sfx/sfxStore';

/** -------------------------------
 *  LocalStorage helpers / defaults
 *  ------------------------------- */
const ls = (k: string) => localStorage.getItem(k);

// One-time force default to your new SVG "line" theme
if (ls('theme-migrated-line') !== '1') {
  localStorage.setItem('chess-piece-theme', 'line');
  localStorage.setItem('theme-migrated-line', '1');
}

// Load SFX prefs immediately so volumes are ready before first move
try { useSfxStore.getState().load(); } catch {}

/** -------------------------------
 *  Types
 *  ------------------------------- */
export type GameMode = 'friend' | 'bot';
export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';
export type PieceTheme = 'classic' | 'alpha' | 'neo' | 'solid' | 'line';
export type PlayerSide = 'white' | 'black' | 'random';

interface PendingPromotion {
  from: Square;
  to: Square;
  color: 'w' | 'b';
}

interface IllegalHint {
  message: string | null;
  visible: boolean;
  /** increments so UI can re-play fade animation on each new message */
  seq: number;
}

interface GameState {
  chess: Chess;

  // Flow / status
  gameMode: GameMode;
  gameStatus: GameStatus;
  selectedSquare: Square | null;
  validMoves: Square[];
  lastMove: { from: Square; to: Square } | null;
  history: string[];
  currentPlayer: 'white' | 'black';
  isGameOver: boolean;
  winner: 'white' | 'black' | 'draw' | null;

  // Promotion
  pendingPromotion: PendingPromotion | null;

  // Settings
  pieceTheme: PieceTheme;
  difficulty: number;        // 200..2500
  playerSide: PlayerSide;    // chosen color
  botSide: Color;            // 'w' or 'b' bot side (when gameMode === 'bot')
  viewSide: Color;           // board perspective: 'w' bottom or 'b' bottom

  // Engine eval (centipawns White POV, mate plies)
  evalCp: number | null;
  evalMate: number | null;

  // UI toggles
  showEval: boolean;

  // Illegal move popup state ("?"): message + visibility + sequence
  illegalHint: IllegalHint;

  // Runtime
  isThinking: boolean;
}

interface GameActions {
  // Game flow
  setGameMode: (mode: GameMode) => void;
  selectSquare: (square: Square) => void;
  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  confirmPromotion: (piece: PieceSymbol) => void;
  cancelPromotion: () => void;
  undoMove: () => void;
  resetGame: () => void;

  // Status
  setPromotionSquare?: (square: Square | null) => void; // optional if your UI used this
  updateGameStatus: () => void;

  // Settings
  setPieceTheme: (theme: PieceTheme) => void;
  setDifficulty: (difficulty: number) => void;
  setPlayerSide: (side: PlayerSide) => void;
  applyStartingSide: () => void;

  // UI toggles
  setShowEval: (v: boolean) => void;
  toggleShowEval: () => void;

  // Engine
  makeStockfishMove: () => Promise<void>;
  updateEvaluation: () => Promise<void>;

  // Illegal move helpers
  showIllegal: (reason: string) => void;
  clearIllegal: () => void;
}

/** -------------------------------
 *  Local evaluation fallback (centipawns)
 *  ------------------------------- */
const PIECE_CP: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
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
  // Small mobility bonus for the side to move (kept tiny to avoid exaggeration)
  const legal = chess.moves({ verbose: true }) as Move[];
  const mob = Math.min(30, legal.length);
  cp += (chess.turn() === 'w' ? 1 : -1) * mob * 1; // up to 30cp swing max
  return cp;
}

/** -------------------------------
 *  Initial State
 *  ------------------------------- */
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
  botSide: 'b',   // by default, bot plays Black
  viewSide: 'w',  // white at bottom

  evalCp: 0,
  evalMate: null,

  showEval: (ls('chess-show-eval') ?? '1') !== '0',

  illegalHint: { message: null, visible: false, seq: 0 },

  isThinking: false,
};

/** -------------------------------
 *  Store
 *  ------------------------------- */
export const useChessStore = create<GameState & GameActions>((set, get) => ({
  ...initialGameState,

  /** Game mode switch */
  setGameMode: (mode) => {
    set({ gameMode: mode, selectedSquare: null, validMoves: [] });
    const { chess, botSide } = get();
    if (mode === 'bot' && chess.turn() === botSide) {
      get().makeStockfishMove();
    } else {
      get().updateEvaluation();
    }
  },

  /** Square selection and attempt to move */
  selectSquare: (square) => {
    const { chess, selectedSquare, gameMode, botSide, showIllegal } = get();

    // Block user during bot's turn in bot mode
    if (gameMode === 'bot' && chess.turn() === botSide) {
      showIllegal("It's the bot's turn.");
      return;
    }

    if (selectedSquare) {
      const moved = get().makeMove(selectedSquare, square);
      if (moved) {
        set({ selectedSquare: null, validMoves: [] });
        get().clearIllegal(); // clear illegal hint on success
      } else {
        // Keep selection if a promotion dialog opened
        set({ selectedSquare: get().pendingPromotion ? selectedSquare : null });
      }
      return;
    }

    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      const moves = chess.moves({ square, verbose: true }) as Move[];
      set({ selectedSquare: square, validMoves: moves.map((m) => m.to as Square) });
    } else {
      // Selecting empty square or enemy piece at start
      showIllegal(piece ? "That's not your piece." : 'No piece on that square.');
      set({ selectedSquare: null, validMoves: [] });
    }
  },

  /** Attempt to make a move (with optional promotion piece) */
  makeMove: (from, to, promotion) => {
    const { chess, botSide, gameMode, showIllegal } = get();
    try {
      const moving = chess.get(from);
      if (!moving) {
        showIllegal('No piece on that square.');
        return false;
      }
      if (moving.color !== chess.turn()) {
        showIllegal("It's not that color's turn.");
        return false;
      }

      // Pre-compute if destination is in legal list
      const legal = chess.moves({ square: from, verbose: true }) as any[];
      const target = legal.find((m) => m.to === to);

      // Promotion needed?
      const isPawn = moving.type === 'p';
      const aboutToPromote =
        isPawn &&
        ((moving.color === 'w' && to[1] === '8') || (moving.color === 'b' && to[1] === '1'));

      if (aboutToPromote && !promotion) {
        set({ pendingPromotion: { from, to, color: moving.color } });
        return false; // this is not illegal; UI will open dialog
      }

      const move = chess.move({ from, to, promotion });

      if (!move) {
        // Move rejected by chess.js (e.g. pinned, blocked, or leaves king in check)
        const reason = target
          ? 'Illegal: that move would leave your king in check.'
          : 'Illegal: that move is not allowed for this piece.';
        showIllegal(reason);
        return false;
      }

      // ---- SFX: classify and play correct sounds ----
      try {
        const last: any = move; // chess.js Move
        const movingType = last.piece as string;         // 'p','n','b','r','q','k'
        const flags = String(last.flags || '');          // 'c'=capture, 'e'=en-passant, 'k'|'q'=castle
        const wasCapture = flags.includes('c');
        const wasEnPassant = flags.includes('e');
        const wasCastle = flags.includes('k') || flags.includes('q');
        const wasPromotion = Boolean(last.promotion);

        if (wasCastle) sfx.castle();
        else if (wasEnPassant) sfx.enPassant();
        else if (wasCapture) sfx.capture();
        else sfx.move(movingType);

        if (wasPromotion) sfx.promote();
      } catch {}

      // Record / UI refresh
      const history = chess.history();
      const moves = chess.history({ verbose: true }) as Move[];
      const lastMove =
        moves.length ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : null;

      set({
        lastMove,
        history,
        selectedSquare: null,
        validMoves: [],
        currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
        pendingPromotion: null,
      });

      get().updateGameStatus();
      get().clearIllegal(); // any successful move clears hint

      if (gameMode === 'bot' && chess.turn() === botSide) {
        get().makeStockfishMove();
      } else {
        get().updateEvaluation();
      }
      return true;
    } catch {
      showIllegal('Illegal: move could not be processed.');
      return false;
    }
  },

  /** Confirm promotion piece from dialog */
  confirmPromotion: (piece) => {
    const { pendingPromotion } = get();
    if (!pendingPromotion) return;

    const { chess } = get();
    chess.move({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece });

    // SFX promotion
    try { sfx.promote(); } catch {}

    const moves = chess.history({ verbose: true }) as Move[];
    const lastMove =
      moves.length ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : null;

    set({
      lastMove,
      history: chess.history(),
      currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
      pendingPromotion: null,
    });

    get().updateGameStatus();
    get().clearIllegal();
    get().updateEvaluation();
  },

  cancelPromotion: () => set({ pendingPromotion: null }),

  /** Undo last move (double-undo in bot mode to revert full turn) */
  undoMove: () => {
    const { chess, gameMode, botSide } = get();

    if (gameMode === 'bot') {
      if (chess.turn() !== botSide) {
        chess.undo(); // undo player
        chess.undo(); // undo bot
      } else {
        chess.undo(); // only one if it's bot to move
      }
    } else {
      chess.undo();
    }

    const history = chess.history();
    const moves = chess.history({ verbose: true }) as Move[];
    const lastMove =
      moves.length ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : null;

    set({
      history,
      lastMove,
      currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
      gameStatus: 'playing',
      isGameOver: false,
      winner: null,
      selectedSquare: null,
      validMoves: [],
      pendingPromotion: null,
    });

    get().clearIllegal();
    get().updateEvaluation();
  },

  /** Reset to a fresh game (respect bot opening move if needed) */
  resetGame: () => {
    const newChess = new Chess();
    set({
      chess: newChess,
      gameStatus: 'playing',
      selectedSquare: null,
      validMoves: [],
      lastMove: null,
      history: [],
      currentPlayer: 'white',
      isGameOver: false,
      winner: null,
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

  /** Optional adapter for older UI if it called this */
  setPromotionSquare: (square: Square | null) => {
    if (!square) { set({ pendingPromotion: null }); return; }
    const { chess } = get();
    const piece = chess.get(square);
    if (piece?.type === 'p') {
      set({ pendingPromotion: { from: square, to: square, color: piece.color } as any });
    }
  },

  /** Update status (and play check SFX) */
  updateGameStatus: () => {
    const { chess } = get();
    let gameStatus: GameStatus = 'playing';
    let isGameOver = false;
    let winner: GameState['winner'] = null;

    if (chess.isCheckmate()) {
      gameStatus = 'checkmate';
      isGameOver = true;
      winner = chess.turn() === 'w' ? 'black' : 'white';
    } else if (chess.isStalemate()) {
      gameStatus = 'stalemate';
      isGameOver = true;
      winner = 'draw';
    } else if (chess.isDraw()) {
      gameStatus = 'draw';
      isGameOver = true;
      winner = 'draw';
    } else if (chess.inCheck()) {
      gameStatus = 'check';
      try { sfx.check(); } catch {}
    }

    set({ gameStatus, isGameOver, winner });
  },

  /** Settings */
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

  /** Apply starting side (sets botSide + viewSide) and resets game */
  applyStartingSide: () => {
    const { playerSide, gameMode } = get();
    let botSide: Color;
    let viewSide: Color;

    if (playerSide === 'white') { botSide = 'b'; viewSide = 'w'; }
    else if (playerSide === 'black') { botSide = 'w'; viewSide = 'b'; }
    else {
      botSide = Math.random() < 0.5 ? 'w' : 'b';
      viewSide = botSide === 'w' ? 'b' : 'w';
    }

    set({ botSide, viewSide });
    get().resetGame();

    if (gameMode === 'bot') {
      const { chess } = get();
      if (chess.turn() === botSide) get().makeStockfishMove();
    } else {
      get().updateEvaluation();
    }
  },

  /** UI toggles */
  setShowEval: (v) => {
    set({ showEval: v });
    localStorage.setItem('chess-show-eval', v ? '1' : '0');
  },
  toggleShowEval: () => {
    const v = !get().showEval;
    set({ showEval: v });
    localStorage.setItem('chess-show-eval', v ? '1' : '0');
  },

  /** Bot move via Stockfish API (robust) */
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
        // Fallback: random legal move to avoid stalls
        const legal = chess.moves({ verbose: true }) as Move[];
        if (!legal.length) return;
        const pick = legal[Math.floor(Math.random() * legal.length)];
        best = `${pick.from}${pick.to}${pick.promotion ?? ''}`;
      }

      if (chess.turn() !== botSide) return; // user moved while waiting

      const from = best.substring(0, 2) as Square;
      const to = best.substring(2, 4) as Square;
      const promo = best.length > 4 ? (best[4] as PieceSymbol) : undefined;

      const mv = chess.move({ from, to, promotion: promo });

      // Bot SFX
      try {
        const last: any = mv;
        const pieceType = last.piece as string;
        const flags = String(last.flags || '');
        const wasCapture = flags.includes('c');
        const wasEnPassant = flags.includes('e');
        const wasCastle = flags.includes('k') || flags.includes('q');
        const wasPromotion = Boolean(last.promotion);

        if (wasCastle) sfx.castle();
        else if (wasEnPassant) sfx.enPassant();
        else if (wasCapture) sfx.capture();
        else sfx.move(pieceType);

        if (wasPromotion) sfx.promote();
      } catch {}

      const moves = chess.history({ verbose: true }) as Move[];
      const lastMove =
        moves.length ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : null;

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

  /** Update evaluation (tries API, then local fallback) */
  updateEvaluation: async () => {
    const { chess, difficulty } = get();

    // Try remote engine first
    try {
      const sf = useStockfish();
      const rating = Math.max(200, Math.min(2500, Math.round(difficulty)));
      await sf.setRating(rating);
      const { cp, mate } = await sf.getEvaluation(chess.fen());
      if (cp !== null || mate !== null) {
        set({ evalCp: cp, evalMate: mate });
        return;
      }
    } catch {
      // ignore and fall back
    }

    // Local heuristic fallback so the bar always moves
    const localCp = localEvalCp(chess);
    set({ evalCp: localCp, evalMate: null });
  },

  /** Illegal move helpers */
  showIllegal: (reason) => {
    try { sfx.illegal(); } catch {}
    set((st) => ({
      illegalHint: { message: reason, visible: true, seq: st.illegalHint.seq + 1 },
    }));
  },
  clearIllegal: () => set({ illegalHint: { message: null, visible: false, seq: 0 } }),
}));
