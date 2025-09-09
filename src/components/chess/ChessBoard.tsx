import React from 'react';
import { Square } from 'chess.js';
import { useChessStore } from '@/store/chessStore';
import { ChessPiece } from './ChessPiece';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const ChessBoard: React.FC = () => {
  const { 
    chess, 
    selectedSquare, 
    validMoves, 
    lastMove, 
    gameStatus, 
    selectSquare 
  } = useChessStore();

  const handleSquareClick = (square: Square) => {
    selectSquare(square);
  };

  const isSquareSelected = (square: Square) => selectedSquare === square;
  const isValidMove = (square: Square) => validMoves.includes(square);
  const isLastMove = (square: Square) => 
    lastMove && (lastMove.from === square || lastMove.to === square);
  const isInCheck = (square: Square) => {
    const piece = chess.get(square);
    return gameStatus === 'check' && piece?.type === 'k' && 
           piece.color === chess.turn();
  };

  return (
    <div className="relative">
      {/* Chess Board */}
      <div 
        className="grid grid-cols-8 border-4 border-board-border rounded-lg overflow-hidden shadow-2xl"
        style={{ boxShadow: 'var(--shadow-board)' }}
      >
        {ranks.map((rank) =>
          files.map((file) => {
            const square = `${file}${rank}` as Square;
            const piece = chess.get(square);
            const isLight = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 0;
            
            let squareClasses = `chess-square ${isLight ? 'light' : 'dark'}`;
            
            if (isSquareSelected(square)) {
              squareClasses += ' selected';
            } else if (isValidMove(square)) {
              squareClasses += ` valid-move ${piece ? 'has-piece' : ''}`;
            } else if (isLastMove(square)) {
              squareClasses += ' last-move';
            }
            
            if (isInCheck(square)) {
              squareClasses += ' in-check';
            }

            return (
              <div
                key={square}
                className={squareClasses}
                onClick={() => handleSquareClick(square)}
                style={{ aspectRatio: '1' }}
              >
                {piece && (
                  <ChessPiece
                    piece={piece}
                    square={square}
                    isSelected={isSquareSelected(square)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Coordinate Labels */}
      <div className="absolute -bottom-6 left-0 right-0 flex justify-around text-sm text-muted-foreground font-medium">
        {files.map(file => (
          <span key={file} className="w-8 text-center">
            {file}
          </span>
        ))}
      </div>
      
      <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-around text-sm text-muted-foreground font-medium">
        {ranks.map(rank => (
          <span key={rank} className="h-8 flex items-center">
            {rank}
          </span>
        ))}
      </div>
    </div>
  );
};