'use client';
import { createTheme, ThemeProvider, CssBaseline, PaletteMode, IconButton, Tooltip, Box } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

export default function MuiThemeProvider({ children }: { children: React.ReactNode }) {
    // Use a fixed initial mode for SSR to avoid mismatch; hydrate actual stored mode after mount.
    // Keep a deterministic initial render (light) for server + first client pass.
    const [mode, setMode] = useState<PaletteMode>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem('mui-mode');
            if (stored === 'dark' || stored === 'light') {
                setMode(stored);
            } else {
                // Fallback to user preference if not stored.
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) setMode('dark');
            }
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
    if (!mounted) return null; // Prevent hydration mismatch.
    const nextMode = mode === 'light' ? 'dark' : 'light';
    const label = `Switch to ${nextMode} mode`;
    return (
        <Box sx={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }}>
            <Tooltip title={label} arrow>
                <IconButton
                    size="small"
                    onClick={() => setMode(nextMode)}
                    aria-label={label}
                    sx={{
                        bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.100' : 'grey.800',
                        transition: 'background-color .25s, transform .2s',
                        '&:hover': { bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.200' : 'grey.700' },
                        boxShadow: 1,
                    }}
                >
                    {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                </IconButton>
            </Tooltip>
        </Box>
    );
}
