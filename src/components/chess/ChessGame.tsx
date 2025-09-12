import React, { useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from './ChessBoard';
import { GameControls } from './GameControls';
import { MoveHistory } from './MoveHistory';
import { PromotionDialog } from './PromotionDialog';
import { SettingsPanel } from './SettingsPanel';
import { EvalBar } from './EvalBar';
import { Crown, Eye, EyeOff, FileDown, FileUp } from 'lucide-react';
import { useChessStore } from '@/store/chessStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/** Mini eval graph for the review sidebar */
function EvalGraphInline({ cps }:{ cps:number[] }) {
  if (!cps.length) {
    return (
      <div className="h-24 rounded border flex items-center justify-center text-xs text-muted-foreground">
        Review graph
      </div>
    );
  }
  const width = 280, height = 120, max = 600;
  const pts = cps.map((cp, i) => {
    const x = (i / Math.max(1, cps.length - 1)) * width;
    const y = height/2 - Math.max(-max, Math.min(max, cp)) * (height/2) / max;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="block">
      <rect x="0" y="0" width={width} height={height} rx="6" className="fill-muted" />
      <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="currentColor" opacity="0.25"/>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

export const ChessGame: React.FC = () => {
  const {
    pieceTheme, difficulty, gameMode, history,
    playerSide, setPieceTheme, setDifficulty,
    setPlayerSide, applyStartingSide,
    showEval, toggleShowEval,
    evalCp, evalMate,
  } = useChessStore();

  const [reviewOn, setReviewOn] = useState(false);

  const evalText = evalMate != null
    ? `M${evalMate}`
    : evalCp != null
      ? `${evalCp >= 0 ? '+' : ''}${(evalCp / 100).toFixed(2)}`
      : '—';

  // Numbered SAN for export
  const numberedSAN = useMemo(() => {
    const moves = useChessStore.getState().moves;
    if (!moves.length) {
      const san = useChessStore.getState().chess.history();
      let out = ''; let n = 1;
      for (let i=0;i<san.length;i++){
        if (i%2===0) out += `${n++}. `;
        out += san[i] + (i===san.length-1 ? '' : ' ');
      }
      return out.trim();
    }
    let out = ''; let n = 1;
    for (let i=0;i<moves.length;i++){
      if (i%2===0) out += `${n++}. `;
      out += moves[i].san + (i===moves.length-1 ? '' : ' ');
    }
    return out.trim();
  }, [history.length]);

  const onExport = () => {
    const blob = new Blob([numberedSAN + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'game-moves.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Import simple numbered SAN ----
  const fileRef = useRef<HTMLInputElement>(null);
  const onPickFile = () => fileRef.current?.click();

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();

    const importNumberedSAN = (txt: string) => {
      const body = txt
        .replace(/\{[^}]*\}/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\$\d+/g, ' ')
        .replace(/\d+\.(\.\.)?/g, ' ')
        .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
        .trim();

      const tokens = body.split(/\s+/).filter(Boolean);

      const ch = new Chess();
      for (const san of tokens) {
        const mv = ch.move(san as any, { sloppy: true } as any);
        if (!mv) return null;
      }
      return ch;
    };

    const imported = importNumberedSAN(text);
    if (!imported) {
      alert('Could not import this move list.');
      e.target.value = '';
      return;
    }

    const s = useChessStore.getState();
    const movesV = imported.history({ verbose: true }) as any[];
    const lastMove = movesV.length
      ? { from: movesV[movesV.length - 1].from, to: movesV[movesV.length - 1].to }
      : null;

    useChessStore.setState({
      chess: imported,
      history: imported.history(),
      lastMove,
      currentPlayer: imported.turn() === 'w' ? 'white' : 'black',
      selectedSquare: null,
      validMoves: [],
    });

    s.updateGameStatus();
    await s.updateEvaluation();

    e.target.value = '';
  };

  const cpSeries = useMemo(() => {
    const ms = useChessStore.getState().moves;
    return ms.map(m =>
      m.evalAfter?.mate != null
        ? (m.evalAfter.mate > 0 ? 10000 : -10000)
        : (m.evalAfter?.cp ?? 0)
    );
  }, [history.length]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">King’s Chess</h1>
        </div>

        <div className="flex items-center gap-3">
          {showEval && (
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded bg-zinc-800 text-white font-mono text-sm">
              {evalText}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={toggleShowEval} className="gap-2">
            {showEval ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showEval ? 'Hide Eval' : 'Show Eval'}
          </Button>
        </div>
      </div>

      {/* TOP ROW: Eval (left) | Board (center) | History/Review (right) */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[minmax(0,80px)_minmax(0,740px)_minmax(0,360px)] items-start">
        {/* Eval column (sticky) */}
        <div className="order-3 xl:order-1">
          <div className="sticky top-4 h-[640px]">
            {showEval ? (
              <EvalBar />
            ) : (
              <Card className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">
                Eval hidden
              </Card>
            )}
          </div>
        </div>

        {/* Board column */}
        <div className="order-1 xl:order-2">
          <div className="mx-auto max-w-[740px]">
            <ChessBoard />
          </div>
        </div>

        {/* Right column: small move history + review graph + import/export */}
        <div className="order-2 xl:order-3 space-y-4">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Move History</div>
              <Button size="sm" variant={reviewOn ? 'secondary' : 'outline'} onClick={() => setReviewOn(v => !v)}>
                {reviewOn ? 'Hide Review' : 'Review Game'}
              </Button>
            </div>
            <div className="max-h-[260px] overflow-auto rounded border">
              <MoveHistory />
            </div>
          </Card>

          {reviewOn && (
            <Card className="p-3">
              <div className="text-sm font-semibold mb-2">Evaluation Graph</div>
              <EvalGraphInline cps={cpSeries} />
            </Card>
          )}

          <Card className="p-3">
            <div className="text-sm font-semibold mb-2">Import / Export</div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={onPickFile} variant="outline" className="gap-2">
                <FileUp className="h-4 w-4" />
                Import
              </Button>
              <Button onClick={onExport} className="gap-2" variant="secondary">
                <FileDown className="h-4 w-4" />
                Export
              </Button>
            </div>
            <input ref={fileRef} type="file" accept=".txt,.pgn,text/plain" className="hidden" onChange={onImport}/>
            <p className="mt-2 text-xs text-muted-foreground">
              Import expects a simple numbered SAN list (e.g., <code>1. e4 e5 2. Nf3 Nc6</code>). Export creates the same format.
            </p>
          </Card>
        </div>
      </div>

      {/* BOTTOM ROW: Tools */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mt-6">
        <Card className="p-4">
          <GameControls />
        </Card>

        <Card className="p-4 md:col-span-1 xl:col-span-2">
          <SettingsPanel
            pieceTheme={pieceTheme}
            difficulty={difficulty}
            gameMode={gameMode}
            onPieceThemeChange={setPieceTheme}
            onDifficultyApply={setDifficulty}
            isGameActive={history.length > 0}
            playerSide={playerSide}
            onPlayerSideChange={setPlayerSide}
            onApplyStartingSide={applyStartingSide}
          />
        </Card>
      </div>

      <PromotionDialog />
    </div>
  );
};
