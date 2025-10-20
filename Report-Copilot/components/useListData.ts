"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { clientFetchList } from '@/lib/api-client';

interface UseListOptions {
    path: string;
    initialQuery?: Record<string, any>;
    auto?: boolean;
}

export function useListData<T = any>({ path, initialQuery = {}, auto = true }: UseListOptions) {
    const [query, setQuery] = useState<Record<string, any>>(initialQuery);
    const [rows, setRows] = useState<T[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const mountedRef = useRef(false);
    const inflightRef = useRef<Promise<any> | null>(null);
    const queryRef = useRef<Record<string, any>>(initialQuery);

    // Update query state without causing effect thrash
    const setQuerySafe = (next: Record<string, any>) => {
        queryRef.current = next;
        setQuery(next);
    };

    const load = useCallback(async (override?: Record<string, any>) => {
        // Prevent parallel duplicate loads
        if (inflightRef.current) return inflightRef.current;
        setLoading(true); setError(null);
        const q = { ...queryRef.current, ...(override || {}) };
        const p = (async () => {
            try {
                const data = await clientFetchList(path, q);
                if (!mountedRef.current) return; // Ignore if unmounted mid-flight
                setRows(data?.rows || []);
                setTotal(data?.total || 0);
                setQuerySafe(q);
                return data;
            } catch (e: any) {
                if (mountedRef.current) setError(e.message || 'Failed to load');
            } finally {
                if (mountedRef.current) setLoading(false);
                inflightRef.current = null;
            }
        })();
        inflightRef.current = p;
        return p;
    }, [path]);

    useEffect(() => {
        mountedRef.current = true;
        if (auto) load();
        return () => { mountedRef.current = false; };
    }, [auto, load]);

    useEffect(() => { if (auto) load(); }, [auto, load]);

    const setPage = (page: number) => load({ page });
    const setPageSize = (pageSize: number) => load({ page: 1, pageSize });
    const setSort = (sort: string, order: 'asc' | 'desc' = 'asc') => load({ sort, order });
    // Debounced search handling
    const searchRef = useRef<string>('');
    const debounceTimerRef = useRef<any>(null);
    const setSearch = (q: string) => {
        searchRef.current = q;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            load({ q: searchRef.current, page: 1 });
        }, 350); // 350ms debounce
    };

    return { rows, total, loading, error, query: queryRef.current, setQuery: setQuerySafe, reload: load, setPage, setPageSize, setSort, setSearch };
}
