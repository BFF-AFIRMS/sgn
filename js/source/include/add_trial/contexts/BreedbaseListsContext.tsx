import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';

/** A Breedbase list, reduced to the fields the wizard needs. */
export interface BreedbaseListItem {
    id: string;
    name: string;
}

/** Shape of a `/list/available` response entry: [id, name, ...]. */
type ListTuple = [number | string, string, ...unknown[]];

/** Maps stock types to the Breedbase list types they resolve to. */
const STOCK_TO_LIST_TYPE: Record<string, string> = {
    accession: 'accessions',
    cross: 'crosses',
    family_name: 'family_names',
    seedlot: 'seedlots',
};

/**
 * Normalizes a stock/list type to its Breedbase list type, pluralizing the
 * known stock types (`accession` -> `accessions`). Unknown types are trimmed
 * and lowercased, then passed through unchanged.
 */
export const normalizeListType = (type?: string): string => {
    if (!type) return '';
    const clean = type.toLowerCase().trim();
    return STOCK_TO_LIST_TYPE[clean] ?? clean;
};

/**
 * Shared, cached access to the Breedbase lists of a given type. Consumed
 * through `useBreedbaseLists`, which registers the requested type for the
 * lifetime of the calling component.
 */
export interface BreedbaseListsContextType {
    /**
     * Cached lists keyed by list type.
     */
    listsByType: Record<string, BreedbaseListItem[]>;

    /**
     * Per-type loading flags for in-flight fetches.
     */
    loadingByType: Record<string, boolean>;

    /**
     * Fetches the lists of `type` from `/list/available` and caches them in
     * `listsByType`. A request already in flight for the type is ignored, and a
     * failed request is logged and cached as an empty list.
     */
    fetchLists: (type: string) => Promise<void>;

    /**
     * Records that a component is now interested in `type`, incrementing its
     * reference count and fetching its lists if they aren't cached yet.
     */
    registerType: (type: string) => void;

    /**
     * Records that a component is no longer interested in `type`, decrementing
     * its reference count and dropping the type once its last consumer
     * unregisters.
     */
    unregisterType: (type: string) => void;
}

const BreedbaseListsContext = createContext<BreedbaseListsContextType | undefined>(undefined);

/**
 * Caches lists per type so every consumer of the same type shares one request
 * (concurrent fetches for a type are de-duplicated) and one result. The active
 * types are reference-counted through `registerType` / `unregisterType`.
 */
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

    // Re-fetch the active types when lists may have changed: on window focus
    // (throttled to once every 5s) and when the list-management dialog
    // (`#list_dialog`) closes, so newly created or edited lists appear without
    // a page reload.
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

/**
 * Accesses the full lists context. Throws if used outside a `BreedbaseListsProvider`.
 */
export const useBreedbaseListsContext = () => {
    const ctx = useContext(BreedbaseListsContext);
    if (!ctx) {
        throw new Error('useBreedbaseLists must be used within a BreedbaseListsProvider');
    }
    return ctx;
};

/**
 * Subscribes to the lists of a single type, registering it for the lifetime of
 * the calling component so the provider keeps it fresh. Returns the cached
 * lists, a loading flag, and a `loadLists` function to re-fetch on demand.
 *
 * @param listType The list type to consume (e.g. `accession` or `accessions`).
 * @returns The type's lists, its loading state, and a manual re-fetch.
 */
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
