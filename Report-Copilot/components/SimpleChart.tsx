"use client";
import React, { useMemo } from 'react';
import { Paper, Typography, Box, useTheme, Tooltip } from '@mui/material';

export interface ChartSpec {
    type: 'bar' | 'line' | 'pie' | 'table';
    x?: string;
    y?: string;
    title?: string;
}

interface SimpleChartProps {
    data: any[];
    spec: ChartSpec;
    height?: number;
}

// A dependency-free lightweight chart renderer for quick insights.
// Not meant to replace a full charting lib; good for small aggregated result sets.
export default function SimpleChart({ data, spec, height = 260 }: SimpleChartProps) {
    const theme = useTheme();
    const xKey = spec.x;
    const yKey = spec.y;
    const palette = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.error.main,
        theme.palette.warning.main,
        theme.palette.info.main,
    ];

    const numericData = useMemo(() => {
        if (!xKey || !yKey) return [] as { x: string; y: number }[];
        return data
            .map(r => ({ x: String(r[xKey] ?? ''), y: typeof r[yKey] === 'number' ? r[yKey] : Number(r[yKey]) }))
            .filter(d => d.x && !isNaN(d.y));
    }, [data, xKey, yKey]);

    if (!spec || spec.type === 'table') return null;
    if (!xKey || !yKey) return null;
    if (!numericData.length) return null;

    const maxY = Math.max(...numericData.map(d => d.y));
    const totalY = numericData.reduce((a, b) => a + b.y, 0);

    if (spec.type === 'bar') {
        return (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                {spec.title && <Typography variant="subtitle2" gutterBottom>{spec.title}</Typography>}
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height }}>
                    {numericData.map((d, i) => {
                        const h = maxY === 0 ? 0 : (d.y / maxY) * (height - 40);
                        return (
                            <Tooltip key={i} title={`${d.x}: ${formatNumber(d.y)}`} placement="top">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 40 }}>
                                    <Box sx={{
                                        width: '100%',
                                        background: palette[i % palette.length],
                                        height: h,
                                        borderTopLeftRadius: 4,
                                        borderTopRightRadius: 4,
                                        transition: 'opacity .2s',
                                        '&:hover': { opacity: 0.8 }
                                    }} />
                                    <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center', maxWidth: 60, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.x}</Typography>
                                </Box>
                            </Tooltip>
                        );
                    })}
                </Box>
            </Paper>
        );
    }

    if (spec.type === 'line') {
        const points = numericData.map((d, i) => {
            const xPct = numericData.length === 1 ? 0.5 : (i / (numericData.length - 1));
            const yPct = maxY === 0 ? 0 : (d.y / maxY);
            return `${xPct * 100},${(1 - yPct) * 100}`;
        }).join(' ');
        return (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                {spec.title && <Typography variant="subtitle2" gutterBottom>{spec.title}</Typography>}
                <Box sx={{ position: 'relative', height }}>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
                        <polyline
                            fill="none"
                            stroke={theme.palette.primary.main}
                            strokeWidth={1.5}
                            points={points}
                            vectorEffect="non-scaling-stroke"
                        />
                        {numericData.map((d, i) => {
                            const xPct = numericData.length === 1 ? 0.5 : (i / (numericData.length - 1));
                            const yPct = maxY === 0 ? 0 : (d.y / maxY);
                            return (
                                <circle key={i} cx={xPct * 100} cy={(1 - yPct) * 100} r={1.5} fill={theme.palette.primary.main} />
                            );
                        })}
                    </svg>
                    <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', px: 1 }}>
                        {numericData.map((d, i) => (
                            <Typography key={i} variant="caption" sx={{ transform: 'translateX(-50%)' }}>{d.x}</Typography>
                        ))}
                    </Box>
                </Box>
            </Paper>
        );
    }

    if (spec.type === 'pie') {
        const slices = numericData.map((d, i) => ({ ...d, color: palette[i % palette.length] }));
        let current = 0;
        const gradients: string[] = [];
        slices.forEach(s => {
            const start = current;
            const pct = totalY === 0 ? 0 : (s.y / totalY) * 100;
            const end = start + pct;
            gradients.push(`${s.color} ${start}% ${end}%`);
            current = end;
        });
        const background = `conic-gradient(${gradients.join(',')})`;
        return (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                {spec.title && <Typography variant="subtitle2" gutterBottom>{spec.title}</Typography>}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Box sx={{ width: height, height, borderRadius: '50%', background, boxShadow: 1, flexShrink: 0 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {slices.map((s, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, background: s.color }} />
                                <Typography variant="caption" sx={{ fontWeight: 500 }}>{s.x}</Typography>
                                <Typography variant="caption" color="text.secondary">{formatNumber(s.y)} ({formatPercent(totalY === 0 ? 0 : s.y / totalY)})</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Paper>
        );
    }

    return null;
}

function formatNumber(n: number) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function formatPercent(p: number) {
    return (p * 100).toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%';
}
