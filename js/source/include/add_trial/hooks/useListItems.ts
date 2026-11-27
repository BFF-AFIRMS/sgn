import { useState, useEffect } from 'react';

/**
 * Fetches `/list/contents/:listId` and returns the list's items coerced to strings.
 * A falsy id short-circuits to an empty array, and a failed request is logged and reported as an empty list.
 * 
 * @param listId The ID of the list to fetch items for.
 * @returns A promise that resolves to an array of list items as strings.
 */
export const fetchListItems = async (listId: string): Promise<string[]> => {
    if (!listId) return [];
    try {
        const res = await fetch(`/list/contents/${encodeURIComponent(listId)}`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                return data.map(String);
            } else {
                throw new Error('Unexpected response format');
            }
        } else {
            throw new Error('Non-OK response');
        }
    } catch (e) {
        console.error(`Failed to fetch items for list ${listId}:`, e);
    }
    return [];
};

/**
 * Loads the items of a Breedbase list, re-fetching whenever `listId` changes.
 * Delegates to `fetchListItems` and tracks `loading` while the request is in flight.
 * 
 * @param listId The ID of the list to load items for; a falsy id clears the items.
 * @returns The list's items as strings and a loading flag.
 */
export const useListItems = (listId?: string): { items: string[]; loading: boolean } => {
    const [items, setItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!listId) {
            setItems([]);
            return;
        }
        setLoading(true);
        fetchListItems(listId).then(data => {
            setItems(data);
            setLoading(false);
        });
    }, [listId]);

    return { items, loading };
};
