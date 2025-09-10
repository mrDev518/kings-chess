
export type ThemeName = 'Alpha' | 'Neo' | 'Solid';

export interface ThemeSpec {
  name: ThemeName;
  cssClass: string; // maps to a class on <body> to flip CSS variables
  boardStyle: 'wood' | 'neo' | 'solid';
  pieceStyle: 'alpha' | 'neo' | 'solid';
}

export const THEMES: Record<ThemeName, ThemeSpec> = {
  Alpha: {
    name: 'Alpha',
    cssClass: 'theme-alpha',
    boardStyle: 'wood',
    pieceStyle: 'alpha',
  },
  Neo: {
    name: 'Neo',
    cssClass: 'theme-neo',
    boardStyle: 'neo',
    pieceStyle: 'neo',
  },
  Solid: {
    name: 'Solid',
    cssClass: 'theme-solid',
    boardStyle: 'solid',
    pieceStyle: 'solid',
  },
};
