import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useChessStore } from '@/store/chessStore';

// Gentler mapping: clamp to ±600cp, logistic divisor 1600 (flatter curve)
function cpToWinProb(cp: number) {
  const c = Math.max(-600, Math.min(600, cp));
  return 1 / (1 + Math.pow(10, -c / 1600));
}

export const EvalBar: React.FC = () => {
  const evalCp = useChessStore(s => s.evalCp);
  const evalMate = useChessStore(s => s.evalMate);

  const { whitePct, bigNumber, sub } = useMemo(() => {
    if (evalMate !== null) {
      const whiteWinning = evalMate > 0;
      return { whitePct: whiteWinning ? 0.99 : 0.01, bigNumber: `${whiteWinning ? '' : '−'}M${Math.abs(evalMate)}`, sub: 'mate' };
    }
    if (typeof evalCp === 'number') {
      const p = cpToWinProb(evalCp);
      // round to nearest 5cp for a calmer number
      const cpRounded = Math.round(evalCp / 5) * 5;
      const signed = cpRounded >= 0 ? `+${cpRounded}` : `${cpRounded}`;
      return { whitePct: p, bigNumber: signed, sub: 'cp' };
    }
    return { whitePct: 0.5, bigNumber: '—', sub: '' };
  }, [evalCp, evalMate]);

  const whiteH = `${Math.round(whitePct * 100)}%`;
  const blackH = `${100 - Math.round(whitePct * 100)}%`;

  return (
    <Card className="p-2 h-full">
      <div className="flex flex-col items-center h-full">
        <div className="text-xs text-muted-foreground mb-2">Eval</div>
        <div className="relative h-[560px] w-6 rounded overflow-hidden border">
          <div className="absolute top-0 left-0 right-0 bg-white" style={{ height: whiteH }} />
          <div className="absolute bottom-0 left-0 right-0 bg-black/90" style={{ height: blackH }} />
        </div>
        <div className="mt-3 text-xl font-semibold tabular-nums">{bigNumber}</div>
        <div className="text-[10px] text-muted-foreground mt-1">(+ = White{sub ? `, ${sub}` : ''})</div>
      </div>
    </Card>
  );
};
