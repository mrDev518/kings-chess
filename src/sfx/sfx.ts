import { useSfxStore } from './sfxStore';

const PATHS = {
  move: {
    pawn:   '/sfx/pawnMove.mp3',
    knight: '/sfx/knightMove.mp3',
    bishop: '/sfx/bishopMove.mp3',
    rook:   '/sfx/rookMove.mp3',
    queen:  '/sfx/queenMove.mp3',
    king:   '/sfx/kingMove.mp3',
  },
  capture:   '/sfx/swordClank.mp3',
  castle:    '/sfx/castleRumble.mp3',
  enPassant: '/sfx/enPassantFly.mp3',
  promote:   '/sfx/vuvuzela.mp3',
  check:     '/sfx/gasp.mp3',
  illegal:   '/sfx/whistle.mp3',   
};

const cache = new Map<string, HTMLAudioElement>();
let warned = new Set<string>();

function getAudio(url: string): HTMLAudioElement | null {
  if (cache.has(url)) return cache.get(url)!;
  try {
    const a = new Audio(url);
    a.preload = 'auto';
    cache.set(url, a);
    return a;
  } catch (e) {
    if (!warned.has(url)) {
      console.warn('[SFX] failed to create audio for', url, e);
      warned.add(url);
    }
    return null;
  }
}

function play(url: string, vol: number) {
  const a = getAudio(url);
  if (!a) return;
  try {
    a.currentTime = 0;
    a.volume = vol;
    a.play().catch(() => {});
  } catch {}
}

export const sfx = {
  move(pieceType: string) {
    const st = useSfxStore.getState();
    const key = mapPiece(pieceType);
    play(PATHS.move[key], st.master * st.moves[key]);
  },
  capture()   { const s = useSfxStore.getState(); play(PATHS.capture,   s.master * s.capture); },
  castle()    { const s = useSfxStore.getState(); play(PATHS.castle,    s.master * s.castle); },
  enPassant() { const s = useSfxStore.getState(); play(PATHS.enPassant, s.master * s.enPassant); },
  promote()   { const s = useSfxStore.getState(); play(PATHS.promote,   s.master * s.promote); },
  check()     { const s = useSfxStore.getState(); play(PATHS.check,     s.master * s.check); },
  illegal()   { const s = useSfxStore.getState(); play(PATHS.illegal,   s.master * 1.0); }, 
};

function mapPiece(t: string) {
  switch (t) {
    case 'p': return 'pawn';
    case 'n': return 'knight';
    case 'b': return 'bishop';
    case 'r': return 'rook';
    case 'q': return 'queen';
    case 'k': return 'king';
    default:  return 'pawn';
  }
}
