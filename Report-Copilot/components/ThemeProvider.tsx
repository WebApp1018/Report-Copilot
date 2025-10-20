'use client';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem('rc-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        window.localStorage.setItem('rc-theme', theme);
    }, [theme]);

    return (
        <div>
            <ThemeToggle theme={theme} setTheme={setTheme} />
            {children}
        </div>
    );
}

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
    return (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
            <button
                type="button"
                className="btn btn-xs"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                aria-label="Toggle dark mode"
            >
                {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
        </div>
    );
}
