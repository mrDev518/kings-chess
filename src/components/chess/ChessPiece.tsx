import React, { useMemo, useState } from 'react';
import type { Piece, Square } from 'chess.js';
import { useChessStore } from '@/store/chessStore';

interface ChessPieceProps {
  piece: Piece;
  square: Square;
  isSelected: boolean;
}

/**
 * Piece assets live in /public/pieces/<theme>/
 * Supported themes: line (your CBurnett set), alpha, neo, solid
 * Filenames follow the "Chess_kdt45.svg" scheme for line,
 * and "<color><TYPE>.svg" for alpha/neo/solid (e.g., wK.svg, bQ.svg).
 * If a file is missing, we gracefully fall back to Unicode.
 */

const unicode: Record<'w'|'b', Record<Piece['type'], string>> = {
  w: { k:'♔', q:'♕', r:'♖', b:'♗', n:'♘', p:'♙' },
  b: { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' },
};

function candidateURLs(theme: string, color: 'w'|'b', type: Piece['type']) {
  // Primary preferred filenames per theme:
  if (theme === 'line') {
    const c = color === 'w' ? 'l' : 'd';
    const t = type; // k q r b n p
    // You put files in public/pieces/line/
    return [
      `/pieces/line/Chess_${t}${c}t45.svg`,
      // tolerant variants:
      `/pieces/lines/Chess_${t}${c}t45.svg`,
      `/pieces/line/Chess_${t.toUpperCase()}${c}t45.svg`,
    ];
  }

  // alpha/neo/solid expect simple filenames like wK.svg, bQ.svg
  const fname = `${color}${type.toUpperCase()}.svg`;
  return [
    `/pieces/${theme}/${fname}`,
    // Fallbacks for common naming slips:
    `/pieces/${theme}/${color}${type}.svg`,
  ];
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ piece, isSelected }) => {
  const { pieceTheme } = useChessStore();
  const [idx, setIdx] = useState(0);

  const assets = useMemo(() => {
    // classic uses Unicode only
    if (pieceTheme === 'classic') return [];
    return candidateURLs(pieceTheme, piece.color, piece.type);
  }, [pieceTheme, piece.color, piece.type]);

  const wrapperCls = `flex items-center justify-center ${isSelected ? 'scale-110' : ''}`;
  const size = { width: '2.1rem', height: '2.1rem' };

  // Unicode fallback if no assets to try
  if (!assets.length || idx >= assets.length) {
    const sym = unicode[piece.color][piece.type];
    const fg = piece.color === 'w' ? 'var(--piece-white-fg, #efefef)' : 'var(--piece-black-fg, #111213)';
    return (
      <div className={wrapperCls} style={{ color: fg, fontSize: '1.9rem', lineHeight: 1 }}>
        {sym}
      </div>
    );
  }

  const src = assets[idx];

  return (
    <img
      src={src}
      alt={`${piece.color}${piece.type}`}
      draggable={false}
      className={wrapperCls}
      style={size}
      onError={() => setIdx(i => i + 1)}
    />
  );
};
