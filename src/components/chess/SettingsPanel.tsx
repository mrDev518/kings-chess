import React, { useState, useEffect } from 'react';
import { PieceThemeSelector } from './PieceThemeSelector';
import { DifficultySlider } from './DifficultySlider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shuffle, User, Bot, Check } from 'lucide-react';
import type { PieceTheme, PlayerSide } from '@/store/chessStore';

interface SettingsPanelProps {
  pieceTheme: PieceTheme;
  difficulty: number;
  gameMode: 'friend' | 'bot';
  onPieceThemeChange: (theme: PieceTheme) => void;   // apply only on click
  onDifficultyApply: (difficulty: number) => void;   // apply only on click
  isGameActive: boolean;

  // new starting side
  playerSide: PlayerSide;
  onPlayerSideChange: (side: PlayerSide) => void; // sets pending selection
  onApplyStartingSide: () => void;               // applies (sets bot side, resets, triggers bot if needed)
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  pieceTheme,
  difficulty,
  gameMode,
  onPieceThemeChange,
  onDifficultyApply,
  isGameActive,
  playerSide,
  onPlayerSideChange,
  onApplyStartingSide,
}) => {
  const [pendingSide, setPendingSide] = useState<PlayerSide>(playerSide);
  useEffect(() => setPendingSide(playerSide), [playerSide]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Starting Side</h3>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2">
          <Button
            type="button"
            variant={pendingSide === 'white' ? 'default' : 'secondary'}
            onClick={() => setPendingSide('white')}
          >
            <User className="h-4 w-4 mr-1" /> White
          </Button>
          <Button
            type="button"
            variant={pendingSide === 'black' ? 'default' : 'secondary'}
            onClick={() => setPendingSide('black')}
          >
            <Bot className="h-4 w-4 mr-1" /> Black
          </Button>
          <Button
            type="button"
            variant={pendingSide === 'random' ? 'default' : 'secondary'}
            onClick={() => setPendingSide('random')}
          >
            <Shuffle className="h-4 w-4 mr-1" /> Random
          </Button>
        </div>

        <Button
          className="w-full"
          onClick={() => {
            onPlayerSideChange(pendingSide); // persist selection
            onApplyStartingSide();           // compute bot side, reset, maybe bot moves first
          }}
        >
          <Check className="h-4 w-4 mr-2" /> Apply Starting Side
        </Button>
      </Card>

      <PieceThemeSelector currentTheme={pieceTheme} onThemeChange={onPieceThemeChange} />

      {gameMode === 'bot' && (
        <DifficultySlider difficulty={difficulty} onApply={onDifficultyApply} disabled={false} />
      )}
    </div>
  );
};
