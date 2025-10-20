"use client";
import DataTable from '@/components/DataTable';
import { useListData } from '@/components/useListData';
import { Stack, LinearProgress, Alert, Button, IconButton, Tooltip } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportCSV } from '@/lib/export';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PageHeader from '@/components/PageHeader';

export default function OrdersPage() {
    const { rows, loading, error, reload, setSearch, setSort, query } = useListData({ path: '/api/orders', initialQuery: { page: 1, pageSize: 50, sort: 'orderDate', order: 'desc' } });
    const toggleSort = () => setSort(query.sort || 'orderDate', query.order === 'asc' ? 'desc' : 'asc');
    const columns = [
        { field: 'orderNumber', label: 'Order #' },
        { field: 'orderDate', label: 'Date' },
        { field: 'status', label: 'Status' },
        { field: 'paymentMethod', label: 'Payment' },
        { field: 'sourceChannel', label: 'Channel' },
        { field: 'subtotalAmount', label: 'Subtotal', numeric: true },
        { field: 'discountAmount', label: 'Discount', numeric: true },
        { field: 'shippingCost', label: 'Shipping', numeric: true },
        { field: 'taxAmount', label: 'Tax', numeric: true },
        { field: 'grandTotal', label: 'Grand Total', numeric: true },
    ];
    const handleExport = () => exportCSV(columns, rows, 'orders.csv');
    return (
        <Stack spacing={2}>
            <PageHeader
                icon={ReceiptLongIcon}
                title="Orders"
                badge="Read only"
                sortOrder={query.order as 'asc' | 'desc'}
                onToggleSort={toggleSort}
                onSearch={(val) => setSearch(val)}
                searchPlaceholder="Search notes/status"
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
            <DataTable columns={columns} rows={rows} emptyMessage="No orders" exportable exportFileName="orders.csv" />
        </Stack>
    );
}
