"use client";
import * as React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

export default function BrandIcon(props: SvgIconProps) {
    return (
        <SvgIcon viewBox="0 0 128 128" {...props}>
            <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
            </defs>
            <rect x="8" y="8" width="112" height="112" rx="28" fill="none" stroke="url(#brandGrad)" strokeWidth="8" />
            <path d="M32 86 L54 62 L70 72 L94 46" fill="none" stroke="url(#brandGrad)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="96" cy="44" r="7" fill="#9333ea" />
            <text x="64" y="44" textAnchor="middle" fontSize="28" fontWeight="600" fontFamily="var(--font-geist-sans), system-ui, sans-serif" fill="#e2e8f0">RC</text>
        </SvgIcon>
    );
}
