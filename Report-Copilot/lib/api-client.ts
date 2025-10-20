export async function clientFetchApi(path: string, body?: any) {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Request failed (${res.status}): ${text}`);
    }
    return res.json();
}

export async function clientFetchList(path: string, query?: Record<string, any>) {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const qs = query ? '?' + Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&') : '';
    const res = await fetch(`${base}${path}${qs}`, { method: 'GET' });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Request failed (${res.status}): ${text}`);
    }
    return res.json();
}
