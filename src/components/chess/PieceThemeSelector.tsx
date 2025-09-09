import React from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette } from 'lucide-react';

export type PieceTheme = 'classic' | 'modern' | 'fantasy' | 'alpha';

interface PieceThemeSelectorProps {
  currentTheme: PieceTheme;
  onThemeChange: (theme: PieceTheme) => void;
}

const themeOptions = [
  { value: 'classic', label: 'Classic', description: 'Traditional chess pieces' },
  { value: 'modern', label: 'Modern', description: 'Clean, minimalist design' },
  { value: 'fantasy', label: 'Fantasy', description: 'Ornate, decorative pieces' },
  { value: 'alpha', label: 'Alpha', description: 'Simple letter-based pieces' }
];

export const PieceThemeSelector: React.FC<PieceThemeSelectorProps> = ({
  currentTheme,
  onThemeChange
}) => {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium text-muted-foreground">
            Piece Theme
          </label>
        </div>
        
        <Select value={currentTheme} onValueChange={(value: PieceTheme) => onThemeChange(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {themeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Theme Preview */}
        <div className="flex justify-center gap-2 p-2 bg-muted/30 rounded-lg">
          <span className="text-2xl">♔</span>
          <span className="text-2xl">♕</span>
          <span className="text-2xl">♖</span>
          <span className="text-2xl">♗</span>
          <span className="text-2xl">♘</span>
          <span className="text-2xl">♙</span>
        </div>
      </div>
    </Card>
  );
};