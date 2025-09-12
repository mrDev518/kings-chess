import React from 'react';
import { Chess } from 'chess.js';
import { useChessStore } from '@/store/chessStore';

export default function ReviewPanel() {
  const { moves, setReviewCursor, setPreviewPosition, reviewCursor } = useChessStore();
  const cpVals = moves.map(m =>
    m.evalAfter?.mate != null ? (m.evalAfter.mate > 0 ? 10000 : -10000) : (m.evalAfter?.cp ?? 0)
  );

  return (
    <div className="p-3 space-y-3">
      <EvalGraph cps={cpVals} />

      {/* Mistake navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => jumpToNext(q => q.quality === 'Mistake' || q.quality === 'Blunder')}
          className="px-2 py-1 border rounded"
        >
          Next Mistake
        </button>
        <button
          onClick={() => jumpToPrev(q => q.quality === 'Mistake' || q.quality === 'Blunder')}
          className="px-2 py-1 border rounded"
        >
          Prev Mistake
        </button>
      </div>
    </div>
  );
}

function EvalGraph({ cps }:{ cps:number[] }) {
  const width = 480, height = 120;
  const max = 600;
  const pts = cps.map((cp,i) => {
    const x = (i / Math.max(1, cps.length - 1)) * width;
    const y = height / 2 - Math.max(-max, Math.min(max, cp)) * (height / 2) / max;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="block">
      <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="currentColor" opacity={0.2} />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function findIndexFrom(from:number, dir:1|-1, pred:(m:any)=>boolean, arr:any[]) {
  for (let i = from + dir; i >= 0 && i < arr.length; i += dir) {
    if (pred(arr[i])) return i;
  }
  return -1;
}
function jumpToMoveIndex(i:number) {
  const s = useChessStore.getState();
  const temp = new Chess();
  for (let k=0; k<=i; k++) temp.move(s.moves[k].san);
  s.setReviewCursor(i);
  s.setPreviewPosition(temp.fen());
}
function jumpToNext(pred:(m:any)=>boolean) {
  const s = useChessStore.getState();
  const start = s.reviewCursor ?? -1;
  const idx = findIndexFrom(start, 1, pred, s.moves);
  if (idx >= 0) jumpToMoveIndex(idx);
}
function jumpToPrev(pred:(m:any)=>boolean) {
  const s = useChessStore.getState();
  const start = s.reviewCursor ?? s.moves.length;
  const idx = findIndexFrom(start, -1, pred, s.moves);
  if (idx >= 0) jumpToMoveIndex(idx);
}
