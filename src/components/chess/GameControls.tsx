
import React, { useMemo, useState } from 'react';
import { ThemeName } from '../../../theme/themes';
import { useTheme } from '../../../theme/ThemeContext';
import Modal from '../common/Modal';
import { SFX } from '../../sfx/sfxstore';

type Props = {
  onApplyStartingSide: (side: 'w' | 'b') => void;
  onStart: () => void;
  onClockToggle: (on: boolean) => void;
  onClockMinutesChange: (m: number) => void;
  clockEnabled: boolean;
  clockMinutes: number;
};

const GameControls: React.FC<Props> = ({
  onApplyStartingSide,
  onStart,
  onClockToggle,
  onClockMinutesChange,
  clockEnabled,
  clockMinutes
}) => {
  const { theme, setThemeByName } = useTheme();
  const [pendingTheme, setPendingTheme] = useState<ThemeName>(theme.name);
  const themeNames: ThemeName[] = useMemo(() => ['Alpha', 'Neo', 'Solid'], []);
  const [fxOpen, setFxOpen] = useState(false);
  const [volume, setVolume] = useState<number>(SFX.volume);

  const applyTheme = () => {
    setThemeByName(pendingTheme);
    SFX.play('applyTheme');
  };

  const applySide = (side: 'w' | 'b') => {
    onApplyStartingSide(side);
    SFX.play('applySide');
  };

  const openFX = () => {
    setFxOpen(true);
    SFX.play('fxOpen');
  };

  return (
    <div className="controls">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>Theme:</label>
        <select
          value={pendingTheme}
          onChange={(e) => setPendingTheme(e.target.value as ThemeName)}
        >
          {themeNames.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="button" onClick={applyTheme}>Apply Theme</button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>Starting Side:</label>
        <button className="button" onClick={() => applySide('w')}>White</button>
        <button className="button" onClick={() => applySide('b')}>Black</button>
      </div>

      <button className="button primary" onClick={() => { SFX.play('uiClick'); onStart(); }}>
        Start Match
      </button>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>Clock:</label>
        <button className="button" onClick={() => onClockToggle(!clockEnabled)}>
          {clockEnabled ? 'On' : 'Off'}
        </button>
        <select
          value={String(clockMinutes)}
          onChange={(e) => onClockMinutesChange(parseInt(e.target.value, 10))}
          disabled={!clockEnabled}
        >
          <option value="3">3 min</option>
          <option value="10">10 min</option>
        </select>
      </div>

      <button className="button" onClick={openFX}>
        FX
      </button>

      <Modal open={fxOpen} onClose={() => setFxOpen(false)} title="Sound FX">
        <div style={{ display: 'grid', gap: 10 }}>
          <label>
            <span style={{ marginRight: 10 }}>Enable</span>
            <input
              type="checkbox"
              checked={SFX.enabled}
              onChange={(e) => (SFX.enabled = e.target.checked)}
            />
          </label>
          <label>
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                SFX.volume = v;
              }}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default GameControls;
