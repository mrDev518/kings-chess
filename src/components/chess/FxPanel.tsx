import React, { useEffect } from 'react';
import { useSfxStore } from '@/sfx/sfxStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Slider: React.FC<{ value: number; onChange: (v: number) => void; label: string }> = ({ value, onChange, label }) => (
  <div className="flex items-center gap-3">
    <div className="w-32 text-xs text-muted-foreground">{label}</div>
    <input
      type="range"
      min={0} max={1} step={0.01}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1"
    />
    <div className="w-10 text-right text-xs tabular-nums">{Math.round(value * 100)}</div>
  </div>
);

export const FxPanel: React.FC = () => {
  const st = useSfxStore();

  useEffect(() => { st.load(); }, []);      // load persisted volumes
  useEffect(() => { st.save(); });          // persist on any change

  return (
    <Card className="p-4 space-y-3 w-[340px]">
      <div className="text-sm font-medium mb-1">Sound FX</div>

      <Slider label="Master" value={st.master} onChange={st.setMaster} />

      <div className="text-xs mt-2">Piece Move Volumes</div>
      <Slider label="Pawn"   value={st.moves.pawn}   onChange={(v)=>st.setMoveVol('pawn', v)} />
      <Slider label="Knight" value={st.moves.knight} onChange={(v)=>st.setMoveVol('knight', v)} />
      <Slider label="Bishop" value={st.moves.bishop} onChange={(v)=>st.setMoveVol('bishop', v)} />
      <Slider label="Rook"   value={st.moves.rook}   onChange={(v)=>st.setMoveVol('rook', v)} />
      <Slider label="Queen"  value={st.moves.queen}  onChange={(v)=>st.setMoveVol('queen', v)} />
      <Slider label="King"   value={st.moves.king}   onChange={(v)=>st.setMoveVol('king', v)} />

      <div className="text-xs mt-2">Events</div>
      <Slider label="Capture"    value={st.capture}   onChange={(v)=>st.setOne('capture', v)} />
      <Slider label="Castle"     value={st.castle}    onChange={(v)=>st.setOne('castle', v)} />
      <Slider label="En Passant" value={st.enPassant} onChange={(v)=>st.setOne('enPassant', v)} />
      <Slider label="Promote"    value={st.promote}   onChange={(v)=>st.setOne('promote', v)} />
      <Slider label="Check"      value={st.check}     onChange={(v)=>st.setOne('check', v)} />

      <div className="pt-2 flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => { st.load(); st.save(); }}>
          Save
        </Button>
      </div>
    </Card>
  );
};
