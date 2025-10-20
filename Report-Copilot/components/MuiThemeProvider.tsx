'use client';
import { createTheme, ThemeProvider, CssBaseline, PaletteMode } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

export default function MuiThemeProvider({ children }: { children: React.ReactNode }) {
    // Use a fixed initial mode for SSR to avoid mismatch; hydrate actual stored mode after mount.
    const [mode, setMode] = useState<PaletteMode>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem('mui-mode') : null;
        if (stored === 'dark' || stored === 'light') {
            setMode(stored);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;
        window.localStorage.setItem('mui-mode', mode);
        document.body.dataset.mode = mode;
    }, [mode, mounted]);

    const theme = useMemo(() => createTheme({
        palette: { mode, primary: { main: '#2563eb' }, secondary: { main: '#9333ea' } },
        shape: { borderRadius: 10 },
        typography: { fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' },
        components: {
            MuiButton: { styleOverrides: { root: { textTransform: 'none' } } },
            MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
        },
    }), [mode]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ModeToggle mode={mode} setMode={setMode} mounted={mounted} />
            {children}
        </ThemeProvider>
    );
}

function ModeToggle({ mode, setMode, mounted }: { mode: PaletteMode; setMode: (m: PaletteMode) => void; mounted: boolean }) {
    // Render a stable placeholder before hydration to prevent mismatches.
    const label = mode === 'light' ? 'Dark mode' : 'Light mode';
    return (
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }} suppressHydrationWarning>
            <button
                disabled={!mounted}
                onClick={() => mounted && setMode(mode === 'light' ? 'dark' : 'light')}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid', background: 'var(--background)', color: 'var(--foreground)', cursor: mounted ? 'pointer' : 'default', opacity: mounted ? 1 : 0.6 }}
            >
                {label}
            </button>
        </div>
    );
}
