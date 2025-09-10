
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { THEMES, ThemeName, ThemeSpec } from './themes';

type ThemeContextType = {
  theme: ThemeSpec;
  setThemeByName: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

const DEFAULT_THEME: ThemeSpec = THEMES.Alpha;

export const ThemeProvider: React.FC<{ initial?: ThemeName; children: React.ReactNode }> = ({
  initial = 'Alpha',
  children,
}) => {
  const [themeName, setThemeName] = useState<ThemeName>(initial);

  const theme = useMemo(() => THEMES[themeName], [themeName]);

  // apply CSS class to <body> so CSS variables update instantly
  useEffect(() => {
    const body = document.body;
    // remove previous theme classes
    body.classList.remove('theme-alpha', 'theme-neo', 'theme-solid');
    // add current
    body.classList.add(theme.cssClass);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setThemeByName: (name: ThemeName) => setThemeName(name),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
