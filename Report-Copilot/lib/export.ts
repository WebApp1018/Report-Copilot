// Utility to export table rows as CSV
export type SimpleColumnDef = string | { field: string; label?: string; numeric?: boolean };

function normalize(columns: SimpleColumnDef[]) {
    return columns.map(c => typeof c === 'string' ? { field: c, label: c } : { field: c.field, label: c.label || c.field });
}

function escapeCSV(val: string) {
    let v = val;
    if (v.includes('"')) v = v.replace(/"/g, '""');
    if (/[",\n]/.test(v)) return '"' + v + '"';
    return v;
}

function rawCell(v: any) {
    if (v == null) return '';
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

export function exportCSV(columns: SimpleColumnDef[], rows: any[], filename: string) {
    const cols = normalize(columns);
    const header = cols.map(c => escapeCSV(c.label)).join(',');
    const body = rows.map(r => cols.map(c => escapeCSV(rawCell(r[c.field]))).join(',')).join('\n');
    const csv = header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
