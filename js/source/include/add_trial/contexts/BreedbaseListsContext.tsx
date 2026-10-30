import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';

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

export interface BreedbaseListsContextType {
    listsByType: Record<string, BreedbaseListItem[]>;
    loadingByType: Record<string, boolean>;
    fetchLists: (type: string) => Promise<void>;
    registerType: (type: string) => void;
    unregisterType: (type: string) => void;
}

const BreedbaseListsContext = createContext<BreedbaseListsContextType | undefined>(undefined);

export const BreedbaseListsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [listsByType, setListsByType] = useState<Record<string, BreedbaseListItem[]>>({});
    const [loadingByType, setLoadingByType] = useState<Record<string, boolean>>({});

    const listsByTypeRef = useRef(listsByType);
    listsByTypeRef.current = listsByType;

    const inFlightRef = useRef<Set<string>>(new Set());
    const activeTypesCountRef = useRef<Record<string, number>>({});
    const lastFocusTimeRef = useRef<number>(0);

    const fetchLists = useCallback(async (type: string) => {
        if (!type || inFlightRef.current.has(type)) {
            return;
        }
        inFlightRef.current.add(type);
        setLoadingByType(prev => ({ ...prev, [type]: true }));
        try {
            const body = new URLSearchParams({ type }).toString();
            const res = await fetch('/list/available', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            if (res.ok) {
                const data: ListTuple[] = await res.json();
                if (Array.isArray(data)) {
                    const mapped = data.map(([id, name]) => ({ id: String(id), name }));
                    setListsByType(prev => ({ ...prev, [type]: mapped }));
                } else {
                    throw new Error('Unexpected response format');
                }
            } else {
                throw new Error(`Non-OK response: ${res.status}`);
            }
        } catch (e) {
            console.error(`Failed to load Breedbase lists for type "${type}"`, e);
            setListsByType(prev => ({ ...prev, [type]: [] }));
        } finally {
            inFlightRef.current.delete(type);
            setLoadingByType(prev => ({ ...prev, [type]: false }));
        }
    }, []);

    const registerType = useCallback((type: string) => {
        if (!type) return;
        const currentCount = activeTypesCountRef.current[type] || 0;
        activeTypesCountRef.current[type] = currentCount + 1;
        if (listsByTypeRef.current[type] === undefined && !inFlightRef.current.has(type)) {
            fetchLists(type);
        }
    }, [fetchLists]);

    const unregisterType = useCallback((type: string) => {
        if (!type) return;
        const currentCount = activeTypesCountRef.current[type] || 0;
        if (currentCount <= 1) {
            delete activeTypesCountRef.current[type];
        } else {
            activeTypesCountRef.current[type] = currentCount - 1;
        }
    }, []);

    useEffect(() => {
        const refreshActiveLists = () => {
            const active = Object.keys(activeTypesCountRef.current).filter(
                t => (activeTypesCountRef.current[t] || 0) > 0
            );
            active.forEach(t => {
                fetchLists(t);
            });
        };

        const handleWindowFocus = () => {
            const now = Date.now();
            if (now - lastFocusTimeRef.current < 5000) {
                return;
            }
            lastFocusTimeRef.current = now;
            refreshActiveLists();
        };

        const handleModalHide = () => {
            refreshActiveLists();
        };

        window.addEventListener('focus', handleWindowFocus);
        const $ = (window as unknown as { jQuery?: JQueryStatic; $?: JQueryStatic }).jQuery ||
            (window as unknown as { jQuery?: JQueryStatic; $?: JQueryStatic }).$;
        if ($) {
            $('#list_dialog').on('hidden.bs.modal', handleModalHide);
        }

        return () => {
            window.removeEventListener('focus', handleWindowFocus);
            if ($) {
                $('#list_dialog').off('hidden.bs.modal', handleModalHide);
            }
        };
    }, [fetchLists]);

    return (
        <BreedbaseListsContext.Provider value={{
            listsByType,
            loadingByType,
            fetchLists,
            registerType,
            unregisterType
        }}>
            {children}
        </BreedbaseListsContext.Provider>
    );
};

export const useBreedbaseListsContext = () => {
    const ctx = useContext(BreedbaseListsContext);
    if (!ctx) {
        throw new Error('useBreedbaseLists must be used within a BreedbaseListsProvider');
    }
    return ctx;
};

export const useBreedbaseLists = (listType: string) => {
    const {
        listsByType,
        loadingByType,
        fetchLists,
        registerType,
        unregisterType
    } = useBreedbaseListsContext();

    const normalizedType = normalizeListType(listType);

    useEffect(() => {
        if (!normalizedType) return;
        registerType(normalizedType);
        return () => {
            unregisterType(normalizedType);
        };
    }, [normalizedType, registerType, unregisterType]);

    const lists = useMemo(() => {
        return normalizedType ? (listsByType[normalizedType] || []) : [];
    }, [listsByType, normalizedType]);

    const loading = Boolean(normalizedType && loadingByType[normalizedType]);

    const loadLists = useCallback(() => {
        if (!normalizedType) return Promise.resolve();
        return fetchLists(normalizedType);
    }, [fetchLists, normalizedType]);

    return { lists, loading, loadLists };
};
