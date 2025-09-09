// Stockfish REST client (robust parsing) + helpers
type EvalResult = { cp: number | null; mate: number | null };

type StockfishClient = {
  setRating: (elo: number) => Promise<void>;
  getBestMove: (fen: string, movetimeMs?: number) => Promise<string | null>;
  getEvaluation: (fen: string) => Promise<EvalResult>;
  terminate: () => void;
};

const USER_API = (import.meta as any).env?.VITE_STOCKFISH_API?.trim() || '';
const BASES: string[] = [
  USER_API,
  'https://stockfish.online/api/s/v2.php',
  'https://r.jina.ai/http://stockfish.online/api/s/v2.php',
].filter(Boolean);

let _elo = 1350;
let _depth = 12;

const eloToDepth = (elo: number) => {
  const e = Math.max(200, Math.min(3000, Math.round(elo)));
  return Math.max(2, Math.min(20, Math.round(2 + (e - 200) * 18 / (3000 - 200))));
};

function withTimeout<T>(p: Promise<T>, ms = 7000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

async function tryFetch(url: string): Promise<Response> {
  return withTimeout(fetch(url, { method: 'GET', cache: 'no-store' }), 9000);
}

function parseJSON(text: string): any | null {
  try { return JSON.parse(text); } catch { return null; }
}

// Extract bestmove from UCI-ish text or JSON
function extractBestMove(text: string): string | null {
  const data = parseJSON(text);
  if (data && typeof data.bestmove === 'string') {
    const raw = data.bestmove.trim();
    const parts = raw.split(/\s+/);
    const i = parts.indexOf('bestmove');
    if (i >= 0 && parts[i + 1]) return parts[i + 1];
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(parts[0])) return parts[0];
  }
  const m = text.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);
  if (m) return m[1];
  const m2 = text.match(/\b([a-h][1-8][a-h][1-8][qrbn]?)\b/);
  return m2 ? m2[1] : null;
}

// Extract evaluation from various field names & shapes.
// Normalizes to: cp (centipawns, White POV), mate (plies, positive = White mates)
function extractEval(text: string): EvalResult {
  const data = parseJSON(text);
  if (!data) return { cp: null, mate: null };

  // Common keys (pawns): evaluation, eval, score, value
  const pawns =
    typeof data.evaluation === 'number' ? data.evaluation :
    typeof data.eval === 'number' ? data.eval :
    typeof data.score === 'number' ? data.score :
    typeof data.value === 'number' ? data.value :
    null;

  // cp direct
  const cp =
    typeof data.cp === 'number' ? data.cp :
    typeof data.centipawns === 'number' ? data.centipawns :
    typeof pawns === 'number' ? Math.round(pawns * 100) :
    null;

  // mate
  const mate =
    data.mate === 0 ? 0 :
    (data.mate == null ? null : Number(data.mate));

  return { cp: Number.isFinite(cp) ? cp : null, mate: Number.isFinite(mate as number) ? (mate as number) : null };
}

async function fetchAnalysisFromAny(fen: string, depth: number): Promise<{ best: string | null; cp: number | null; mate: number | null }> {
  // try with depth; some endpoints ignore it, that's fine
  for (const base of BASES) {
    const url = `${base}?fen=${encodeURIComponent(fen)}&depth=${depth}`;
    try {
      const resp = await tryFetch(url);
      const text = await resp.text();
      const best = extractBestMove(text);
      const { cp, mate } = extractEval(text);
      return { best, cp, mate };
    } catch { /* try next */ }
  }
  return { best: null, cp: null, mate: null };
}

export const useStockfish = (): StockfishClient => ({
  async setRating(elo: number) {
    _elo = Math.max(200, Math.min(3000, Math.round(elo)));
    _depth = eloToDepth(_elo);
  },

  async getBestMove(fen: string, _movetimeMs?: number) {
    let { best } = await fetchAnalysisFromAny(fen, _depth);
    if (best) return best;

    // probe a couple other depths
    const probes = new Set<number>([
      Math.max(2, _depth - 2),
      Math.min(20, _depth + 2),
      Math.max(2, _depth - 4),
      Math.min(20, _depth + 4),
    ]);
    for (const d of probes) {
      ({ best } = await fetchAnalysisFromAny(fen, d));
      if (best) return best;
    }
    return null;
  },

  async getEvaluation(fen: string) {
    const { cp, mate } = await fetchAnalysisFromAny(fen, _depth);
    return { cp, mate };
  },

  terminate() {},
});
