import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Square, Move } from 'chess.js';
import { useChessStore } from '@/store/chessStore';
import { ChessPiece } from './ChessPiece';
import { Sparkles, Settings2, Sun, Moon } from 'lucide-react';

// NOTE: board orientation now depends on viewSide ('w' bottom or 'b' bottom)

type Particle = { id: number; x: number; y: number; hue: number; createdAt: number };

const readBool = (k: string, def = false) => {
  const v = localStorage.getItem(k);
  return v == null ? def : v === 'true';
};
const writeBool = (k: string, v: boolean) => localStorage.setItem(k, String(v));

const readVol = (k: string, def = 0.8) => {
  const raw = localStorage.getItem(k);
  const n = raw ? Number(raw) : def;
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : def;
};

const useAudio = (vols: { clank: number; gasp: number; rumble: number; swoosh: number; vuvu: number }) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = () => {
    if (!ctxRef.current) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      ctxRef.current = new AC();
    }
    return ctxRef.current!;
  };

  // sword clank (capture)
  const swordClank = () => {
    if (vols.clank <= 0) return;
    const ctx = getCtx();
    const now = ctx.currentTime;
    const ping = (f: number, t0: number) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(f, now + t0);
      g.gain.setValueAtTime(0.0001, now + t0);
      g.gain.exponentialRampToValueAtTime(0.18 * vols.clank, now + t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + 0.15);
      o.connect(g).connect(ctx.destination); o.start(now + t0); o.stop(now + t0 + 0.2);
    };
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.6));
    noise.buffer = buffer; const ng = ctx.createGain(); ng.gain.value = 0.2 * vols.clank;
    noise.connect(ng).connect(ctx.destination); ping(1200, 0); ping(900, 0.03); noise.start(now + 0.01);
  };
  // gasp (check)
  const gasp = () => {
    if (vols.gasp <= 0) return;
    const ctx = getCtx(); const now = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(600, now); o.frequency.exponentialRampToValueAtTime(280, now + 0.25);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.22 * vols.gasp, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.36);
  };
  const rumble = () => {
    if (vols.rumble <= 0) return;
    const ctx = getCtx(); const now = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(55, now);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.2 * vols.rumble, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.45);
  };
  const swoosh = () => {
    if (vols.swoosh <= 0) return;
    const ctx = getCtx(); const now = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(1200, now); o.frequency.exponentialRampToValueAtTime(300, now + 0.35);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.18 * vols.swoosh, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.45);
  };
  const vuvuzela = () => {
    if (vols.vuvu <= 0) return;
    const ctx = getCtx(); const now = ctx.currentTime;
    const mk = (f: number, gpeak: number, d: number) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(gpeak * vols.vuvu, now + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, now + d);
      o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + d + 0.02);
    };
    mk(235, 0.12, 0.9); mk(470, 0.06, 0.7); mk(705, 0.03, 0.6);
  };

  return { swordClank, gasp, rumble, swoosh, vuvuzela };
};

const FXSlider: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-1">
    <div className="text-xs text-muted-foreground">{label}</div>
    <input type="range" min={0} max={100} value={Math.round(value * 100)}
      onChange={(e) => onChange(Math.max(0, Math.min(1, Number(e.target.value) / 100)))} className="w-full" />
  </div>
);

