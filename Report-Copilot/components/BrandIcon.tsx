"use client";
import * as React from 'react';
import { SvgIcon, SvgIconProps, useTheme } from '@mui/material';

export default function BrandIcon(props: SvgIconProps) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const strokeGradStart = isLight ? '#3456d6' : '#4f7bff';
    const strokeGradEnd = isLight ? '#8b30d6' : '#b08bff';
    const nodeAccent = isLight ? '#7e22ce' : '#c084fc';
    const textFill = isLight ? '#334155' : '#e2e8f0';
    return (
        <SvgIcon viewBox="0 0 128 128" {...props}>
            <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={strokeGradStart} />
                    <stop offset="100%" stopColor={strokeGradEnd} />
                </linearGradient>
                <linearGradient id="brandGradFill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={isLight ? '#ffffff' : '#1e293b'} />
                    <stop offset="100%" stopColor={isLight ? '#f1f5f9' : '#0f172a'} />
                </linearGradient>
            </defs>
            <rect x="8" y="8" width="112" height="112" rx="28" fill="url(#brandGradFill)" stroke="url(#brandGrad)" strokeWidth="8" />
            <path d="M32 86 L54 62 L70 72 L94 46" fill="none" stroke="url(#brandGrad)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="96" cy="44" r="7" fill={nodeAccent} />
            <text x="64" y="44" textAnchor="middle" fontSize="28" fontWeight="600" fontFamily="var(--font-geist-sans), system-ui, sans-serif" fill={textFill} style={{ letterSpacing: 1 }}>RC</text>
        </SvgIcon>
    );
}
