import React, { useEffect, useState } from 'react';
import { useChessStore } from '@/store/chessStore';
import { HelpCircle } from 'lucide-react';

/**
 * Renders a floating "?" button when an illegal move occurs.
 * - Hover shows the reason.
 * - Fades out when store clears the hint (on next successful move).
 */
export const IllegalMoveHint: React.FC = () => {
  const { illegalHint } = useChessStore();
  const [show, setShow] = useState(false);

  // Mirror store.visible into a local "fade" flag
  useEffect(() => {
    setShow(illegalHint.visible);
  }, [illegalHint.visible, illegalHint.seq]);

  if (!illegalHint.message && !show) return null;

  return (
    <div className="pointer-events-none absolute top-3 right-3 z-20">
      <div
        className={`
          group relative pointer-events-auto
          transition-opacity duration-300
          ${show ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <button
          className="h-8 w-8 rounded-full bg-yellow-500 text-black shadow
                     flex items-center justify-center"
          title="Illegal move"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Tooltip bubble */}
        <div
          className="
            absolute right-0 mt-2 w-56 rounded-md bg-black text-white text-xs p-2 shadow-lg
            opacity-0 group-hover:opacity-100 transition-opacity duration-200
          "
        >
          {illegalHint.message}
        </div>
      </div>
    </div>
  );
};