export const ChessBoard: React.FC = () => {
  const { chess, selectedSquare, validMoves, lastMove, gameStatus, selectSquare, viewSide } = useChessStore();

  // Orientation: files/ranks depend on viewSide
  const files = viewSide === 'w' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a'];
  const ranks = viewSide === 'w' ? ['8','7','6','5','4','3','2','1'] : ['1','2','3','4','5','6','7','8'];

  // Light/Dark board toggle (kept)
  const [lightMode, setLightMode] = useState(readBool('chess-light-mode', false));
  useEffect(() => writeBool('chess-light-mode', lightMode), [lightMode]);

  // FX + volumes (kept)
  const [showFX, setShowFX] = useState(false);
  const [clankVol, setClankVol] = useState(readVol('fx-vol-clank', 0.9));
  const [gaspVol, setGaspVol] = useState(readVol('fx-vol-gasp', 0.8));
  const [rumbleVol, setRumbleVol] = useState(readVol('fx-vol-rumble', 0.9));
  const [swooshVol, setSwooshVol] = useState(readVol('fx-vol-swoosh', 0.8));
  const [vuvuVol, setVuvuVol] = useState(readVol('fx-vol-vuvuzela', 0.5));

  const { swordClank, gasp, rumble, swoosh, vuvuzela } = useAudio({
    clank: clankVol, gasp: gaspVol, rumble: rumbleVol, swoosh: swooshVol, vuvu: vuvuVol,
  });

  const squareRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [particles, setParticles] = useState<Particle[]>([]);
  const particleId = useRef(1);

  const lastVerboseMove: Move | null = useMemo(() => {
    const moves = chess.history({ verbose: true }) as Move[];
    return moves.length ? moves[moves.length - 1] : null;
  }, [chess, chess.history().length]);

  useEffect(() => {
    if (!lastVerboseMove) return;
    const flags = (lastVerboseMove as any).flags as string;
    const to = lastVerboseMove.to as string;

    if (flags.includes('c') || flags.includes('e')) {
      const el = squareRefs.current[to];
      if (el && boardRef.current) {
        const b = boardRef.current.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const x = r.left - b.left + r.width / 2;
        const y = r.top - b.top + r.height / 2;
        const now = performance.now();
        const burst: Particle[] = Array.from({ length: 18 }, () => ({
          id: particleId.current++, x, y, hue: Math.floor(Math.random() * 360), createdAt: now
        }));
        setParticles(prev => [...prev, ...burst]);
        swordClank();
      }
    }

    if (flags.includes('k') || flags.includes('q')) {
      rumble();
      if (boardRef.current) {
        boardRef.current.classList.add('rumble');
        setTimeout(() => boardRef.current && boardRef.current.classList.remove('rumble'), 420);
      }
    }

    if (flags.includes('e')) swoosh();
    if ((lastVerboseMove as any).promotion) vuvuzela();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVerboseMove?.san]);

  useEffect(() => { if (gameStatus === 'check') gasp(); }, [gameStatus]); // gasp on check

  useEffect(() => {
    if (particles.length === 0) return;
    const t = setInterval(() => {
      const now = performance.now();
      setParticles(prev => prev.filter(p => now - p.createdAt < 650));
    }, 120);
    return () => clearInterval(t);
  }, [particles.length]);

  const onSquareClick = (square: Square) => selectSquare(square);
  const validTargets = useMemo(() => new Set(validMoves), [validMoves]);

  // Light/dark piece fg variables
  const boardVars: React.CSSProperties = lightMode
    ? { ['--piece-white-fg' as any]: '#111', ['--piece-black-fg' as any]: '#111' }
    : { ['--piece-white-fg' as any]: '#efefef', ['--piece-black-fg' as any]: '#121212' };

  return (
    <div className="relative w-full" style={boardVars}>
      <style>{`
        @keyframes sparkle-pop {
          0% { transform: translate(var(--sx), var(--sy)) scale(0.6); opacity: 0.9; }
          70% { opacity: 0.9; }
          100% { transform: translate(calc(var(--sx) * 2.2), calc(var(--sy) * 2.2)) scale(0.2); opacity: 0; }
        }
        .sparkle { position: absolute; width: 8px; height: 8px; border-radius: 9999px; pointer-events: none;
          animation: sparkle-pop 0.65s ease-out forwards;
          box-shadow: 0 0 8px rgba(255,255,255,0.6), 0 0 14px rgba(255,255,255,0.35) inset; }
        @keyframes rumble {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-2px, 1px) rotate(-0.2deg); }
          40% { transform: translate(1px, -2px) rotate(0.2deg); }
          60% { transform: translate(-1px, 2px) rotate(-0.15deg); }
          80% { transform: translate(2px, -1px) rotate(0.15deg); }
          100% { transform: translate(0, 0) rotate(0); }
        }
        .rumble { animation: rumble 0.42s linear 0s 1; }
      `}</style>

      {/* Light/Dark toggle */}
      <button
        onClick={() => setLightMode(v => !v)}
        className="absolute -top-3 left-0 z-20 text-xs px-2 py-1 rounded-full bg-muted border flex items-center gap-1 shadow"
        title="Toggle light/dark board"
      >
        {lightMode ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
        {lightMode ? 'Light' : 'Dark'}
      </button>

      {/* FX toggle */}
      <button
        onClick={() => setShowFX(v => !v)}
        className="absolute -top-3 right-0 z-20 text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground flex items-center gap-1 shadow"
        title="Toggle board effects panel"
      >
        <Sparkles className="h-3 w-3" /> FX
      </button>

      <div
        ref={boardRef}
        className={`relative grid grid-cols-8 grid-rows-8 gap-0 rounded-xl overflow-hidden border ${
          gameStatus === 'check' ? 'ring-2 ring-destructive' : 'ring-1 ring-border'
        }`}
        style={{ width: 'min(80vw, 640px)', aspectRatio: '1 / 1' }}
      >
        {ranks.map((rank, rIdx) =>
          files.map((file, fIdx) => {
            const square = `${file}${rank}` as Square;
            const isLightSquare = (rIdx + fIdx) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isValidTarget = validTargets.has(square);
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);

            const lightBg = lightMode ? 'bg-[hsl(0,0%,94%)]' : 'bg-muted/50';
            const darkBg  = lightMode ? 'bg-[hsl(0,0%,80%)]' : 'bg-muted/90';

            return (
              <div
                key={square}
                ref={el => (squareRefs.current[square] = el)}
                onClick={() => onSquareClick(square)}
                className={[
                  'relative flex items-center justify-center select-none',
                  isLightSquare ? lightBg : darkBg,
                  isSelected ? 'outline outline-2 outline-primary' : '',
                  isLastMove ? 'ring ring-primary/40' : '',
                  isValidTarget ? 'cursor-pointer' : 'cursor-default'
                ].join(' ')}
                style={{ userSelect: 'none' }}
              >
                {isValidTarget && <span className="absolute w-3 h-3 rounded-full bg-primary/40" />}
                {(() => {
                  const piece = chess.get(square);
                  return piece ? <ChessPiece piece={piece} square={square} isSelected={isSelected} /> : null;
                })()}
              </div>
            );
          })
        )}

        {/* Files (letters) */}
        <div className="absolute -bottom-6 left-0 right-0 flex justify-around text-sm text-muted-foreground font-medium">
          {files.map((file) => (
            <span key={file} className="w-8 text-center">{file}</span>
          ))}
        </div>
        {/* Ranks (numbers) */}
        <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-around text-sm text-muted-foreground font-medium">
          {ranks.map((rank) => (
            <span key={rank} className="h-8 flex items-center">{rank}</span>
          ))}
        </div>

        {/* PARTICLES */}
        <div className="pointer-events-none absolute inset-0">
          {particles.map((p) => {
            const angle = (p.id % 360) * (Math.PI / 180);
            const spread = 22 + (p.id % 9);
            const dx = Math.cos(angle) * spread;
            const dy = Math.sin(angle) * spread;
            return (
              <div
                key={p.id}
                className="sparkle"
                style={{
                  left: p.x - 4,
                  top: p.y - 4,
                  background: `hsl(${p.hue} 90% 60%)`,
                  // @ts-ignore
                  '--sx': `${dx}px`,
                  '--sy': `${dy}px`,
                } as React.CSSProperties}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
