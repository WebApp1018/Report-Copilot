interface FetchOptions {
    method?: 'GET' | 'POST';
    body?: any;
    query?: Record<string, any>;
    cache?: 'no-store' | 'force-cache';
}

export async function fetchApi(path: string, opts: FetchOptions = {}) {
    const base = process.env.API_BASE_URL || 'http://localhost:5000';
    const { method = 'POST', body, query, cache } = opts;
    const qs = query ?
        '?' + Object.entries(query)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&')
        : '';
    const res = await fetch(`${base}${path}${qs}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
        next: cache ? { revalidate: cache === 'force-cache' ? 60 : 0 } : { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json();
}

// Convenience for GET list endpoints
export async function fetchList(path: string, query?: Record<string, any>) {
    return fetchApi(path, { method: 'GET', query });
}
