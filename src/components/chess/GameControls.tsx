import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FxPanel } from './FxPanel';
import { useChessStore } from '@/store/chessStore';

// Keep whatever other controls you already had; this shows only the FX bit
export const GameControls: React.FC = () => {
  const [openFx, setOpenFx] = useState(false);
  const { isThinking, gameMode } = useChessStore();

  return (
    <div className="flex items-center gap-2">
      {/* YOUR other buttons (new game / undo / vs bot etc.) remain here */}

      <Button variant="outline" size="sm" onClick={() => setOpenFx(true)}>
        FX
      </Button>

      <Dialog open={openFx} onOpenChange={setOpenFx}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sound Effects</DialogTitle>
          </DialogHeader>
          <FxPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
};
