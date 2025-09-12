import React from 'react';
import { useChessStore } from '@/store/chessStore';

export default function ThemePreview() {
  const {
    pieceTheme, themeDefs, toggleThemePreview, setPieceTheme,
    pieceSize, setPieceSize
  } = useChessStore();

  const [tempTheme, setTempTheme] = React.useState(pieceTheme);
  const [tempSize, setTempSize] = React.useState(pieceSize);

  const t = themeDefs[tempTheme];

  const squares = React.useMemo(() => {
    const arr: { i:number; isLight:boolean }[] = [];
    for (let i=0;i<16;i++) arr.push({ i, isLight: ((i%4)+(i/4|0))%2===0 });
    return arr;
  },[]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 w-[420px]">
        <h3 className="text-lg font-semibold mb-3">Theme Preview</h3>

        <div className="flex gap-2 mb-3">
          {(['classic','line','neo'] as const).map(k => (
            <button
              key={k}
              onClick={() => setTempTheme(k)}
              className={`px-3 py-1 rounded-full border ${tempTheme===k?'border-blue-500':'border-gray-300'}`}
            >
              {themeDefs[k].name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 grid-rows-4 rounded-md overflow-hidden ring-1 ring-black/10 mb-3">
          {squares.map(sq => (
            <div key={sq.i} style={{
              aspectRatio:'1',
              background: sq.isLight ? t.board.light : t.board.dark,
              position:'relative'
            }}>
              {/* sample overlay */}
              {sq.i===5 && <div style={{
                position:'absolute', inset:4, border:`3px solid ${t.highlight.move}`, borderRadius:6
              }}/>}
              {/* sample piece */}
              {sq.i===10 && (
                <img
                  src={`${t.pieceAssetBase}/wN.png`} alt=""
                  style={{ width:'70%', position:'absolute', inset:'0', margin:'auto' }}
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['small','medium','large'] as const).map(s => (
              <button
                key={s}
                onClick={() => setTempSize(s)}
                className={`px-2 py-1 rounded-full border ${tempSize===s?'border-blue-500':'border-gray-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => toggleThemePreview(false)} className="px-3 py-1 rounded-md border">Cancel</button>
            <button
              onClick={() => { setPieceTheme(tempTheme); setPieceSize(tempSize); toggleThemePreview(false); }}
              className="px-3 py-1 rounded-md bg-blue-600 text-white"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
