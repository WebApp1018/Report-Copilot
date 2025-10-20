"use client";
import { Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography, TableSortLabel, Box, Select, MenuItem, IconButton } from '@mui/material';
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
}

export default function DataTable({ columns, rows, emptyMessage, dense, initialPageSize = 10 }: DataTableProps) {
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

    return (
        <Paper elevation={1} sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size={dense ? 'small' : 'medium'} stickyHeader>
                <TableHead>
                    <TableRow>
                        {normalized.map(col => (
                            <TableCell key={col.field} sx={{ fontWeight: 600, fontSize: 12 }} align={col.numeric ? 'right' : 'left'}>
                                <TableSortLabel
                                    active={orderBy === col.field}
                                    direction={orderBy === col.field ? order : 'asc'}
                                    onClick={() => handleSort(col.field)}
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
                            <TableCell colSpan={normalized.length} align="center" sx={{ py: 4 }}>
                                <Typography variant="body2" color="text.secondary">{emptyMessage || 'No data'}</Typography>
                            </TableCell>
                        </TableRow>
                    )}
                    {paged.map((r, idx) => (
                        <TableRow key={idx} hover>
                            {normalized.map(c => (
                                <TableCell key={c.field} align={c.numeric ? 'right' : 'left'}>{formatCell(r[c.field])}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {/* Pagination controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}><ArrowBackIcon fontSize="inherit" /></IconButton>
                    <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}><ArrowForwardIcon fontSize="inherit" /></IconButton>
                    <Typography variant="caption">Page {totalPages === 0 ? 0 : page + 1} / {totalPages}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption">Rows per page</Typography>
                    <Select size="small" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}>
                        {[5, 10, 25, 50].map(sz => <MenuItem key={sz} value={sz}>{sz}</MenuItem>)}
                    </Select>
                    <Typography variant="caption">Total: {rows.length}</Typography>
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
