"use client";
import DataTable from '@/components/DataTable';
import { useListData } from '@/components/useListData';
import { Stack, LinearProgress, Alert, Button, IconButton, Tooltip } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportCSV } from '@/lib/export';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PageHeader from '@/components/PageHeader';

export default function ProductsPage() {
    const { rows, loading, error, reload, setSearch, setSort, query } = useListData({ path: '/api/products', initialQuery: { page: 1, pageSize: 50, sort: 'createdAt', order: 'desc' } });
    const toggleSort = () => setSort(query.sort || 'createdAt', query.order === 'asc' ? 'desc' : 'asc');
    const columns = [
        { field: 'name', label: 'Name' },
        { field: 'sku', label: 'SKU' },
        { field: 'category', label: 'Category' },
        { field: 'brand', label: 'Brand' },
        { field: 'stockQty', label: 'Stock', numeric: true },
        { field: 'reorderLevel', label: 'Reorder', numeric: true },
        { field: 'unitPrice', label: 'Price', numeric: true },
        { field: 'costPrice', label: 'Cost', numeric: true },
        { field: 'msrp', label: 'MSRP', numeric: true },
        { field: 'marginPct', label: 'Margin %', numeric: true },
        { field: 'discontinued', label: 'Discontinued' },
    ];
    const handleExport = () => exportCSV(columns, rows, 'products.csv');
    return (
        <Stack spacing={2}>
            <PageHeader
                icon={Inventory2Icon}
                title="Products"
                badge="Read only"
                sortOrder={query.order as 'asc' | 'desc'}
                onToggleSort={toggleSort}
                onSearch={(val) => setSearch(val)}
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
            <DataTable columns={columns} rows={rows} emptyMessage="No products" exportable exportFileName="products.csv" />
        </Stack>
    );
}
