import React, { useState } from 'react';
import { ChessBoard } from './ChessBoard';
import { GameControls } from './GameControls';
import { MoveHistory } from './MoveHistory';
import { PromotionDialog } from './PromotionDialog';
import { SettingsPanel } from './SettingsPanel';
import ReviewPanel from './ReviewPanel';
import { Crown, Eye, EyeOff, Save, FileSearch, X } from 'lucide-react';
import { useChessStore } from '@/store/chessStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const ChessGame: React.FC = () => {
  const {
    pieceTheme, difficulty, gameMode, history,
    playerSide, setPieceTheme, setDifficulty,
    setPlayerSide, applyStartingSide,
    showEval, toggleShowEval,
    evalCp, evalMate,
    manualSave,
  } = useChessStore();

  const [reviewOpen, setReviewOpen] = useState(false);

  const evalText =
    evalMate != null
      ? `M${evalMate}`
      : (evalCp != null ? `${evalCp >= 0 ? '+' : ''}${(evalCp / 100).toFixed(2)}` : '—');

  const onSave = async () => {
    const name = window.prompt('Save game as…', 'My game');
    if (!name) return;
    await manualSave(name);
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">King’s Chess</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Eval badge appears when Show Eval is on */}
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

      {/* Two columns: board + sidebar */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,740px)_minmax(0,360px)]">
        {/* Board column */}
        <div>
          <div className="mx-auto max-w-[740px]">
            <ChessBoard />
          </div>
        </div>

        {/* Sidebar column */}
        <div>
          <div className="space-y-4">
            <GameControls />

            {/* Save / Review actions */}
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={onSave} className="w-full" variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Save Game
                </Button>
                <Button onClick={() => setReviewOpen(true)} className="w-full" variant="secondary">
                  <FileSearch className="h-4 w-4 mr-2" />
                  Review Game
                </Button>
              </div>
            </Card>

            <SettingsPanel
              pieceTheme={pieceTheme}
              difficulty={difficulty}
              gameMode={gameMode}
              onPieceThemeChange={(t) => setPieceTheme(t)}
              onDifficultyApply={(elo) => setDifficulty(elo)}
              isGameActive={history.length > 0}
              playerSide={playerSide}
              onPlayerSideChange={(s) => setPlayerSide(s)}
              onApplyStartingSide={() => applyStartingSide()}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <MoveHistory />
      </div>

      <PromotionDialog />

      {/* Review modal */}
      {reviewOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-[900px] p-4 relative">
            <button
              onClick={() => setReviewOpen(false)}
              className="absolute right-3 top-3 p-1 rounded hover:bg-muted"
              aria-label="Close review"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold mb-3">Game Review</h3>
            <ReviewPanel />
          </Card>
        </div>
      )}
    </div>
  );
};
