"use client";
import { Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography, TableSortLabel, Box, Select, MenuItem, IconButton, Divider, Tooltip, TableContainer } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useState, useMemo } from 'react';
import moment from 'moment';

type ColumnDef = string | { field: string; label?: string; numeric?: boolean };
interface DataTableProps {
    columns: ColumnDef[];
    rows: any[];
    emptyMessage?: string;
    dense?: boolean;
    initialPageSize?: number;
    exportable?: boolean;
    exportFileName?: string;
    /** Optional max height for vertical scroll confinement */
    maxHeight?: number;
    /** Fields that should render as badges (Chip) */
    badgeFields?: string[];
}

export default function DataTable({ columns, rows, emptyMessage, dense, initialPageSize = 10, exportable, exportFileName, maxHeight, badgeFields = [] }: DataTableProps) {
    const normalized = useMemo(() => columns.map(c => typeof c === 'string' ? { field: c, label: c } : { field: c.field, label: c.label || c.field, numeric: c.numeric }), [columns]);
    const [orderBy, setOrderBy] = useState<string | null>(null);
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const sorted = useMemo(() => {
        if (!orderBy) return rows;
        const copy = [...rows];
        copy.sort((a, b) => {
            const av = a[orderBy];
            const bv = b[orderBy];
            if (av == null && bv != null) return order === 'asc' ? -1 : 1;
            if (av != null && bv == null) return order === 'asc' ? 1 : -1;
            if (av == null && bv == null) return 0;
            if (typeof av === 'number' && typeof bv === 'number') return order === 'asc' ? av - bv : bv - av;
            return order === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        });
        return copy;
    }, [rows, orderBy, order]);

    const paged = useMemo(() => {
        const start = page * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [sorted, page, pageSize]);

    const handleSort = (field: string) => {
        if (orderBy === field) {
            setOrder(o => o === 'asc' ? 'desc' : 'asc');
        } else {
            setOrderBy(field);
            setOrder('asc');
        }
    };

    const totalPages = Math.ceil(rows.length / pageSize);
    const rangeStart = rows.length === 0 ? 0 : page * pageSize + 1;
    const rangeEnd = Math.min(rows.length, (page * pageSize) + paged.length);

    function toCSV(): string {
        const header = normalized.map(c => escapeCSV(c.label)).join(',');
        const body = sorted.map(row => normalized.map(c => escapeCSV(rawCell(row[c.field]))).join(',')).join('\n');
        return header + '\n' + body;
    }

    function rawCell(v: any) {
        if (v == null) return '';
        if (v instanceof Date) return v.toISOString();
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
    }

    function escapeCSV(val: string) {
        if (val.includes('"')) val = val.replace(/"/g, '""');
        if (/[",\n]/.test(val)) return '"' + val + '"';
        return val;
    }

    function handleExport() {
        const csv = toCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportFileName || `report-copilot-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return (
        <Paper elevation={1} sx={(t) => ({ width: '100%', borderRadius: 3, background: t.palette.mode === 'light' ? 'linear-gradient(180deg,#ffffff,#f9fafc)' : 'linear-gradient(180deg,#1e1e1e,#242629)', border: `1px solid ${t.palette.divider}`, display: 'flex', flexDirection: 'column' })}>
            <TableContainer className="data-scroll" sx={{ overflowX: 'auto', overflowY: maxHeight ? 'auto' : 'visible', maxHeight: maxHeight || 'none', borderRadius: 3 }}>
                <Table size={dense ? 'small' : 'medium'} stickyHeader sx={{ overflowX: 'auto', minWidth: '100%', '& .MuiTableCell-stickyHeader': { background: (t) => t.palette.mode === 'light' ? '#f1f5f9' : '#2d2f33' } }}>
                    <TableHead>
                        <TableRow>
                            {normalized.map(col => (
                                <TableCell key={col.field} align={col.numeric ? 'right' : 'left'} sx={{ fontWeight: 600, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
                                    <TableSortLabel
                                        active={orderBy === col.field}
                                        direction={orderBy === col.field ? order : 'asc'}
                                        onClick={() => handleSort(col.field)}
                                        sx={{ '&:hover': { color: 'primary.main' }, '&.Mui-active': { color: 'primary.main' } }}
                                    >
                                        {col.label}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paged.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={normalized.length} align="center" sx={{ py: 5 }}>
                                    <Typography variant="body2" color="text.secondary">{emptyMessage || 'No data'}</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {paged.map((r, idx) => (
                            <TableRow
                                key={idx}
                                hover
                                sx={(t) => ({
                                    backgroundColor: idx % 2 === 0 ? (t.palette.mode === 'light' ? '#ffffff' : '#1e1e1e') : (t.palette.mode === 'light' ? '#f8fafc' : '#232323'),
                                    '&:last-of-type td': { borderBottom: 0 },
                                    transition: 'background-color .15s ease',
                                    '&:hover': { backgroundColor: t.palette.action.hover },
                                })}
                            >
                                {normalized.map(c => (
                                    <TableCell key={c.field} align={c.numeric ? 'right' : 'left'} sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}`, fontSize: dense ? 13 : 14 }}>
                                        {renderCell(c.field, r[c.field], !!c.numeric, badgeFields)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Divider sx={{ mt: 0 }} />
            {/* Pagination controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}><ArrowBackIcon fontSize="inherit" /></IconButton>
                    <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}><ArrowForwardIcon fontSize="inherit" /></IconButton>
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>Page {totalPages === 0 ? 0 : page + 1} / {totalPages}</Typography>
                    <Typography variant="caption" color="text.secondary">Rows {rangeStart}-{rangeEnd} of {rows.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>Rows per page</Typography>
                    <Select size="small" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}>
                        {[5, 10, 25, 50].map(sz => <MenuItem key={sz} value={sz}>{sz}</MenuItem>)}
                    </Select>
                    {exportable && (
                        <Tooltip title="Export CSV (all rows)">
                            <span>
                                <IconButton size="small" onClick={handleExport} disabled={rows.length === 0} aria-label="Export CSV">
                                    <FileDownloadIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                </Box>
            </Box>
        </Paper>
    );
}

function formatCell(v: any) {
    if (v == null) return '';
    // Numbers: large numbers or timestamps
    if (typeof v === 'number') {
        // Heuristic: treat as timestamp if > year 2001 in ms range
        if (v > 1000 * 60 * 60 * 24 * 365 * 10) { // > ~10 years in ms
            return moment(v).format('YYYY-MM-DD HH:mm');
        }
        return v.toLocaleString();
    }
    // Date instance
    if (v instanceof Date) return moment(v).format('YYYY-MM-DD HH:mm');
    // ISO date string detection
    if (typeof v === 'string') {
        // Basic ISO pattern
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
            const m = moment(v);
            if (m.isValid()) return m.format('YYYY-MM-DD HH:mm');
        }
        return v;
    }
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

// Badge color mapping heuristic
function badgeColor(value: string) {
    if (!value) return 'default';
    const val = value.toLowerCase();
    if (/unpaid|failed|cancelled|canceled|error|inactive|denied|refunded/.test(val)) return 'error';
    if (/paid|completed|active|success|ok/.test(val)) return 'success';
    if (/pending|in[- ]?progress|processing|open|business/.test(val)) return 'warning';
    if (/draft|new|created|generated|confirmed|partial|consumer/.test(val)) return 'info';
    if (/archived|closed|delivered|fulfilled|shipped|returned|vip/.test(val)) return 'secondary';
    return 'default';
}

import { Chip } from '@mui/material';
function renderCell(field: string, value: any, numeric: boolean, badgeFields: string[]) {
    if (badgeFields.includes(field) && typeof value === 'string') {
        return <Chip size="small" label={value} color={badgeColor(value) as any} variant={badgeColor(value) === 'default' ? 'outlined' : 'filled'} />;
    }
    // For numeric, still format numbers
    if (numeric) return formatCell(value);
    return formatCell(value);
}
