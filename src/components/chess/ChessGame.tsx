import React, { useCallback, useRef, useState } from 'react';
import { Chess, Square } from 'chess.js';
import { useTheme } from '../../../theme/ThemeContext';
import GameControls from './GameControls';
import CountdownOverlay from './CountdownOverlay';
import { SFX, playPieceMove } from '../../sfx/sfxstore';
import ChessClock, { ClockSide } from './Clock';

// Use chess.js's Square type instead of plain string
type Move = { from: Square; to: Square; promotion?: string };

const files = ['a','b','c','d','e','f','g','h'] as const;
const ranks = ['8','7','6','5','4','3','2','1'] as const;

const ChessGame: React.FC = () => {
  const { theme } = useTheme();
  const gameRef = useRef(new Chess());
  const [, forceTick] = useState(0);
  const [counting, setCounting] = useState(false);
  const [clockEnabled, setClockEnabled] = useState(true);
  const [clockMinutes, setClockMinutes] = useState(3);
  const [runningSide, setRunningSide] = useState<ClockSide | null>(null);

  // Track the first clicked square (typed as Square)
  const handleSquareClick = useRef<{ from?: Square }>({});

  const onSquareClick = (sq: Square) => {
    const sel = handleSquareClick.current.from;
    if (!sel) {
      handleSquareClick.current.from = sq;
      SFX.play('uiClick');
      return;
    }
    const move: Move = { from: sel, to: sq };
    const result = gameRef.current.move(move as any); // chess.js expects its own Move type; any avoids friction here
    handleSquareClick.current.from = undefined;
    if (result) {
      // play piece-move sound by the piece moved
      playPieceMove(result.piece.toUpperCase());
      // Flip clock turn
      if (clockEnabled) setRunningSide(gameRef.current.turn() as ClockSide);
      forceTick((n) => n + 1);
    } else {
      SFX.play('uiClick');
    }
  };

  const applyStartingSide = (side: 'w' | 'b') => {
    const g = new Chess();
    if (side === 'b') {
      // If starting as black, you can flip board orientation in render (not handled here).
    }
    gameRef.current = g;
    setRunningSide(null);
    forceTick((n) => n + 1);
  };

  const onStart = useCallback(() => {
    setCounting(true);
  }, []);

  const onCountdownDone = useCallback(() => {
    setCounting(false);
    if (clockEnabled) {
      // White starts
      setRunningSide('w');
    }
  }, [clockEnabled]);

  const onClockToggle = (on: boolean) => {
    setClockEnabled(on);
    if (!on) setRunningSide(null);
  };

  const onClockMinutesChange = (m: number) => {
    setClockMinutes(m);
    // resetting of internal clock handled by Clock component upon prop change
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <GameControls
        onApplyStartingSide={applyStartingSide}
        onStart={onStart}
        onClockToggle={onClockToggle}
        onClockMinutesChange={onClockMinutesChange}
        clockEnabled={clockEnabled}
        clockMinutes={clockMinutes}
      />

      {clockEnabled && (
        <ChessClock
          initialMinutes={clockMinutes}
          runningSide={runningSide}
          onFlag={(side) => {
            alert(`${side === 'w' ? 'White' : 'Black'} flagged!`);
            setRunningSide(null);
          }}
        />
      )}

      <div className="chess-board" data-board-style={theme.boardStyle}>
        {ranks.map((r, ri) =>
          files.map((f, fi) => {
            const sq = `${f}${r}` as Square; // <<— typed as Square
            const isDark = (ri + fi) % 2 === 1;
            const p = gameRef.current.get(sq); // get() now receives a Square

            return (
              <div
                key={sq}
                className={`square ${isDark ? 'dark' : 'light'}`}
                onClick={() => onSquareClick(sq)}
              >
                {p && (
                  <div
                    className="piece"
                    draggable={false}
                    data-kind={p.type.toUpperCase()}
                    data-color={p.color}
                    data-style={theme.pieceStyle}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {counting && <CountdownOverlay onDone={onCountdownDone} />}
    </div>
  );
};

export default ChessGame;
