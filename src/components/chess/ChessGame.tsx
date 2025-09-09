import React from 'react';
import { ChessBoard } from './ChessBoard';
import { GameControls } from './GameControls';
import { MoveHistory } from './MoveHistory';
import { PromotionDialog } from './PromotionDialog';
import { SettingsPanel } from './SettingsPanel';
import { Crown } from 'lucide-react';
import { useChessStore } from '@/store/chessStore';

export const ChessGame: React.FC = () => {
  const { 
    pieceTheme, 
    difficulty, 
    gameMode, 
    history,
    setPieceTheme, 
    setDifficulty 
  } = useChessStore();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Crown className="h-8 w-8 text-gold" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
              Chess Master
            </h1>
            <Crown className="h-8 w-8 text-gold" />
          </div>
          <p className="text-muted-foreground">
            Play chess with friends or challenge the AI
          </p>
        </div>

        {/* Game Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
          {/* Left Panel - Game Controls & Settings */}
          <div className="xl:col-span-1 order-2 xl:order-1 space-y-4">
            <GameControls />
            <SettingsPanel
              pieceTheme={pieceTheme}
              difficulty={difficulty}
              gameMode={gameMode}
              onPieceThemeChange={setPieceTheme}
              onDifficultyChange={setDifficulty}
              isGameActive={history.length > 0}
            />
          </div>

          {/* Center - Chess Board */}
          <div className="xl:col-span-2 order-1 xl:order-2 flex justify-center">
            <div className="w-full max-w-[600px]">
              <ChessBoard />
            </div>
          </div>

          {/* Right Panel - Move History */}
          <div className="xl:col-span-1 order-3">
            <MoveHistory />
          </div>
        </div>
      </div>

      {/* Promotion Dialog */}
      <PromotionDialog />
    </div>
  );
};