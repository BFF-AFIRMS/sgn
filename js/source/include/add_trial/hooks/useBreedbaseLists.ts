import { useState, useEffect, useCallback } from 'react';

export interface BreedbaseListItem {
    id: string;
    name: string;
}

const normalizeType = (t?: string): string => {
    if (!t) return '';
    const s = t.toLowerCase().trim();
    if (s === 'cross') return 'crosses';
    if (s === 'family_name') return 'family_names';
    if (s === 'accession') return 'accessions';
    if (s === 'seedlot') return 'seedlots';
    return s;
};

export const useBreedbaseLists = (listType: string) => {
    const [lists, setLists] = useState<BreedbaseListItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadLists = useCallback(async () => {
        setLoading(true);
        try {
            let userLists: any = null;
            if ((window as any).CXGN?.List) {
                const listObj = new (window as any).CXGN.List();
                if (typeof listObj.availableLists === 'function') {
                    userLists = listObj.availableLists(listType);
                    if (!Array.isArray(userLists) || userLists.length === 0) {
                        userLists = listObj.availableLists([listType]);
                    }
                    if (!Array.isArray(userLists) || userLists.length === 0) {
                        userLists = listObj.availableLists();
                    }
                } else if (typeof listObj.getLists === 'function') {
                    userLists = listObj.getLists(listType);
                    if (!Array.isArray(userLists) || userLists.length === 0) {
                        userLists = listObj.getLists([listType]);
                    }
                }
            }

            // Fallback directly to /list/available API if CXGN.List is not loaded or returned nothing
            if (!Array.isArray(userLists) || userLists.length === 0) {
                try {
                    const res = await fetch('/list/available', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ type: listType }).toString()
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) {
                            userLists = data;
                        }
                    }
                } catch {
                    // Ignore fallback failure
                }
            }

            if (Array.isArray(userLists)) {
                const targetNormalized = normalizeType(listType);
                const filtered = userLists.filter((item: any) => {
                    if (!item) return false;
                    const itemType = Array.isArray(item) ? item[5] : (item.type || item.type_name);
                    return !itemType || normalizeType(itemType) === targetNormalized;
                });
                setLists(filtered.map((item: any) => ({
                    id: String(Array.isArray(item) ? item[0] : (item.list_id ?? item.id ?? '')),
                    name: String(Array.isArray(item) ? item[1] : (item.name ?? item.list_name ?? ''))
                })).filter(item => item.id && item.name));
            } else {
                setLists([]);
            }
        } catch (e) {
            console.error('Failed to load Breedbase lists', e);
        } finally {
            setLoading(false);
        }
    }, [listType]);

    useEffect(() => {
        loadLists();
    }, [loadLists]);

    const getListElements = useCallback((listId: string): string[] => {
        if (!listId) return [];
        try {
            if ((window as any).CXGN?.List) {
                const listObj = new (window as any).CXGN.List();
                if (typeof listObj.getList === 'function') {
                    const res = listObj.getList(listId);
                    if (Array.isArray(res) && res.length > 0) return res;
                }
                if (typeof listObj.getListData === 'function') {
                    const data = listObj.getListData(listId);
                    if (data && Array.isArray(data.elements) && data.elements.length > 0) {
                        return data.elements.map((el: any) => typeof el === 'string' ? el : el[1] || el.name || '');
                    }
                }
            }
        } catch (e) {
            console.warn('CXGN.List.getList failed, attempting fallback', e);
        }

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `/list/data?list_id=${encodeURIComponent(listId)}`, false);
            xhr.send(null);
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                if (Array.isArray(data)) return data;
                if (data && Array.isArray(data.elements)) {
                    return data.elements.map((el: any) => typeof el === 'string' ? el : el[1] || el.name || '');
                }
            }
        } catch {
            // Ignore fallback failure
        }
        return [];
    }, []);

    return { lists, loading, loadLists, getListElements };
};
