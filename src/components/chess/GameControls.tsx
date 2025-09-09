import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChessStore } from '@/store/chessStore';
import { RotateCcw, Users, Bot, SkipBack } from 'lucide-react';

export const GameControls: React.FC = () => {
  const { 
    gameMode, 
    gameStatus, 
    currentPlayer, 
    isGameOver, 
    winner,
    history,
    isThinking,
    setGameMode, 
    resetGame, 
    undoMove 
  } = useChessStore();

  const getStatusText = () => {
    if (isThinking) {
      return 'AI is thinking...';
    }
    
    if (isGameOver) {
      if (winner === 'draw') {
        return 'Game ended in a draw';
      }
      return `${winner === 'white' ? 'White' : 'Black'} wins by checkmate!`;
    }
    
    if (gameStatus === 'check') {
      return `${currentPlayer === 'white' ? 'White' : 'Black'} is in check!`;
    }
    
    return `${currentPlayer === 'white' ? 'White' : 'Black'} to move`;
  };

  const getStatusClass = () => {
    let baseClass = 'game-status';
    
    if (isThinking) {
      baseClass += ' thinking';
    } else if (isGameOver) {
      baseClass += ' checkmate';
    } else if (gameStatus === 'check') {
      baseClass += ' check';
    } else {
      baseClass += currentPlayer === 'white' ? ' white-turn' : ' black-turn';
    }
    
    return baseClass;
  };

  return (
    <div className="space-y-4">
      {/* Game Mode Selection */}
      <Card className="p-4">
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            Game Mode
          </label>
          <Select value={gameMode} onValueChange={setGameMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friend">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Play vs Friend
                </div>
              </SelectItem>
              <SelectItem value="bot">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Play vs Bot
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Game Status */}
      <Card className="p-4">
        <div className={getStatusClass()}>
          {getStatusText()}
        </div>
      </Card>

      {/* Game Controls */}
      <Card className="p-4">
        <div className="space-y-3">
          <Button 
            onClick={resetGame}
            className="w-full"
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            New Game
          </Button>
          
          {history.length > 0 && !isGameOver && !isThinking && (
            <Button 
              onClick={undoMove}
              className="w-full"
              variant="secondary"
            >
              <SkipBack className="h-4 w-4 mr-2" />
              Undo Move
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};