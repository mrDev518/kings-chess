import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Brain, Check } from 'lucide-react';

interface DifficultySliderProps {
  difficulty: number; // current applied ELO (200–2500)
  onApply: (difficulty: number) => void; // called only when pressing "Set AI Strength"
  disabled?: boolean;
}

const labelFor = (elo: number) => {
  if (elo < 800) return 'Beginner';
  if (elo < 1200) return 'Novice';
  if (elo < 1600) return 'Intermediate';
  if (elo < 2000) return 'Advanced';
  if (elo < 2300) return 'Expert';
  return 'Master';
};

export const DifficultySlider: React.FC<DifficultySliderProps> = ({
  difficulty,
  onApply,
  disabled = false
}) => {
  const [pending, setPending] = useState(difficulty);
  useEffect(() => setPending(difficulty), [difficulty]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Bot Rating</h3>
      </div>

      <div className="space-y-3">
        <Slider
          value={[pending]}
          min={200}
          max={2500}              
          step={50}
          onValueChange={(v) => setPending((Array.isArray(v) ? v[0] : v) as number)}
          disabled={disabled}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>200</span><span>800</span><span>1500</span><span>2000</span><span>2500</span>
        </div>

        <div className="text-center">
          <div className="font-semibold text-primary">{labelFor(pending)}</div>
          <div className="text-xs text-muted-foreground">~{Math.round(pending)} ELO</div>
        </div>

        <Button className="w-full" onClick={() => onApply(pending)}>
          <Check className="h-4 w-4 mr-2" /> Set AI Strength
        </Button>
      </div>
    </Card>
  );
};
