import React from 'react';
import { Piece, Square } from 'chess.js';

interface ChessPieceProps {
  piece: Piece;
  square: Square;
  isSelected: boolean;
}

const pieceSymbols = {
  w: {
    k: '♔', // White King
    q: '♕', // White Queen
    r: '♖', // White Rook
    b: '♗', // White Bishop
    n: '♘', // White Knight
    p: '♙', // White Pawn
  },
  b: {
    k: '♚', // Black King
    q: '♛', // Black Queen
    r: '♜', // Black Rook
    b: '♝', // Black Bishop
    n: '♞', // Black Knight
    p: '♟', // Black Pawn
  },
};

export const ChessPiece: React.FC<ChessPieceProps> = ({ piece, square, isSelected }) => {
  const symbol = pieceSymbols[piece.color][piece.type];

  return (
    <div
      className={`chess-piece ${isSelected ? 'scale-110' : ''}`}
      style={{ 
        color: piece.color === 'w' ? 'hsl(var(--piece-light))' : 'hsl(var(--piece-dark))' 
      }}
    >
      {symbol}
    </div>
  );
};