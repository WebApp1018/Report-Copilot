"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DataTable from '@/components/DataTable';
import { Button, Chip, Paper, Stack, TextField, Typography, Alert, CircularProgress, Box, InputAdornment, LinearProgress, IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import SimpleChart from '@/components/SimpleChart';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportCSV } from '@/lib/export';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SearchIcon from '@mui/icons-material/Search';
import PageHeader from '@/components/PageHeader';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const examples = [
    'Who is the top customer this month?',
    'Best selling products list this month',
    'Total booking price from customers in New York',
    'Revenue by city this month',
    'Customers who ordered 15+'
];

function AIReportContent() {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [controller, setController] = useState<AbortController | null>(null);
    const searchParams = useSearchParams();

    async function runQuery(q: string) {
        if (!q.trim()) return;
        // Abort any previous in-flight request first
        controller?.abort();
        const c = new AbortController();
        setController(c);
        setLoading(true); setError(null);
        try {
            const res = await fetch(`http://localhost:5000/api/ai/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q }),
                signal: c.signal
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setResult(json);
        } catch (e: any) {
            if (e?.name === 'AbortError') {
                // Silently ignore cancel
            } else {
                setError(e.message || 'Query failed');
            }
        } finally {
            if (!c.signal.aborted) setLoading(false);
            setController(null);
        }
    }

    function cancelQuery() {
        controller?.abort();
        setLoading(false);
    }

    // Auto-run when ?q= is present (and only first mount or when q changes via URL)
    useEffect(() => {
        const initial = searchParams.get('q');
        if (initial && initial !== question) {
            setQuestion(initial);
            // Slight timeout allows state to set before run
            setTimeout(() => runQuery(initial), 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    return (
        <Stack spacing={3}>
            <PageHeader
                icon={SmartToyIcon}
                title="AI Report"
                badge="Experimental"
                dense
                actionsRight={result?.data?.length ? (
                    <Tooltip title="Export CSV">
                        <span>
                            <IconButton size="small" onClick={() => exportCSV(result.spec?.fields || Object.keys(result.data?.[0] || {}), result.data || [], 'ai-report.csv')} aria-label="Export CSV">
                                <FileDownloadIcon fontSize="inherit" />
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : undefined}
            />
            <Paper elevation={3} sx={(t) => ({
                p: 3,
                borderRadius: 3,
                position: 'relative',
                background: t.palette.mode === 'light'
                    ? 'linear-gradient(135deg,#ffffff,#f4f7fb)'
                    : 'linear-gradient(135deg,#1f1f1f,#272a2e)',
                border: `1px solid ${t.palette.divider}`,
            })}
            >
                {loading && <LinearProgress sx={{ position: 'absolute', left: 0, right: 0, top: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />}
                <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <TextField
                            fullWidth
                            label="Ask a question"
                            value={question}
                            onChange={(e) => setQuestion((e.target as HTMLInputElement).value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') runQuery(question); }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            variant="contained"
                            disabled={!question}
                            color={loading ? 'warning' : 'primary'}
                            onClick={() => (loading ? cancelQuery() : runQuery(question))}
                            startIcon={loading ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                            sx={{ minWidth: 120, alignSelf: { xs: 'flex-end', sm: 'stretch' } }}
                        >
                            {loading ? 'Cancel' : 'Run'}
                            {loading && <CircularProgress size={16} sx={{ ml: 1 }} />}
                        </Button>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                        {examples.map(ex => (
                            <Chip
                                key={ex}
                                label={ex}
                                variant="outlined"
                                onClick={() => { setQuestion(ex); runQuery(ex); }}
                                sx={(t) => ({
                                    cursor: 'pointer',
                                    transition: 'background-color .2s, box-shadow .2s',
                                    borderRadius: 2,
                                    '&:hover': {
                                        backgroundColor: t.palette.action.hover,
                                        boxShadow: t.palette.mode === 'light' ? '0 2px 6px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.6)',
                                    },
                                })}
                            />
                        ))}
                    </Stack>
                    {error && <Alert severity="error" variant="outlined">{error}</Alert>}
                    {!result && !loading && !error && (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">Enter a question or pick an example to generate a report.</Typography>
                        </Box>
                    )}
                    {result && (
                        <Stack spacing={2}>
                            {result.description && (
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>Description</Typography>
                                    <Typography variant="body2" color="text.secondary">{result.description}</Typography>
                                </Paper>
                            )}
                            <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Debug Info</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Typography variant="caption" display="block">Spec Type: {result.spec?.type}</Typography>
                                    <Typography variant="caption" display="block">Collection: {result.spec?.collection}</Typography>
                                    <Typography variant="caption" display="block">Fields: {(result.spec?.fields || []).join(', ')}</Typography>
                                    <Typography variant="caption" display="block">Row Count: {Array.isArray(result.data) ? result.data.length : 0}</Typography>
                                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>First Row JSON:</Typography>
                                    <Box component="pre" sx={{ fontSize: 11, p: 1, backgroundColor: 'action.hover', borderRadius: 1, maxHeight: 150, overflow: 'auto' }}>
                                        {JSON.stringify(Array.isArray(result.data) ? result.data[0] : null, null, 2)}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                            {(() => {
                                // Derive columns & rows with special handling for single summary aggregates
                                let rows: any[] = Array.isArray(result.data) ? result.data : [];
                                let columns: any = (result.spec?.fields && result.spec.fields.length) ? result.spec.fields : (rows[0] ? Object.keys(rows[0]) : []);

                                if (rows.length === 1) {
                                    const first = { ...rows[0] };
                                    if (first._id === null) delete first._id;
                                    const keys = Object.keys(first);
                                    if (keys.length === 1) {
                                        const metricField = keys[0];
                                        columns = [metricField];
                                        rows = [{ [metricField]: first[metricField] }];
                                    } else {
                                        columns = keys;
                                        rows = [first];
                                    }
                                }

                                // Safety: ensure column labels are unique and non-empty
                                columns = columns.filter((c: any) => !!c);
                                if (!Array.isArray(rows)) rows = [];

                                return <>
                                    <DataTable key={columns.join('|')} columns={columns} rows={rows} emptyMessage="No rows" dense exportable exportFileName="ai-report.csv" />
                                    {result.chart && result.chart.type !== 'table' && (
                                        <SimpleChart data={rows} spec={{ ...result.chart, title: result.description }} />
                                    )}
                                </>;
                            })()}
                        </Stack>
                    )}
                </Stack>
            </Paper>
        </Stack>
    );
}

export default function AIReportPage() {
    return (
        <Suspense fallback={<Stack spacing={2} sx={{ p: 3 }}><Typography variant="body2" color="text.secondary">Loading AI report...</Typography></Stack>}>
            <AIReportContent />
        </Suspense>
    );
}
