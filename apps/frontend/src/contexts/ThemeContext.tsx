import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    actualTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme') as Theme;
        return stored || 'dark'; // Default to dark theme
    });

    const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        const updateActualTheme = () => {
            if (theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                setActualTheme(systemTheme);
            } else {
                setActualTheme(theme);
            }
        };

        updateActualTheme();

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', updateActualTheme);
            return () => mediaQuery.removeEventListener('change', updateActualTheme);
        }
    }, [theme]);

    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;

        // Apply theme classes to both html and body
        if (actualTheme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
            body.classList.add('dark');
            body.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
            body.classList.add('light');
            body.classList.remove('dark');
        }

        // Set color-scheme for better browser integration
        root.style.colorScheme = actualTheme;
    }, [actualTheme]);

    const handleSetTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, actualTheme, setTheme: handleSetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};