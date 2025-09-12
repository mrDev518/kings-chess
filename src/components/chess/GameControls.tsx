import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChessStore } from '@/store/chessStore';
import { RotateCcw, Users, Bot, SkipBack, Pause, Play } from 'lucide-react';

export const GameControls: React.FC = () => {
  const {
    // status
    gameMode, gameStatus, currentPlayer, isGameOver, winner, history, isThinking,

    // actions
    setGameMode, resetGame, undoMove,

    // time system
    time, setPreset, setCustomTime, pause, resume, tickClock,
  } = useChessStore();

  // -------- Clock ticking with rAF --------
  const lastTs = useRef<number | null>(null);
  useEffect(() => {
    let rafId = 0;
    const loop = (ts: number) => {
      if (lastTs.current != null) {
        const delta = ts - lastTs.current;
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
  }, [tickClock]);

  // UI helpers
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

  const toPresetValue = (p: typeof time.preset) =>
    p === 'custom' ? 'custom' : (p as string);

  const onPresetChange = (v: string) => {
    if (v === 'custom') {
      // leave as-is; user will apply a custom combo via increment quick buttons
      return;
    }
    // v e.g., "3|0"
    useChessStore.getState().pause();
    setPreset(v as any);
  };

  const applyIncQuick = (sec: number) => {
    const baseMin =
      time.preset === 'custom'
        ? (time.customBaseMin ?? 5)
        : Number(String(time.preset).split('|')[0]);
    pause();
    setCustomTime(baseMin, sec);
  };

  const applyBaseQuick = (min: number) => {
    const incSec =
      time.preset === 'custom'
        ? (time.customIncSec ?? 0)
        : Number(String(time.preset).split('|')[1]);
    pause();
    setCustomTime(min, incSec);
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

      {/* Time Controls */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">Time control</label>
            <Select
              value={toPresetValue(time.preset)}
              onValueChange={onPresetChange}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3|0">3|0</SelectItem>
                <SelectItem value="5|0">5|0</SelectItem>
                <SelectItem value="10|0">10|0</SelectItem>
                <SelectItem value="15|10">15|10</SelectItem>
                <SelectItem value="custom">Custom…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick base options */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Base:</span>
            {[3,5,10,15].map(m => (
              <Button key={m} variant="outline" size="sm" onClick={() => applyBaseQuick(m)}>
                {m}m
              </Button>
            ))}
          </div>

          {/* Quick increment options */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Increment:</span>
            {[0,5,30].map(sec => (
              <Button key={sec} variant="outline" size="sm" onClick={() => applyIncQuick(sec)}>
                +{sec}s
              </Button>
            ))}
          </div>

          {/* Timers */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className={`p-2 rounded-md border ${time.turnSide === 'w' && time.isRunning ? 'bg-primary/10' : ''}`}>
              <div className="text-xs uppercase text-muted-foreground">White</div>
              <div className="text-lg font-semibold">{fmt(time.whiteClock.remainingMs)}</div>
            </div>
            <div className={`p-2 rounded-md border ${time.turnSide === 'b' && time.isRunning ? 'bg-primary/10' : ''}`}>
              <div className="text-xs uppercase text-muted-foreground">Black</div>
              <div className="text-lg font-semibold">{fmt(time.blackClock.remainingMs)}</div>
            </div>
          </div>

          {/* Play/Pause */}
          <div className="flex items-center gap-2">
            {time.isRunning ? (
              <Button variant="outline" size="sm" onClick={pause} className="gap-2">
                <Pause className="h-4 w-4" /> Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={resume} className="gap-2">
                <Play className="h-4 w-4" /> Resume
              </Button>
            )}
            <div className="text-xs text-muted-foreground">
              {time.startedOnFirstMove ? 'Started' : 'Starts on first move'}
            </div>
          </div>
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
            onClick={() => { resetGame(); pause(); }}
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
