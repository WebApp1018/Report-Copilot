"use client";
import DataTable from '@/components/DataTable';
import { useListData } from '@/components/useListData';
import { Chip, Stack, Typography, LinearProgress, Alert, Button, TextField, IconButton } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';

export default function CustomersPage() {
    const { rows, loading, error, reload, setSearch, setSort, query } = useListData({ path: '/api/customers', initialQuery: { page: 1, pageSize: 50, sort: 'createdAt', order: 'desc' } });
    const toggleSort = () => {
        const nextOrder = query.order === 'asc' ? 'desc' : 'asc';
        setSort(query.sort || 'createdAt', nextOrder);
    };
    return (
        <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={600}>Customers</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField size="small" placeholder="Search" onChange={e => setSearch(e.target.value)} />
                    <IconButton size="small" onClick={toggleSort} title={`Sort (${query.order || 'desc'})`}><SortIcon fontSize="small" /></IconButton>
                    <Chip label="Read only" size="small" />
                </Stack>
            </Stack>
            {loading && <LinearProgress />}
            {error && <Alert severity="error" action={<Button size="small" onClick={() => reload()}>Retry</Button>}>{error}</Alert>}
            <DataTable columns={['name', 'email', 'city', 'state']} rows={rows} emptyMessage="No customers" />
        </Stack>
    );
}
