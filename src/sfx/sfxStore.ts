import { create } from 'zustand';

type PieceKey = 'pawn'|'knight'|'bishop'|'rook'|'queen'|'king';

export interface SfxState {
  master: number;    // 0..1
  moves: Record<PieceKey, number>;  // per-piece volume 0..1
  capture: number;
  castle: number;
  enPassant: number;
  promote: number;
  check: number;

  setMaster: (v: number) => void;
  setMoveVol: (k: PieceKey, v: number) => void;
  setOne: (key: keyof Omit<SfxState, 'moves'|'setMaster'|'setMoveVol'|'setOne'| 'load' | 'save'>, v: number) => void;
  load: () => void;
  save: () => void;
}

const key = 'chess-sfx';

const defaults: Omit<SfxState, 'setMaster'|'setMoveVol'|'setOne'|'load'|'save'> = {
  master: 0.8,
  moves: { pawn:0.7, knight:0.7, bishop:0.7, rook:0.7, queen:0.7, king:0.7 },
  capture: 0.9,
  castle: 0.9,
  enPassant: 0.9,
  promote: 1.0,
  check: 0.9,
};

export const useSfxStore = create<SfxState>((set, get) => ({
  ...defaults,

  setMaster: (v) => set({ master: clamp(v) }),
  setMoveVol: (k, v) => set({ moves: { ...get().moves, [k]: clamp(v) } }),
  setOne: (k, v) => set({ [k]: clamp(v) } as any),

  load: () => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      set({ ...get(), ...parsed });
    } catch {}
  },

  save: () => {
    try {
      const { master, moves, capture, castle, enPassant, promote, check } = get();
      localStorage.setItem(key, JSON.stringify({ master, moves, capture, castle, enPassant, promote, check }));
    } catch {}
  },
}));

function clamp(v: number) { return Math.max(0, Math.min(1, v)); }
