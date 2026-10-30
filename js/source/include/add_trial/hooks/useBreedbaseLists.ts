import { useState, useEffect } from 'react';

export {
    BreedbaseListItem,
    normalizeListType,
    useBreedbaseLists
} from '../contexts/BreedbaseListsContext';

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
