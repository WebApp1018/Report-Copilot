"use client";
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Paper,
  IconButton,
  GlobalStyles,
  useTheme,
  useMediaQuery
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import TimelineIcon from '@mui/icons-material/Timeline';
import CodeIcon from '@mui/icons-material/Code';
import SecurityIcon from '@mui/icons-material/Security';
import BrandIcon from '../components/BrandIcon';

interface FeatureCardProps { icon: React.ElementType; title: string; text: string; }
function FeatureCard({ icon: Icon, title, text }: FeatureCardProps) {
  const theme = useTheme();
  return (
    <Paper elevation={0} sx={{
      p: 3,
      borderRadius: 4,
      position: 'relative',
      backdropFilter: 'blur(12px)',
      background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.68)' : 'rgba(28,34,40,0.6)',
      border: `1px solid ${theme.palette.divider}`,
      display: 'flex', flexDirection: 'column', gap: 1.4,
      transition: 'border-color .35s, box-shadow .35s, transform .35s, background .35s',
      '&:hover': {
        transform: 'translateY(-8px)',
        borderColor: theme.palette.primary.main,
        boxShadow: theme.palette.mode === 'light'
          ? '0 14px 42px -12px rgba(50,70,120,0.35)'
          : '0 16px 46px -14px rgba(0,0,0,0.8)',
        background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(40,46,54,0.75)',
      }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: theme.palette.mode === 'light'
            ? 'linear-gradient(135deg,#314ec4,#7a35d1)'
            : 'linear-gradient(135deg,#6177d6,#9c7fff)',
          color: '#fff'
        }}>
          <Icon fontSize="small" />
        </Box>
        <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>{text}</Typography>
    </Paper>
  );
}

