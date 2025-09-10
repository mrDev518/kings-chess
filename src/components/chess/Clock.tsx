
import React, { useEffect, useRef, useState } from 'react';

export type ClockSide = 'w' | 'b';

type ClockProps = {
  initialMinutes: number;         // e.g. 3 or 10
  runningSide: ClockSide | null;  // whose clock is currently ticking
  onFlag?: (side: ClockSide) => void;
};

function format(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60).toString().padStart(2, '0');
  const ss = (total % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * ChessClock controls both timers internally to ensure they stay in sync.
 * Pass runningSide to control who is active; flip it after each successful move.
 */
const ChessClock: React.FC<ClockProps> = ({ initialMinutes, runningSide, onFlag }) => {
  const initialMs = initialMinutes * 60 * 1000;
  const [wMs, setWMs] = useState(initialMs);
  const [bMs, setBMs] = useState(initialMs);
  const lastTickRef = useRef<number | null>(null);

  // Reset when time control changes
  useEffect(() => {
    setWMs(initialMs);
    setBMs(initialMs);
    lastTickRef.current = null;
  }, [initialMinutes]);

  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      if (lastTickRef.current == null) {
        lastTickRef.current = t;
      }
      const dt = t - lastTickRef.current;
      lastTickRef.current = t;
      if (runningSide === 'w') {
        setWMs((ms) => {
          const next = ms - dt;
          if (next <= 0) { onFlag?.('w'); return 0; }
          return next;
        });
      } else if (runningSide === 'b') {
        setBMs((ms) => {
          const next = ms - dt;
          if (next <= 0) { onFlag?.('b'); return 0; }
          return next;
        });
      } else {
        lastTickRef.current = null; // paused
      }
      if (runningSide) raf = requestAnimationFrame(tick);
    };

    if (runningSide) {
      raf = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(raf);
  }, [runningSide, onFlag]);

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div className={`clock ${runningSide === 'w' ? 'active' : ''}`}>
        <strong>White</strong> <span>{format(wMs)}</span>
      </div>
      <div className={`clock ${runningSide === 'b' ? 'active' : ''}`}>
        <strong>Black</strong> <span>{format(bMs)}</span>
      </div>
    </div>
  );
};

export default ChessClock;
