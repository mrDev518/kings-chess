import React from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChessStore } from '@/store/chessStore';
import { History } from 'lucide-react';

export const MoveHistory: React.FC = () => {
  const { history } = useChessStore();

  // Group moves in pairs (white, black)
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = history[i];
    const blackMove = history[i + 1];
    
    movePairs.push({
      moveNumber,
      whiteMove,
      blackMove
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4" />
        <h3 className="font-medium">Move History</h3>
      </div>
      
      <ScrollArea className="h-48">
        {movePairs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No moves yet
          </p>
        ) : (
          <div className="space-y-1">
            {movePairs.map(({ moveNumber, whiteMove, blackMove }) => (
              <div key={moveNumber} className="flex items-center text-sm">
                <span className="w-8 text-muted-foreground font-mono">
                  {moveNumber}.
                </span>
                <span className="w-16 font-mono">
                  {whiteMove}
                </span>
                {blackMove && (
                  <span className="w-16 font-mono text-muted-foreground">
                    {blackMove}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};