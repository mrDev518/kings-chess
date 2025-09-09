import React from 'react';
import { PieceThemeSelector, PieceTheme } from './PieceThemeSelector';
import { DifficultySlider } from './DifficultySlider';

interface SettingsPanelProps {
  pieceTheme: PieceTheme;
  difficulty: number;
  gameMode: 'friend' | 'bot';
  onPieceThemeChange: (theme: PieceTheme) => void;
  onDifficultyChange: (difficulty: number) => void;
  isGameActive: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  pieceTheme,
  difficulty,
  gameMode,
  onPieceThemeChange,
  onDifficultyChange,
  isGameActive
}) => {
  return (
    <div className="space-y-4">
      <PieceThemeSelector 
        currentTheme={pieceTheme}
        onThemeChange={onPieceThemeChange}
      />
      
      {gameMode === 'bot' && (
        <DifficultySlider
          difficulty={difficulty}
          onDifficultyChange={onDifficultyChange}
          disabled={isGameActive}
        />
      )}
    </div>
  );
};