"use client";
import Link from 'next/link';
import { Drawer, List, ListItemButton, ListItemText, ListItemIcon, Toolbar, AppBar, Typography, Box, IconButton, useMediaQuery, Divider, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import BrandIcon from '../../components/BrandIcon';
import PeopleIcon from '@mui/icons-material/People';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import './dashboard.css';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { usePathname } from 'next/navigation';

const navItems: { href: string; label: string; icon: React.ElementType }[] = [
    { href: '/customers', label: 'Customers', icon: PeopleIcon },
    { href: '/products', label: 'Products', icon: Inventory2Icon },
    { href: '/orders', label: 'Orders', icon: ReceiptLongIcon },
    { href: '/bookings', label: 'Bookings', icon: EventAvailableIcon },
    { href: '/ai-report', label: 'AI Report', icon: SmartToyIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const toggleMobile = () => setMobileOpen(o => !o);
    const [collapsed, setCollapsed] = useState(false);
    const toggleCollapsed = () => setCollapsed(c => !c);
    const pathname = usePathname();

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar />
            <List
                sx={(t) => ({
                    px: collapsed ? 0.5 : 1,
                    '& .MuiListItemButton-root': {
                        borderRadius: 8,
                        marginBottom: t.spacing(0.5),
                        transition: 'background-color .25s, color .25s, box-shadow .25s, padding .25s',
                        paddingLeft: collapsed ? t.spacing(1) : t.spacing(1.2),
                        paddingRight: collapsed ? t.spacing(1) : t.spacing(1.2),
                        justifyContent: collapsed ? 'center' : 'flex-start',
                    },
                    '& .Mui-selected': {
                        background: t.palette.mode === 'light' ? 'linear-gradient(90deg, #ffffff, #f3f6fa)' : 'linear-gradient(90deg,#2a2a2a,#333)',
                        boxShadow: t.palette.mode === 'light' ? '0 2px 6px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.6)',
                    },
                    '& .Mui-selected .MuiListItemIcon-root': {
                        color: t.palette.primary.main,
                    },
                    '& .MuiListItemButton-root:hover': {
                        backgroundColor: t.palette.action.hover,
                    },
                    '& .MuiListItemText-root': {
                        opacity: collapsed ? 0 : 1,
                        transform: collapsed ? 'translateX(-4px)' : 'translateX(0)',
                        transition: 'opacity .18s ease, transform .25s ease',
                        width: collapsed ? 0 : 'auto',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        pointerEvents: collapsed ? 'none' : 'auto',
                    },
                })}
            >
                {navItems.map(item => {
                    const Icon = item.icon;
                    const selected = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <ListItemButton
                            key={item.href}
                            component={Link}
                            href={item.href}
                            selected={selected}
                            aria-current={selected ? 'page' : undefined}
                            onClick={() => { if (!isMdUp) setMobileOpen(false); }}
                        >
                            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit' }}><Icon fontSize="small" /></ListItemIcon>
                            <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: selected ? 600 : 500 }} />
                        </ListItemButton>
                    );
                })}
            </List>
            <Box sx={{ mt: 'auto', p: collapsed ? 1 : 2 }}>
                <Divider sx={{ mb: 1, opacity: collapsed ? 0 : 1, transition: 'opacity .25s' }} />
                {!collapsed && <Typography variant="caption" color="text.secondary">v1.0 • Dashboard</Typography>}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: (t) => t.palette.mode === 'light' ? '#f5f7fa' : '#1c1c1c' }}>
            <AppBar
                position="fixed"
                elevation={0}
                sx={(t) => ({
                    backdropFilter: 'blur(8px)',
                    backgroundColor: t.palette.mode === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(24,24,24,0.85)',
                    borderBottom: `1px solid ${t.palette.divider}`,
                    zIndex: t.zIndex.drawer + 1,
                })}
            >
                <Toolbar>
                    {!isMdUp && (
                        <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleMobile} sx={{ mr: 1 }}>
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Box
                        component={Link}
                        href="/"
                        aria-label="Go to Report Copilot home"
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1,
                            textDecoration: 'none', color: 'inherit',
                            cursor: 'pointer',
                            '&:hover .brand-text': { textDecoration: 'none' }
                        }}
                    >
                        <BrandIcon fontSize="small" sx={{ width: 32, height: 32 }} />
                        <Typography className="brand-text" variant="h6" sx={{ fontWeight: 600 }}>Report Copilot</Typography>
                    </Box>
                    {isMdUp && (
                        <Tooltip title={collapsed ? 'Expand menu' : 'Collapse menu'} arrow>
                            <IconButton
                                size="small"
                                onClick={toggleCollapsed}
                                aria-label={collapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
                            >
                                {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                            </IconButton>
                        </Tooltip>
                    )}
                </Toolbar>
            </AppBar>
            {/* Permanent drawer for md+ */}
            {isMdUp && (
                <Drawer
                    variant="permanent"
                    open
                    sx={{
                        width: collapsed ? 72 : 230,
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: {
                            width: collapsed ? 72 : 230,
                            boxSizing: 'border-box',
                            background: (t) => t.palette.mode === 'light'
                                ? 'linear-gradient(180deg,#ffffff,#f3f6fa)'
                                : 'linear-gradient(180deg,#202020,#272727)',
                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                            transition: 'width .25s ease',
                            overflowX: 'hidden',
                        }
                    }}
                >
                    {drawerContent}
                </Drawer>
            )}
            {/* Temporary drawer for mobile */}
            {!isMdUp && (
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={toggleMobile}
                    ModalProps={{ keepMounted: true }}
                    sx={{ [`& .MuiDrawer-paper`]: { width: 220, background: (t) => t.palette.mode === 'light' ? '#ffffff' : '#202020' } }}
                >
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
