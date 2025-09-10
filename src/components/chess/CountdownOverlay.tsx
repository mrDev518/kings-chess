
import React, { useEffect, useState } from 'react';
import { SFX } from '../../sfx/sfxstore';

type Props = { onDone: () => void; };

const CountdownOverlay: React.FC<Props> = ({ onDone }) => {
  const [value, setValue] = useState<number>(3);
  const [show, setShow] = useState(true);

  useEffect(() => {
    SFX.play('startBeep');
    const id = setInterval(() => {
      setValue((v) => {
        const next = v - 1;
        if (next > 0) SFX.play('startBeep');
        if (next === 0) {
          SFX.play('startGo');
          setTimeout(() => {
            setShow(false);
            onDone();
          }, 400);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onDone]);

  if (!show) return null;

  return (
    <div className="countdown">
      <div>{value > 0 ? value : 'Match Start'}</div>
    </div>
  );
};

  export default CountdownOverlay;
