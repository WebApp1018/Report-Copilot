"use client";
import DataTable from '@/components/DataTable';
import { useListData } from '@/components/useListData';
import { Chip, Stack, Typography, LinearProgress, Alert, Button, TextField, IconButton } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';

export default function OrdersPage() {
    const { rows, loading, error, reload, setSearch, setSort, query } = useListData({ path: '/api/orders', initialQuery: { page: 1, pageSize: 50, sort: 'orderDate', order: 'desc' } });
    const toggleSort = () => setSort(query.sort || 'orderDate', query.order === 'asc' ? 'desc' : 'asc');
    return (
        <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={600}>Orders</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField size="small" placeholder="Search notes/status" onChange={e => setSearch(e.target.value)} />
                    <IconButton size="small" onClick={toggleSort}><SortIcon fontSize="small" /></IconButton>
                    <Chip color="secondary" label="Recent" size="small" />
                </Stack>
            </Stack>
            {loading && <LinearProgress />}
            {error && <Alert severity="error" action={<Button size="small" onClick={() => reload()}>Retry</Button>}>{error}</Alert>}
            <DataTable columns={[{ field: 'orderDate', label: 'Date' }, 'status', { field: 'totalAmount', label: 'Total', numeric: true }]} rows={rows} emptyMessage="No orders" />
        </Stack>
    );
}
