import React from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Brain } from 'lucide-react';

interface DifficultySliderProps {
  difficulty: number; // 0-20 (Stockfish skill level)
  onDifficultyChange: (difficulty: number) => void;
  disabled?: boolean;
}

const getDifficultyLabel = (skillLevel: number): string => {
  if (skillLevel <= 3) return 'Beginner';
  if (skillLevel <= 7) return 'Intermediate';
  if (skillLevel <= 12) return 'Advanced';
  if (skillLevel <= 17) return 'Expert';
  return 'Master';
};

const skillLevelToRating = (skillLevel: number): number => {
  // Map skill level 0-20 to rating 200-2500
  return Math.round(200 + (skillLevel * 115));
};

export const DifficultySlider: React.FC<DifficultySliderProps> = ({
  difficulty,
  onDifficultyChange,
  disabled = false
}) => {
  const rating = skillLevelToRating(difficulty);
  const label = getDifficultyLabel(difficulty);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium text-muted-foreground">
            Bot Difficulty
          </label>
        </div>
        
        <div className="space-y-3">
          <Slider
            value={[difficulty]}
            onValueChange={(values) => onDifficultyChange(values[0])}
            min={0}
            max={20}
            step={1}
            disabled={disabled}
            className="w-full"
          />
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Beginner</span>
            <div className="text-center">
              <div className="font-semibold text-primary">{label}</div>
              <div className="text-xs text-muted-foreground">~{rating} ELO</div>
            </div>
            <span className="text-muted-foreground">Master</span>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          Adjust the AI strength to match your skill level
        </div>
      </div>
    </Card>
  );
};