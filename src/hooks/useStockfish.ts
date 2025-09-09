// Simple bot hook - can be enhanced with actual Stockfish later
export const useStockfish = () => {
  return {
    isReady: true,
    getBestMove: async () => null, // Fallback to random moves
    terminate: () => {}
  };
};