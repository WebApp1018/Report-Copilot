"use client";
import Link from 'next/link';
import { Drawer, List, ListItemButton, ListItemText, Toolbar, AppBar, Typography, Box, IconButton, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import './dashboard.css';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';

const navItems: { href: string; label: string }[] = [
    { href: '/customers', label: 'Customers' },
    { href: '/products', label: 'Products' },
    { href: '/orders', label: 'Orders' },
    { href: '/bookings', label: 'Bookings' },
    { href: '/ai-report', label: 'AI Report' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const toggleMobile = () => setMobileOpen(o => !o);

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar />
            <List>
                {navItems.map(item => (
                    <ListItemButton key={item.href} component={Link} href={item.href} onClick={() => { if (!isMdUp) setMobileOpen(false); }}>
                        <ListItemText primary={item.label} />
                    </ListItemButton>
                ))}
            </List>
            <Box sx={{ mt: 'auto', p: 2 }}>
                <Typography variant="caption" color="text.secondary">v1.0</Typography>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AppBar position="fixed" color="default" elevation={1} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    {!isMdUp && (
                        <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleMobile} sx={{ mr: 1 }}>
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>Report Copilot</Typography>
                </Toolbar>
            </AppBar>
            {/* Permanent drawer for md+ */}
            {isMdUp && (
                <Drawer variant="permanent" open sx={{ width: 220, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: 220, boxSizing: 'border-box' } }}>
                    {drawerContent}
                </Drawer>
            )}
            {/* Temporary drawer for mobile */}
            {!isMdUp && (
                <Drawer variant="temporary" open={mobileOpen} onClose={toggleMobile} ModalProps={{ keepMounted: true }} sx={{ [`& .MuiDrawer-paper`]: { width: 220 } }}>
                    {drawerContent}
                </Drawer>
            )}
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
}
