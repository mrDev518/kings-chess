import { create } from 'zustand';
import { Chess, Square, Move, PieceSymbol } from 'chess.js';
import { useStockfish } from '@/hooks/useStockfish';

export type GameMode = 'friend' | 'bot';
export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';
export type PieceTheme = 'classic' | 'modern' | 'fantasy' | 'alpha';

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
  promotionSquare: Square | null;
  pieceTheme: PieceTheme;
  difficulty: number; // 0-20 (Stockfish skill level)
  isThinking: boolean;
}

interface GameActions {
  setGameMode: (mode: GameMode) => void;
  selectSquare: (square: Square) => void;
  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  makeBotMove: () => void;
  undoMove: () => void;
  resetGame: () => void;
  setPromotionSquare: (square: Square | null) => void;
  updateGameStatus: () => void;
  setPieceTheme: (theme: PieceTheme) => void;
  setDifficulty: (difficulty: number) => void;
  makeStockfishMove: () => Promise<void>;
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
  promotionSquare: null,
  pieceTheme: 'classic',
  difficulty: 10, // Medium difficulty by default
  isThinking: false,
};

// Simple Stockfish fallback - uses random moves for now
// TODO: Integrate proper Stockfish WebAssembly engine
const getStockfishEngine = async () => null;

export const useChessStore = create<GameState & GameActions>((set, get) => ({
  ...initialGameState,

  setGameMode: (mode: GameMode) => {
    set({ gameMode: mode });
  },

  selectSquare: (square: Square) => {
    const { chess, selectedSquare, gameMode } = get();
    
    // Don't allow selection if it's bot's turn in bot mode
    if (gameMode === 'bot' && chess.turn() === 'b') {
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare === square) {
      set({ selectedSquare: null, validMoves: [] });
      return;
    }

    // If a square is already selected, try to make a move
    if (selectedSquare) {
      const moveSuccessful = get().makeMove(selectedSquare, square);
      if (moveSuccessful) {
        set({ selectedSquare: null, validMoves: [] });
        return;
      }
    }

    // Select new square if it has a piece of the current player
    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      const moves = chess.moves({ 
        square, 
        verbose: true 
      }) as Move[];
      
      const validMoves = moves.map(move => move.to);
      
      set({ 
        selectedSquare: square, 
        validMoves 
      });
    } else {
      set({ selectedSquare: null, validMoves: [] });
    }
  },

  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => {
    const { chess } = get();
    
    try {
      // Check if this is a pawn promotion
      const piece = chess.get(from);
      const isPromotion = piece?.type === 'p' && 
        ((piece.color === 'w' && to[1] === '8') || 
         (piece.color === 'b' && to[1] === '1'));

      if (isPromotion && !promotion) {
        // Set promotion square to show promotion dialog
        set({ promotionSquare: to });
        return false;
      }

      const moveOptions: any = { from, to };
      if (promotion) {
        moveOptions.promotion = promotion;
      }

      const move = chess.move(moveOptions);
      
      if (move) {
        const history = chess.history();
        set({ 
          lastMove: { from, to },
          history,
          currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
          promotionSquare: null
        });
        
        get().updateGameStatus();
        
        // Make bot move after a short delay if in bot mode
        if (get().gameMode === 'bot' && chess.turn() === 'b' && !get().isGameOver) {
          setTimeout(() => {
            get().makeStockfishMove();
          }, 800);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
    
    return false;
  },

  makeBotMove: () => {
    // Fallback to random move if Stockfish fails
    const { chess } = get();
    
    if (chess.turn() !== 'b' || get().isGameOver) {
      return;
    }

    const moves = chess.moves({ verbose: true }) as Move[];
    
    if (moves.length > 0) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      
      const moveOptions: any = {
        from: randomMove.from,
        to: randomMove.to
      };
      
      if (randomMove.promotion) {
        moveOptions.promotion = randomMove.promotion;
      }

      chess.move(moveOptions);
      
      const history = chess.history();
      set({
        lastMove: { from: randomMove.from, to: randomMove.to },
        history,
        currentPlayer: 'white',
        isThinking: false
      });
      
      get().updateGameStatus();
    }
  },

  makeStockfishMove: async () => {
    // Fallback to random move for now - Stockfish integration pending
    get().makeBotMove();
  },

  undoMove: () => {
    const { chess } = get();
    
    // In bot mode, undo two moves (player + bot)
    if (get().gameMode === 'bot') {
      chess.undo(); // Undo bot move
      chess.undo(); // Undo player move
    } else {
      chess.undo(); // Undo one move in friend mode
    }
    
    const history = chess.history();
    const moves = chess.history({ verbose: true }) as Move[];
    const lastMove = moves.length > 0 ? 
      { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : 
      null;
    
    set({
      history,
      lastMove,
      currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
      selectedSquare: null,
      validMoves: [],
      promotionSquare: null
    });
    
    get().updateGameStatus();
  },

  resetGame: () => {
    const newChess = new Chess();
    set({
      ...initialGameState,
      chess: newChess,
      gameMode: get().gameMode, // Keep current game mode
      pieceTheme: get().pieceTheme, // Keep current piece theme
      difficulty: get().difficulty, // Keep current difficulty
    });
  },

  setPromotionSquare: (square: Square | null) => {
    set({ promotionSquare: square });
  },

  updateGameStatus: () => {
    const { chess } = get();
    
    let gameStatus: GameStatus = 'playing';
    let isGameOver = false;
    let winner: 'white' | 'black' | 'draw' | null = null;

    if (chess.isCheckmate()) {
      gameStatus = 'checkmate';
      isGameOver = true;
      winner = chess.turn() === 'w' ? 'black' : 'white';
    } else if (chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      gameStatus = 'stalemate';
      isGameOver = true;
      winner = 'draw';
    } else if (chess.isDraw()) {
      gameStatus = 'draw';
      isGameOver = true;
      winner = 'draw';
    } else if (chess.inCheck()) {
      gameStatus = 'check';
    }

    set({ gameStatus, isGameOver, winner });
  },

  setPieceTheme: (theme: PieceTheme) => {
    set({ pieceTheme: theme });
    // Persist to localStorage
    localStorage.setItem('chess-piece-theme', theme);
  },

  setDifficulty: (difficulty: number) => {
    set({ difficulty });
    // Persist to localStorage
    localStorage.setItem('chess-difficulty', difficulty.toString());
  },
}));