import React, { useMemo, useState } from 'react';
import type { Piece, Square } from 'chess.js';
import { useChessStore } from '@/store/chessStore';

interface ChessPieceProps { piece: Piece; square: Square; isSelected: boolean; }

const unicode: Record<'w'|'b', Record<Piece['type'], string>> = {
  w: { k:'♔', q:'♕', r:'♖', b:'♗', n:'♘', p:'♙' },
  b: { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' },
};

// You placed files in public/pieces/line with names like "Chess_kdt45.svg".
function candidateURLs(color: 'w'|'b', type: Piece['type']) {
  const c = color === 'w' ? 'l' : 'd';
  const tLower = type;                 // k q r b n p
  const tUpper = type.toUpperCase();   // K Q R B N P
  return [
    `/pieces/line/Chess_${tLower}${c}t45.svg`,
    `/pieces/line/Chess_${tUpper}${c}t45.svg`,
    // also try plural folder just in case:
    `/pieces/lines/Chess_${tLower}${c}t45.svg`,
    `/pieces/lines/Chess_${tUpper}${c}t45.svg`,
  ];
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ piece, isSelected }) => {
  const { pieceTheme } = useChessStore();
  const wrapper = `flex items-center justify-center ${isSelected ? 'scale-110' : ''}`;
  const size = { width: '2.1rem', height: '2.1rem' };

  // Only use external SVGs for the "line" theme; otherwise fallback to unicode.
  const list = useMemo(
    () => (pieceTheme === 'line' ? candidateURLs(piece.color, piece.type) : []),
    [pieceTheme, piece.color, piece.type]
  );
  const [i, setI] = useState(0);

  if (pieceTheme !== 'line' || i >= list.length) {
    const sym = unicode[piece.color][piece.type];
    const fg = piece.color === 'w' ? 'var(--piece-white-fg, #efefef)' : 'var(--piece-black-fg, #111213)';
    return <div className={wrapper} style={{ color: fg, fontSize: '1.9rem', lineHeight: 1 }}>{sym}</div>;
  }

  return (
    <img
      src={list[i]}
      alt={`${piece.color}${piece.type}`}
      draggable={false}
      className={wrapper}
      style={size}
      onError={() => setI((v) => v + 1)} // try next path if a file is missing
    />
  );
};
