import React, { useMemo, useState } from 'react';
import type { Piece, Square } from 'chess.js';
import { useChessStore } from '@/store/chessStore';

interface ChessPieceProps { piece: Piece; square: Square; isSelected: boolean; }

const unicode: Record<'w'|'b', Record<Piece['type'], string>> = {
  w: { k:'♔', q:'♕', r:'♖', b:'♗', n:'♘', p:'♙' },
  b: { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' },
};

function lineIconCandidates(color: 'w'|'b', type: Piece['type']) {
  // Your folder has e.g. Chess_kdt45.svg (dark/black), Chess_klt45.svg (light/white),
  // sometimes duplicated with uppercase first letter.
  const suffix = color === 'w' ? 'lt45' : 'dt45';
  const tLower = type;                 // k q r b n p
  const tUpper = type.toUpperCase();   // K Q R B N P
  return [
    `/pieces/line/Chess_${tLower}${suffix}.svg`,
    `/pieces/line/Chess_${tUpper}${suffix}.svg`,
  ];
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ piece, isSelected }) => {
  const { pieceTheme, pieceSize } = useChessStore();

  const px = useMemo(() => (pieceSize === 'small' ? 48 : pieceSize === 'large' ? 96 : 72), [pieceSize]);
  const wrapper = `flex items-center justify-center transition-transform ${isSelected ? 'scale-110' : ''}`;

  const [idx, setIdx] = useState(0);
  const candidates = useMemo(
    () => (pieceTheme === 'line' ? lineIconCandidates(piece.color, piece.type) : []),
    [pieceTheme, piece.color, piece.type]
  );

  // Fallback to unicode if theme not "line" or no icon found
  if (pieceTheme !== 'line' || idx >= candidates.length) {
    const sym = unicode[piece.color][piece.type];
    const fg = piece.color === 'w' ? 'var(--piece-white-fg, #efefef)' : 'var(--piece-black-fg, #111213)';
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
