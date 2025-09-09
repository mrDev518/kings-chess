import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Palette, Check } from 'lucide-react';
import type { PieceTheme } from '@/store/chessStore';

interface PieceThemeSelectorProps {
  currentTheme: PieceTheme;
  onThemeChange: (theme: PieceTheme) => void;   // called on Apply only
}

const themeOptions: { value: PieceTheme; label: string; description: string }[] = [
  { value: 'classic', label: 'Classic', description: 'Unicode pieces' },
  { value: 'alpha',   label: 'Alpha',   description: 'Letters in tokens' },
  { value: 'neo',     label: 'Neo',     description: 'Bold modern tokens' },
  { value: 'solid',   label: 'Solid',   description: 'Solid disks + initials' },
  { value: 'line',    label: 'Line',    description: 'Outlined initials' },
];

export const PieceThemeSelector: React.FC<PieceThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  const [pending, setPending] = useState<PieceTheme>(currentTheme);
  useEffect(() => setPending(currentTheme), [currentTheme]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Piece Theme</h3>
      </div>

      <div className="space-y-3">
        <Select value={pending} onValueChange={(v) => setPending(v as PieceTheme)}>
          <SelectTrigger>
            <SelectValue placeholder="Select theme..." />
          </SelectTrigger>
          <SelectContent>
            {themeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => onThemeChange(pending)} className="w-full">
          <Check className="h-4 w-4 mr-2" /> Apply Theme
        </Button>
      </div>
    </Card>
  );
};
