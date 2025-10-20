"use client";
import DataTable from '@/components/DataTable';
import { useListData } from '@/components/useListData';
import { Chip, Stack, Typography, LinearProgress, Alert, Button, TextField, IconButton } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';

export default function BookingsPage() {
    const { rows, loading, error, reload, setSearch, setSort, query } = useListData({ path: '/api/bookings', initialQuery: { page: 1, pageSize: 50, sort: 'bookingDate', order: 'desc' } });
    const toggleSort = () => setSort(query.sort || 'bookingDate', query.order === 'asc' ? 'desc' : 'asc');
    return (
        <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={600}>Bookings</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField size="small" placeholder="Search city/notes/status" onChange={e => setSearch(e.target.value)} />
                    <IconButton size="small" onClick={toggleSort}><SortIcon fontSize="small" /></IconButton>
                    <Chip color="success" label="Active" size="small" />
                </Stack>
            </Stack>
            {loading && <LinearProgress />}
            {error && <Alert severity="error" action={<Button size="small" onClick={() => reload()}>Retry</Button>}>{error}</Alert>}
            <DataTable columns={[{ field: 'bookingDate', label: 'Booked' }, 'startDate', 'endDate', 'status', { field: 'totalPrice', label: 'Price', numeric: true }]} rows={rows} emptyMessage="No bookings" />
        </Stack>
    );
}
