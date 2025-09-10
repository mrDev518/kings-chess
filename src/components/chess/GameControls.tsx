import React, { useEffect, useRef } from 'react';
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

    // actions
    setGameMode, 
    resetGame, 
    undoMove,

    // clock state + actions (must exist in the store)
    clockEnabled,
    clockMinutes,
    timeWhite,
    timeBlack,
    setClockEnabled,
    setClockMinutes,
    resetClock,
    tickClock
  } = useChessStore();

  // -------- Clock ticking with rAF --------
  const lastTs = useRef<number | null>(null);

  useEffect(() => {
    if (!clockEnabled || isGameOver) {
      lastTs.current = null;
      return;
    }

    let rafId = 0;
    const loop = (ts: number) => {
      if (lastTs.current != null) {
        const delta = ts - lastTs.current;
        // only tick when it's someone's turn and the game isn't over
        tickClock(delta);
      }
      lastTs.current = ts;
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      lastTs.current = null;
    };
  }, [clockEnabled, isGameOver, currentPlayer, tickClock]);

  // Reset clock whenever you change its duration
  const handleClockMinutes = (v: string) => {
    const m = Number(v) as 3 | 10;
    setClockMinutes(m);
    resetClock();
  };

  const fmt = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const getStatusText = () => {
    if (isThinking) return 'AI is thinking...';
    if (isGameOver) {
      if (winner === 'draw') return 'Game ended in a draw';
      return `${winner === 'white' ? 'White' : 'Black'} wins by checkmate!`;
    }
    if (gameStatus === 'check') {
      return `${currentPlayer === 'white' ? 'White' : 'Black'} is in check!`;
    }
    return `${currentPlayer === 'white' ? 'White' : 'Black'} to move`;
  };

  const getStatusClass = () => {
    let baseClass = 'game-status';
    if (isThinking) baseClass += ' thinking';
    else if (isGameOver) baseClass += ' checkmate';
    else if (gameStatus === 'check') baseClass += ' check';
    else baseClass += currentPlayer === 'white' ? ' white-turn' : ' black-turn';
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

      {/* Clock Controls */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">Clock</label>
            <Select
              value={clockEnabled ? 'on' : 'off'}
              onValueChange={(v) => setClockEnabled(v === 'on')}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="on">On</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {clockEnabled && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Time control</span>
                <Select value={String(clockMinutes)} onValueChange={handleClockMinutes}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timers */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className={`p-2 rounded-md border ${currentPlayer === 'white' ? 'bg-primary/10' : ''}`}>
                  <div className="text-xs uppercase text-muted-foreground">White</div>
                  <div className="text-lg font-semibold">{fmt(timeWhite)}</div>
                </div>
                <div className={`p-2 rounded-md border ${currentPlayer === 'black' ? 'bg-primary/10' : ''}`}>
                  <div className="text-xs uppercase text-muted-foreground">Black</div>
                  <div className="text-lg font-semibold">{fmt(timeBlack)}</div>
                </div>
              </div>
            </>
          )}
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
            onClick={() => { resetGame(); if (clockEnabled) resetClock(); }}
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
