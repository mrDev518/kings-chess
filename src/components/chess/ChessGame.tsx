import React from 'react';
import { ChessBoard } from './ChessBoard';
import { GameControls } from './GameControls';
import { MoveHistory } from './MoveHistory';
import { PromotionDialog } from './PromotionDialog';
import { SettingsPanel } from './SettingsPanel';
import { EvalBar } from './EvalBar';
import { Crown, Eye, EyeOff } from 'lucide-react';
import { useChessStore } from '@/store/chessStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const ChessGame: React.FC = () => {
  const {
    pieceTheme, difficulty, gameMode, history,
    playerSide, setPieceTheme, setDifficulty,
    setPlayerSide, applyStartingSide,
    showEval, toggleShowEval,
  } = useChessStore();

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">King’s Chess</h1>
        </div>

        <Button variant="outline" size="sm" onClick={toggleShowEval} className="gap-2">
          {showEval ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showEval ? 'Hide Eval' : 'Show Eval'}
        </Button>
      </div>

      {/* Fixed 3-column shell to prevent layout jumping */}
      <div className="grid gap-6
                      grid-cols-1
                      xl:grid-cols-[minmax(0,80px)_minmax(0,740px)_minmax(0,360px)]">
        {/* Eval column (keeps space even when hidden) */}
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

        {/* Sidebar column */}
        <div className="order-2 xl:order-3">
          <div className="space-y-4">
            <GameControls />
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
    </div>
  );
};
