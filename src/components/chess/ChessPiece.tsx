import React, { useMemo, useState } from 'react';
import type { Piece, Square } from 'chess.js';
import { useChessStore } from '@/store/chessStore';

interface ChessPieceProps { piece: Piece; square: Square; isSelected: boolean; }

const unicode: Record<'w'|'b', Record<Piece['type'], string>> = {
  w: { k:'♔', q:'♕', r:'♖', b:'♗', n:'♘', p:'♙' },
  b: { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' },
};

// Your file pattern: Chess_kdt45.svg / Chess_klt45.svg etc.
function svgCandidates(base: string, color: 'w'|'b', type: Piece['type']) {
  const suffix = color === 'w' ? 'lt45' : 'dt45';
  const tLower = type;
  const tUpper = type.toUpperCase() as Uppercase<Piece['type']>;
  return [
    `${base}/Chess_${tLower}${suffix}.svg`,
    `${base}/Chess_${tUpper}${suffix}.svg`,
  ];
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ piece, isSelected }) => {
  const { pieceTheme, themeDefs, pieceSize } = useChessStore();
  const px = useMemo(() => (pieceSize === 'small' ? 48 : pieceSize === 'large' ? 96 : 72), [pieceSize]);
  const wrapper = `flex items-center justify-center transition-transform ${isSelected ? 'scale-110' : ''}`;

  const base = themeDefs[pieceTheme]?.pieceAssetBase; // '/pieces/line' (or classic/neo later)
  const [idx, setIdx] = useState(0);

  const candidates = useMemo(
    () => (base ? svgCandidates(base, piece.color, piece.type) : []),
    [base, piece.color, piece.type]
  );

  // Fallback to Unicode if no asset or load error
  if (!base || idx >= candidates.length) {
    const sym = unicode[piece.color][piece.type];
    const fg = piece.color === 'w'
      ? 'var(--piece-white-fg, #efefef)'
      : 'var(--piece-black-fg, #111213)';
    return (
      <div className={wrapper} style={{ color: fg, fontSize: `${px * 0.9}px`, lineHeight: 1 }}>
        {sym}
      </div>
    );
  }

  return (
    <img
      src={candidates[idx]}
      alt={`${piece.color}${piece.type}`}
      draggable={false}
      className={wrapper}
      style={{ width: px, height: px }}
      onError={() => setIdx((v) => v + 1)}
    />
  );
};
