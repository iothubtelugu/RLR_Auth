'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeId = 'light' | 'dark' | 'cyberpunk' | 'industrial' | 'space';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  category: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  cardColor: string;
  badgeLabel: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  light: {
    id: 'light',
    name: 'RLR Classic Light',
    description: 'Clean university daylight laboratory aesthetic with navy and cyan accents.',
    category: 'light',
    primaryColor: '#073B8C',
    accentColor: '#00A9E8',
    bgColor: '#F4FBFF',
    cardColor: '#FFFFFF',
    badgeLabel: 'Default Light',
  },
  dark: {
    id: 'dark',
    name: 'Night Ops (Dark)',
    description: 'Deep midnight navy palette designed for low-light lab environments.',
    category: 'dark',
    primaryColor: '#1677C8',
    accentColor: '#38BDF8',
    bgColor: '#0A0F1D',
    cardColor: '#131B2E',
    badgeLabel: 'Popular',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Matrix',
    description: 'High-contrast black with neon cyan and glowing matrix telemetry.',
    category: 'dark',
    primaryColor: '#00E5FF',
    accentColor: '#10B981',
    bgColor: '#05080E',
    cardColor: '#0C141F',
    badgeLabel: 'High Tech',
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial Robotics',
    description: 'Graphite carbon fiber styling with heavy industrial machinery amber.',
    category: 'dark',
    primaryColor: '#F59E0B',
    accentColor: '#FBBF24',
    bgColor: '#121214',
    cardColor: '#1A1A1E',
    badgeLabel: 'KUKA Style',
  },
  space: {
    id: 'space',
    name: 'Deep Space AI',
    description: 'Cosmic violet and electric magenta for autonomous robotics research.',
    category: 'dark',
    primaryColor: '#8B5CF6',
    accentColor: '#00E5FF',
    bgColor: '#0B0818',
    cardColor: '#15102A',
    badgeLabel: 'Autonomous AI',
  },
};

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  isDark: boolean;
  themesList: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  isDark: false,
  themesList: Object.values(THEMES),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read stored theme from localStorage or document attribute
    const stored = (localStorage.getItem('rlr_theme') as ThemeId) || 'light';
    if (THEMES[stored]) {
      setThemeState(stored);
      applyThemeToDom(stored);
    } else {
      applyThemeToDom('light');
    }
    setMounted(true);
  }, []);

  const applyThemeToDom = (newTheme: ThemeId) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', newTheme === 'light' ? 'light' : 'dark');
    }
  };

  const setTheme = (newTheme: ThemeId) => {
    if (!THEMES[newTheme]) return;
    setThemeState(newTheme);
    applyThemeToDom(newTheme);
    try {
      localStorage.setItem('rlr_theme', newTheme);
    } catch {}
  };

  const isDark = theme !== 'light';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
        themesList: Object.values(THEMES),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
