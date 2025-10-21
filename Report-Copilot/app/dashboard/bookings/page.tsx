"use client";
import DataTable from '@/components/DataTable';
import { useListData } from '@/components/useListData';
import { Stack, LinearProgress, Alert, Button, IconButton, Tooltip } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportCSV } from '@/lib/export';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PageHeader from '@/components/PageHeader';

export default function BookingsPage() {
    const { rows, loading, error, reload, setSearch, setSort, query } = useListData({ path: '/api/bookings', initialQuery: { page: 1, pageSize: 50, sort: 'bookingDate', order: 'desc' } });
    const toggleSort = () => setSort(query.sort || 'bookingDate', query.order === 'asc' ? 'desc' : 'asc');
    // Augment rows with derived columns (guestsTotal, addonsCount) for display/export
    const enrichedRows = rows.map(r => ({
        ...r,
        guestsTotal: r.guests ? (r.guests.adults + r.guests.children) : undefined,
        addonsCount: Array.isArray(r.addons) ? r.addons.length : 0,
    }));
    const columns = [
        { field: 'referenceCode', label: 'Ref' },
        { field: 'bookingDate', label: 'Booked' },
        { field: 'startDate', label: 'Start' },
        { field: 'endDate', label: 'End' },
        { field: 'status', label: 'Status' },
        { field: 'bookingType', label: 'Type' },
        { field: 'paymentStatus', label: 'Pay Status' },
        { field: 'channel', label: 'Channel' },
        { field: 'city', label: 'City' },
        { field: 'guestsTotal', label: 'Guests', numeric: true },
        { field: 'addonsCount', label: 'Add-ons', numeric: true },
        { field: 'totalPrice', label: 'Price', numeric: true },
        { field: 'taxAmount', label: 'Tax', numeric: true },
        { field: 'rating', label: 'Rating', numeric: true },
    ];
    const handleExport = () => exportCSV(columns, enrichedRows, 'bookings.csv');
    return (
        <Stack spacing={2}>
            <PageHeader
                icon={EventAvailableIcon}
                title="Bookings"
                badge="Read only"
                sortOrder={query.order as 'asc' | 'desc'}
                onToggleSort={toggleSort}
                onSearch={(val) => setSearch(val)}
                searchPlaceholder="Search city/notes/status"
                actionsRight={
                    <Tooltip title="Export CSV">
                        <span>
                            <IconButton size="small" onClick={handleExport} disabled={!rows.length} aria-label="Export CSV">
                                <FileDownloadIcon fontSize="inherit" />
                            </IconButton>
                        </span>
                    </Tooltip>
                }
            />
            {loading && <LinearProgress />}
            {error && <Alert severity="error" action={<Button size="small" onClick={() => reload()}>Retry</Button>}>{error}</Alert>}
            <DataTable columns={columns} rows={enrichedRows} emptyMessage="No bookings" exportable exportFileName="bookings.csv" badgeFields={["status", "bookingType", "paymentStatus"]} />
        </Stack>
    );
}
