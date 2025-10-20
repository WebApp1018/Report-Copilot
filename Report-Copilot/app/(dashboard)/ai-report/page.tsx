"use client";
import { useState } from 'react';
import { clientFetchApi } from '@/lib/api-client';
import DataTable from '@/components/DataTable';
import { Button, Chip, Paper, Stack, TextField, Typography, Alert } from '@mui/material';

const examples = [
    'Who is the top customer this month?',
    'What product is the best selling this month?',
    'Total booking price from customers in New York',
    'Revenue by city this month',
];

export default function AIReportPage() {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    async function runQuery(q: string) {
        setLoading(true); setError(null);
        try {
            const res = await clientFetchApi('/api/ai/query', { question: q });
            setResult(res);
        } catch (e: any) {
            setError(e.message || 'Query failed');
        } finally { setLoading(false); }
    }

    return (
        <Stack spacing={3}>
            <Typography variant="h4" fontWeight={600}>AI Report</Typography>
            <Paper sx={{ p: 3 }} elevation={2}>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                        <TextField fullWidth label="Ask a question" value={question} onChange={(e) => setQuestion((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter') runQuery(question); }} />
                        <Button variant="contained" disabled={!question || loading} onClick={() => runQuery(question)}>{loading ? 'Running…' : 'Run'}</Button>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {examples.map(ex => (
                            <Chip key={ex} label={ex} variant="outlined" onClick={() => { setQuestion(ex); runQuery(ex); }} />
                        ))}
                    </Stack>
                    {error && <Alert severity="error">{error}</Alert>}
                    {result && (
                        <Stack spacing={2}>
                            {result.description && <Typography variant="body2" color="text.secondary">{result.description}</Typography>}
                            <DataTable columns={result.spec?.fields || Object.keys(result.data?.[0] || {})} rows={result.data || []} emptyMessage="No rows" dense />
                            {result.chart && <Alert severity="info" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>Chart suggestion: {JSON.stringify(result.chart, null, 2)}</Alert>}
                        </Stack>
                    )}
                </Stack>
            </Paper>
        </Stack>
    );
}
