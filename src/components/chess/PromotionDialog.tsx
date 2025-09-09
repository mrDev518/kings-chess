import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useChessStore } from '@/store/chessStore';
import { PieceSymbol } from 'chess.js';

const pieceSymbols = {
  w: { q: '♕', r: '♖', b: '♗', n: '♘' },
  b: { q: '♛', r: '♜', b: '♝', n: '♞' }
};

export const PromotionDialog: React.FC = () => {
  const { 
    chess, 
    promotionSquare, 
    selectedSquare, 
    setPromotionSquare, 
    makeMove 
  } = useChessStore();

  const isOpen = promotionSquare !== null;
  const currentPlayer = chess.turn();

  const handlePromotion = (piece: PieceSymbol) => {
    if (promotionSquare && selectedSquare) {
      makeMove(selectedSquare, promotionSquare, piece);
    }
  };

  const handleClose = () => {
    setPromotionSquare(null);
  };

  const promotionPieces: PieceSymbol[] = ['q', 'r', 'b', 'n'];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-center mb-4">
          Choose promotion piece
        </DialogTitle>
        
        <div className="grid grid-cols-4 gap-4">
          {promotionPieces.map((piece) => (
            <Button
              key={piece}
              onClick={() => handlePromotion(piece)}
              variant="outline"
              className="h-20 text-4xl hover:bg-primary/10 hover:scale-105 transition-all"
              style={{ 
                color: currentPlayer === 'w' ? 'hsl(var(--piece-light))' : 'hsl(var(--piece-dark))' 
              }}
            >
              {pieceSymbols[currentPlayer][piece]}
            </Button>
          ))}
        </div>
        
        <div className="text-center text-sm text-muted-foreground mt-2">
          Click a piece to promote your pawn
        </div>
      </DialogContent>
    </Dialog>
  );
};