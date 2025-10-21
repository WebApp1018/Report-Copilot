"use client";
import DataTable from '@/components/DataTable';
import { useListData } from '@/components/useListData';
import { Stack, LinearProgress, Alert, Button, IconButton, Tooltip } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportCSV } from '@/lib/export';
import PeopleIcon from '@mui/icons-material/People';
import PageHeader from '@/components/PageHeader';

export default function CustomersPage() {
    const { rows, loading, error, reload, setSearch, setSort, query } = useListData({ path: '/api/customers', initialQuery: { page: 1, pageSize: 50, sort: 'createdAt', order: 'desc' } });
    const toggleSort = () => {
        const nextOrder = query.order === 'asc' ? 'desc' : 'asc';
        setSort(query.sort || 'createdAt', nextOrder);
    };
    // Expanded columns to surface richer customer attributes
    const columns = [
        { field: 'name', label: 'Name' },
        { field: 'email', label: 'Email' },
        { field: 'segment', label: 'Segment' },
        { field: 'marketingOptIn', label: 'Mkt Opt-In' },
        { field: 'loyaltyPoints', label: 'Points', numeric: true },
        { field: 'lifetimeValue', label: 'Lifetime $', numeric: true },
        { field: 'lastOrderDate', label: 'Last Order' },
        { field: 'city', label: 'City' },
        { field: 'state', label: 'State' },
        { field: 'country', label: 'Country' },
    ];
    const handleExport = () => exportCSV(columns, rows, 'customers.csv');
    return (
        <Stack spacing={2}>
            <PageHeader
                icon={PeopleIcon}
                title="Customers"
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
            <DataTable columns={columns} rows={rows} emptyMessage="No customers" exportable exportFileName="customers.csv" badgeFields={["segment"]} />
        </Stack>
    );
}
