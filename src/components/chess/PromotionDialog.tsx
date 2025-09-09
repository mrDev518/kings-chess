import React from 'react';
import { useChessStore } from '@/store/chessStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const PROMO: Array<{ key: 'q'|'r'|'b'|'n'; label: string }> = [
  { key: 'q', label: 'Queen' },
  { key: 'r', label: 'Rook'  },
  { key: 'b', label: 'Bishop'},
  { key: 'n', label: 'Knight'},
];

export const PromotionDialog: React.FC = () => {
  const pending = useChessStore(s => s.pendingPromotion);
  const confirm = useChessStore(s => s.confirmPromotion);
  const cancel = useChessStore(s => s.cancelPromotion);

  const open = Boolean(pending);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose promotion</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PROMO.map(p => (
            <Button
              key={p.key}
              variant="secondary"
              className="h-16 text-base"
              onClick={() => confirm(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="mt-2 flex justify-end">
          <Button variant="ghost" onClick={() => cancel()}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
