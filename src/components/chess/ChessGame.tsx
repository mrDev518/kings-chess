import React, { useEffect } from 'react';
import { ChessBoard } from './ChessBoard';
import { GameControls } from './GameControls';
import { MoveHistory } from './MoveHistory';
import { PromotionDialog } from './PromotionDialog';
import { SettingsPanel } from './SettingsPanel';
import { EvalBar } from './EvalBar';
import { IllegalMoveHint } from './IllegalMoveHint';
import { Crown } from 'lucide-react';
import { useChessStore } from '@/store/chessStore';
import '@/styles/chess-theme.css';

export const ChessGame: React.FC = () => {
  const {
    pieceTheme, difficulty, gameMode, history,
    playerSide, setPieceTheme, setDifficulty, setPlayerSide, applyStartingSide,
  } = useChessStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-chess-theme', pieceTheme);
  }, [pieceTheme]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">King’s Chess</h1>
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,80px)_minmax(0,740px)_minmax(0,360px)]">
        <div className="order-3 xl:order-1">
          <div className="sticky top-4 h-[640px]">
            <EvalBar />
          </div>
        </div>
        <div className="order-1 xl:order-2">
          <div className="mx-auto max-w-[740px] relative">
            <IllegalMoveHint />     {/* <-- illegal move "?" lives over the board */}
            <ChessBoard />
          </div>
        </div>

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
