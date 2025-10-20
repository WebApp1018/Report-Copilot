"use client";
import DataTable from '@/components/DataTable';
import { useListData } from '@/components/useListData';
import { Chip, Stack, Typography, LinearProgress, Alert, Button, TextField, IconButton } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';

export default function ProductsPage() {
    const { rows, loading, error, reload, setSearch, setSort, query } = useListData({ path: '/api/products', initialQuery: { page: 1, pageSize: 50, sort: 'createdAt', order: 'desc' } });
    const toggleSort = () => setSort(query.sort || 'createdAt', query.order === 'asc' ? 'desc' : 'asc');
    return (
        <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={600}>Products</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField size="small" placeholder="Search" onChange={e => setSearch(e.target.value)} />
                    <IconButton size="small" onClick={toggleSort}><SortIcon fontSize="small" /></IconButton>
                    <Chip color="primary" label="Inventory" size="small" />
                </Stack>
            </Stack>
            {loading && <LinearProgress />}
            {error && <Alert severity="error" action={<Button size="small" onClick={() => reload()}>Retry</Button>}>{error}</Alert>}
            <DataTable columns={[{ field: 'name' }, { field: 'sku' }, { field: 'category' }, { field: 'unitPrice', label: 'Price', numeric: true }]} rows={rows} emptyMessage="No products" />
        </Stack>
    );
}
