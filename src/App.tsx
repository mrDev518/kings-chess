
import React from 'react';
import { ThemeProvider } from '../theme/ThemeContext';
import ChessGame from './components/chess/ChessGame';

const App: React.FC = () => {
  return (
    <ThemeProvider initial="Alpha">
      <div style={{ maxWidth: 720, margin: '16px auto', padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>Kings Chess</h2>
        <ChessGame />
      </div>
    </ThemeProvider>
  );
};

export default App;
