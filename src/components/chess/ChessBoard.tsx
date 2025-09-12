import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { useChessStore } from '@/store/chessStore';
import { ChessPiece } from './ChessPiece';
import { Sun, Moon } from 'lucide-react';

// NOTE: board orientation now depends on viewSide ('w' bottom or 'b' bottom)

type Particle = { id: number; x: number; y: number; hue: number; createdAt: number };

const readBool = (k: string, def = false) => {
  const v = localStorage.getItem(k);
  return v == null ? def : v === 'true';
};
const writeBool = (k: string, v: boolean) => localStorage.setItem(k, String(v));

export const ChessBoard: React.FC = () => {
  const {
    chess,
    selectedSquare,
    validMoves,
    lastMove,
    gameStatus,
    selectSquare,
    viewSide,
    pieceTheme,
    themeDefs,
    previewFEN,
  } = useChessStore();

  // Render position: review uses previewFEN if present, otherwise live game
  const renderFen = previewFEN ?? chess.fen();
  const renderPos = useMemo(() => {
    try { return new Chess(renderFen); } catch { return chess; }
  }, [renderFen, chess]);

  // Orientation: files/ranks depend on viewSide
  const files = viewSide === 'w' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a'];
  const ranks = viewSide === 'w' ? ['8','7','6','5','4','3','2','1'] : ['1','2','3','4','5','6','7','8'];

  // Theme palette
  const theme = themeDefs[pieceTheme];
  const boardLight = theme.board.light;
  const boardDark  = theme.board.dark;
  const hl = theme.highlight; // { move, capture, last, check }

  // Optional local piece FG toggle (kept; independent of theme)
  const [lightMode, setLightMode] = useState(readBool('chess-light-mode', false));
  useEffect(() => writeBool('chess-light-mode', lightMode), [lightMode]);

  // Always-on move sounds (pawn vs. other pieces)
  const pawnAudioRef = useRef<HTMLAudioElement | null>(null);
  const pieceAudioRef = useRef<HTMLAudioElement | null>(null);

  const squareRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [particles, setParticles] = useState<Particle[]>([]);
  const particleId = useRef(1);

  const lastVerboseMove: Move | null = useMemo(() => {
    const moves = chess.history({ verbose: true }) as Move[];
    return moves.length ? moves[moves.length - 1] : null;
  }, [chess, chess.history().length]);

  // Visual effects (particles) + play sounds per moved piece (from LIVE game state)
  useEffect(() => {
    if (!lastVerboseMove) return;

    const flags = (lastVerboseMove as any).flags as string;
    const to = lastVerboseMove.to as string;
    const movedPiece = (lastVerboseMove as any).piece as string; // 'p','r','n','b','q','k'

    // Particles on capture
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
      }
    }

    // Board shake on castling
    if (flags.includes('k') || flags.includes('q')) {
      if (boardRef.current) {
        boardRef.current.classList.add('rumble');
        setTimeout(() => boardRef.current && boardRef.current.classList.remove('rumble'), 420);
      }
    }

    // Play move sound: pawn vs other pieces
    const play = (el: HTMLAudioElement | null) => {
      if (!el) return;
      try { el.currentTime = 0; el.play(); } catch {}
    };
    if (movedPiece === 'p') play(pawnAudioRef.current);
    else play(pieceAudioRef.current);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVerboseMove?.san]);

  // Particle cleanup
  useEffect(() => {
    if (particles.length === 0) return;
    const t = setInterval(() => {
      const now = performance.now();
      setParticles(prev => prev.filter(p => now - p.createdAt < 650));
    }, 120);
    return () => clearInterval(t);
  }, [particles.length]);

  const onSquareClick = (square: Square) => {
    // If in review preview (detached position), allow clicks only if you want to route training interactions.
    // For safety, block clicks when previewFEN is active to avoid confusing live game state.
    if (previewFEN) return;
    selectSquare(square);
  };

  const validTargets = useMemo(() => new Set(validMoves), [validMoves]);

  // Determine "in check" king square from the *rendered* position (preview or live)
  const checkSquare: string | null = useMemo(() => {
    if (!renderPos.inCheck()) return null;
    const turn = renderPos.turn(); // side currently to move is in check
    // find that king
    for (const r of renderPos.board()) {
      for (const sq of r) {
        if (sq && sq.type === 'k' && sq.color === turn) {
          // need its algebraic square
          // We'll recompute via scan across files/ranks map
        }
      }
    }
    // Fallback: derive from FEN board scanning since chess.js board() misses square coord
    // We'll compute map by rebuilding squares from ranks/files.
    const origFiles = ['a','b','c','d','e','f','g','h'];
    const origRanks = ['8','7','6','5','4','3','2','1'];
    const b = renderPos.board();
    for (let r=0; r<8; r++){
      for (let f=0; f<8; f++){
        const sq = b[r][f];
        if (sq && sq.type==='k' && sq.color===turn){
          return `${origFiles[f]}${origRanks[r]}`;
        }
      }
    }
    return null;
  }, [renderPos]);

  // Light/dark piece fg variables (doesn't override theme colors)
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
            const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheckSq = checkSquare === square;

            const baseBg = isLightSquare ? boardLight : boardDark;

            return (
              <div
                key={square}
                ref={el => (squareRefs.current[square] = el)}
                onClick={() => onSquareClick(square)}
                className={[
                  'relative flex items-center justify-center select-none',
                  isValidTarget ? 'cursor-pointer' : (previewFEN ? 'cursor-not-allowed' : 'cursor-default')
                ].join(' ')}
                style={{
                  userSelect: 'none',
                  background: baseBg,
                  // outline styles from theme
                  boxShadow: [
                    isLast ? `inset 0 0 0 3px ${hl.last}` : '',
                    isSelected ? `inset 0 0 0 3px ${hl.move}` : '',
                    isCheckSq ? `inset 0 0 0 3px ${hl.check}` : '',
                  ].filter(Boolean).join(', ')
                } as React.CSSProperties}
              >
                {/* valid-target dot */}
                {isValidTarget && (
                  <span
                    className="absolute rounded-full"
                    style={{
                      width: 12, height: 12,
                      background: hl.move
                    }}
                  />
                )}

                {/* piece from rendered position (preview or live) */}
                {(() => {
                  const piece = renderPos.get(square);
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

      {/* Hidden audio elements (always on) */}
      <audio ref={pawnAudioRef} src="/sounds/pawn-move.mp3" preload="auto" />
      <audio ref={pieceAudioRef} src="/sounds/piece-move.mp3" preload="auto" />
    </div>
  );
};