export default function Landing() {
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
  const [landingQuestion, setLandingQuestion] = useState('');

  // Animated placeholder logic
  const suggestions = [
    'Revenue by city this month',
    'Top customer this quarter',
    'Best selling products today',
    'Bookings total last week',
    'Customers who ordered 10+',
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pause' | 'deleting'>('typing');
  const [isFocused, setIsFocused] = useState(false);
  const TYPE_SPEED = 55;
  const DELETE_SPEED = 28;
  const PAUSE_MS = 1400;

  useEffect(() => {
    // Pause animation while user is actively typing (focused)
    if (isFocused) return;
    let timeout: any;
    const current = suggestions[placeholderIndex];
    if (phase === 'typing') {
      if (typedPlaceholder.length < current.length) {
        timeout = setTimeout(() => setTypedPlaceholder(current.slice(0, typedPlaceholder.length + 1)), TYPE_SPEED);
      } else {
        setPhase('pause');
      }
    } else if (phase === 'pause') {
      timeout = setTimeout(() => setPhase('deleting'), PAUSE_MS);
    } else if (phase === 'deleting') {
      if (typedPlaceholder.length > 0) {
        timeout = setTimeout(() => setTypedPlaceholder(current.slice(0, typedPlaceholder.length - 1)), DELETE_SPEED);
      } else {
        setPlaceholderIndex((placeholderIndex + 1) % suggestions.length);
        setPhase('typing');
      }
    }
    return () => clearTimeout(timeout);
  }, [typedPlaceholder, phase, placeholderIndex, isFocused]);

  function submitLandingQuestion() {
    const q = landingQuestion.trim();
    if (!q) return;
    window.location.href = `/dashboard/ai-report?q=${encodeURIComponent(q)}`;
  }

  const gradientBg = theme.palette.mode === 'light'
    ? 'linear-gradient(120deg,#ffffff 0%,#eef4ff 25%,#e9f0ff 55%,#f5f9ff 85%)'
    : 'linear-gradient(120deg,#121417 0%,#182029 35%,#1e2b36 65%,#223542 100%)';

  return (
    (
      <Box sx={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: gradientBg }}>
        <GlobalStyles styles={{
          '@keyframes hueShift': {
            '0%': { filter: 'hue-rotate(0deg)' },
            '50%': { filter: 'hue-rotate(25deg)' },
            '100%': { filter: 'hue-rotate(0deg)' }
          },
          '@keyframes fadeUp': {
            '0%': { opacity: 0, transform: 'translateY(12px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' }
          },
          '@keyframes caretBlink': {
            '0%,45%': { opacity: 1 },
            '50%,100%': { opacity: 0 }
          }
        }} />
        {/* Decorative overlay */}
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <Box sx={{ position: 'absolute', top: -180, left: -140, width: 460, height: 460, borderRadius: '50%', background: theme.palette.mode === 'light' ? 'radial-gradient(circle at center, rgba(120,150,255,0.35), rgba(120,150,255,0) 70%)' : 'radial-gradient(circle at center, rgba(120,150,255,0.25), rgba(120,150,255,0) 70%)', filter: 'blur(55px)', animation: 'hueShift 18s linear infinite' }} />
          <Box sx={{ position: 'absolute', bottom: -200, right: -160, width: 520, height: 520, borderRadius: '50%', background: theme.palette.mode === 'light' ? 'radial-gradient(circle at center, rgba(170,110,255,0.35), rgba(170,110,255,0) 70%)' : 'radial-gradient(circle at center, rgba(170,110,255,0.25), rgba(170,110,255,0) 70%)', filter: 'blur(65px)', animation: 'hueShift 22s linear infinite reverse' }} />
          <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.05) 1px,transparent 1px)', backgroundSize: '70px 70px,70px 70px', mixBlendMode: theme.palette.mode === 'light' ? 'normal' : 'overlay', opacity: 0.22 }} />
        </Box>
        {/* Header */}
        <AppBar position="static" elevation={0} sx={(t) => ({
          background: t.palette.mode === 'light' ? 'rgba(255,255,255,0.75)' : 'rgba(20,24,28,0.72)',
          backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${t.palette.divider}`
        })} style={{ zIndex: 2 }}>
          <Toolbar sx={{ maxWidth: 1280, mx: 'auto', width: '100%' }}>
            <Box component={Link} href="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.2, textDecoration: 'none', color: 'inherit' }}>
              <BrandIcon sx={{ width: 40, height: 40 }} />
              <Typography
                variant="h6"
                fontWeight={700}
                sx={(t) => ({
                  letterSpacing: .5,
                  background: t.palette.mode === 'light'
                    ? 'linear-gradient(90deg,#1e2a62,#4a3fa3,#6c2ad3)'
                    : 'linear-gradient(90deg,#cdd9ff,#e2d8ff,#f0e9ff)',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent'
                })}
              >
                Report Copilot
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            {!isSmDown && (
              <Stack direction="row" spacing={1}>
                <Button component={Link} href="/dashboard" size="small">Dashboard</Button>
                <Button component={Link} href="/dashboard/ai-report" size="small">AI Report</Button>
              </Stack>
            )}
            {isSmDown && (
              <IconButton size="small" aria-label="menu"><MenuIcon fontSize="small" /></IconButton>
            )}
          </Toolbar>
        </AppBar>
        {/* Main Content */}
        <Stack spacing={10} sx={{ p: { xs: 4, md: 8 }, maxWidth: 1280, mx: 'auto', position: 'relative', zIndex: 2 }}>
          {/* Hero */}
          <Stack spacing={3} sx={{ animation: 'fadeUp .65s ease', maxWidth: 920 }}>
            <Typography variant={isSmDown ? 'h4' : 'h3'} fontWeight={700} sx={{ lineHeight: 1.05 }}>
              The fast lane from <Box component="span" sx={{
                background: theme.palette.mode === 'light'
                  ? 'linear-gradient(90deg,#2f4eb8,#6a35c7,#a321d3)'
                  : 'linear-gradient(90deg,#b4c4ff,#dabfff,#f0dfff)',
                WebkitBackgroundClip: 'text', color: 'transparent'
              }}>natural language</Box> to live data.
            </Typography>
            <Typography variant="h6" fontWeight={400} sx={{ lineHeight: 1.35, maxWidth: 780 }}>
              Ask anything about customers, products, orders or bookings. We compile safe Mongo aggregations using deterministic builders first; AI only fills the gaps.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700 }}>
              No ETL pipelines. No BI ticket backlog. Instant queries, chart suggestions and enrichment — all inside your API boundary.
            </Typography>
          </Stack>
          {/* Input */}
          <Stack spacing={2} sx={{ width: '100%', display: 'flex', maxWidth: 860, animation: 'fadeUp .75s ease' }}>
            <TextField
              fullWidth
              label="Try asking something now"
              placeholder={!isFocused && landingQuestion === '' ? typedPlaceholder : ''}
              value={landingQuestion}
              onChange={(e) => setLandingQuestion((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitLandingQuestion(); }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                // If user didn't type anything, restart animation from typing phase
                if (!landingQuestion) {
                  setPhase('typing');
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiInputBase-input::placeholder': {
                  opacity: 1,
                  transition: 'opacity .35s',
                  position: 'relative'
                },
                '& .MuiInputBase-input.MuiInputBase-input::after': {
                  content: '""',
                  position: 'absolute',
                  right: -2,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 2,
                  height: '1.2em',
                  background: theme.palette.mode === 'light' ? theme.palette.primary.main : '#fff',
                  borderRadius: 1,
                  animation: 'caretBlink 1.2s steps(2,end) infinite'
                },
                // Hide caret pseudo-element while focused (user typing) or when there is user text
                '& .MuiOutlinedInput-root.Mui-focused .MuiInputBase-input::after': {
                  display: 'none'
                },
                '& .MuiOutlinedInput-root fieldset': {
                  transition: 'border-image .4s'
                }
              }}
            />
          </Stack>
          {/* Feature Callouts */}
          <Box id="features" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 4, paddingTop: 2 }}>
            <FeatureCard icon={TimelineIcon} title="Deterministic First" text="Common analytical intents resolved via audited builder functions before any model is queried." />
            <FeatureCard icon={CodeIcon} title="Zero ETL" text="Works directly on your operational MongoDB. No warehouse sync or nightly batch jobs required." />
            <FeatureCard icon={SecurityIcon} title="Safe AI Layer" text="Strict spec sanitizer & field allow-list ensure only read-only, bounded aggregations run." />
          </Box>
        </Stack>
      </Box>
    )
  );
}