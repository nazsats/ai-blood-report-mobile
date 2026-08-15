// constants/theme.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
    mode: ThemeMode;
    isDark: boolean;
    toggleTheme: () => void;
}

// Light by default. A dark medical app reads as clinical and slightly ominous,
// and the people opening this one are often already anxious about the result.
// Dark is still available via the toggle for anyone who prefers it.
const ThemeContext = createContext<ThemeContextType>({
    mode: 'light',
    isDark: false,
    toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>('light');

    useEffect(() => {
        AsyncStorage.getItem('themeMode').then(saved => {
            if (saved === 'light' || saved === 'dark') setMode(saved);
        });
    }, []);

    const toggleTheme = () => {
        const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
        setMode(next);
        AsyncStorage.setItem('themeMode', next);
    };

    return (
        <ThemeContext.Provider value={{ mode, isDark: mode === 'dark', toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
