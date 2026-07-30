import React, { createContext, useContext } from 'react';
import { lightTheme, type Theme } from './theme';

const ThemeContext = createContext<Theme>(lightTheme);

/**
 * Supplies the active theme. The app defaults to light mode regardless of the
 * OS color scheme. (The dark theme remains available for future opt-in.)
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={lightTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
