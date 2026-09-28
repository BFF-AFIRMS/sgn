import { useState, useEffect, useCallback, useMemo } from 'react';

export interface BreedbaseListItem {
    id: string;
    name: string;
}

type ListTuple = [number | string, string, ...unknown[]];

const STOCK_TO_LIST_TYPE: Record<string, string> = {
    accession: 'accessions',
    cross: 'crosses',
    family_name: 'family_names',
    seedlot: 'seedlots',
};

export const normalizeListType = (type?: string): string => {
    if (!type) return '';
    const clean = type.toLowerCase().trim();
    return STOCK_TO_LIST_TYPE[clean] ?? clean;
};

export const fetchListItems = async (listId: string): Promise<string[]> => {
    if (!listId) return [];
    try {
        const res = await fetch(`/list/contents/${encodeURIComponent(listId)}`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                return data.map(String);
            }
        }
    } catch (e) {
        console.error(`Failed to fetch items for list ${listId}:`, e);
    }
    return [];
};

export const useListItems = (listId?: string): { items: string[]; loading: boolean } => {
    const [items, setItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!listId) {
            setItems([]);
            return;
        }
        let isMounted = true;
        setLoading(true);
        fetchListItems(listId).then(data => {
            if (isMounted) {
                setItems(data);
                setLoading(false);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [listId]);

    return { items, loading };
};

export const useBreedbaseLists = (listType: string) => {
    const [lists, setLists] = useState<BreedbaseListItem[]>([]);
    const [loading, setLoading] = useState(false);

    const normalizedType = normalizeListType(listType);

    const loadLists = useCallback(async () => {
        setLoading(true);
        try {
            const body = normalizedType ? new URLSearchParams({ type: normalizedType }).toString() : '';
            const res = await fetch('/list/available', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            if (res.ok) {
                const data: ListTuple[] = await res.json();
                if (Array.isArray(data)) {
                    setLists(data.map(
                        ([id, name]) => ({ id: String(id), name })
                    ));
                } else {
                    setLists([]);
                }
            } else {
                setLists([]);
            }
        } catch (e) {
            console.error('Failed to load Breedbase lists', e);
            setLists([]);
        } finally {
            setLoading(false);
        }
    }, [normalizedType]);

    useEffect(() => {
        loadLists();
    }, [loadLists]);

    return { lists, loading, loadLists };
};
