
/**
 * Central audio manager for all game sounds.
 * All files are placeholders you can replace later.
 * Put your audio files under /public/sfx or /src/assets/sfx and update paths below.
 */
export type SoundKey =
  | 'uiClick'
  | 'applyTheme'
  | 'applySide'
  | 'startBeep'
  | 'startGo'
  | 'movePawn'
  | 'moveKnight'
  | 'moveBishop'
  | 'moveRook'
  | 'moveQueen'
  | 'moveKing'
  | 'fxOpen';

type SoundsMap = Record<SoundKey, HTMLAudioElement>;

class AudioManager {
  private sounds: Partial<SoundsMap> = {};
  private _volume = 0.6;
  private _enabled = true;

  constructor() {
    // Default placeholders (safe to 404; will be caught).
    this.register('uiClick', '/sfx/uiClick.mp3');
    this.register('applyTheme', '/sfx/applyTheme.mp3');
    this.register('applySide', '/sfx/applySide.mp3');
    this.register('startBeep', '/sfx/startBeep.mp3');
    this.register('startGo', '/sfx/startGo.mp3');
    this.register('movePawn', '/sfx/pawnMove.mp3');
    this.register('moveKnight', '/sfx/knightMove.mp3');
    this.register('moveBishop', '/sfx/bishopMove.mp3');
    this.register('moveRook', '/sfx/rookMove.mp3');
    this.register('moveQueen', '/sfx/queenMove.mp3');
    this.register('moveKing', '/sfx/kingMove.mp3');
    this.register('fxOpen', '/sfx/fxOpen.mp3');
  }

  set enabled(v: boolean) { this._enabled = v; }
  get enabled() { return this._enabled; }

  set volume(v: number) {
    this._volume = Math.min(1, Math.max(0, v));
    for (const a of Object.values(this.sounds)) {
      if (a) a.volume = this._volume;
    }
  }
  get volume() { return this._volume; }

  register(key: SoundKey, url: string) {
    try {
      const a = new Audio(url);
      a.preload = 'auto';
      a.volume = this._volume;
      this.sounds[key] = a;
    } catch {
      // On SSR or older browsers, ignore.
    }
  }

  play(key: SoundKey) {
    if (!this._enabled) return;
    const a = this.sounds[key];
    try {
      a?.currentTime && (a.currentTime = 0);
      a?.play();
    } catch {
      // No-op if file missing or autoplay blocked.
    }
  }
}

export const SFX = new AudioManager();

// Helper to pick a piece-move sound by algebraic kind letter
export const playPieceMove = (pieceKind: string) => {
  switch (pieceKind) {
    case 'P': return SFX.play('movePawn');
    case 'N': return SFX.play('moveKnight');
    case 'B': return SFX.play('moveBishop');
    case 'R': return SFX.play('moveRook');
    case 'Q': return SFX.play('moveQueen');
    case 'K': return SFX.play('moveKing');
    default: return SFX.play('uiClick');
  }
};
