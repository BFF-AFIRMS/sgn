import { useEffect, useCallback, useState, useMemo } from 'react';
import { DraftData } from '../types';
import { isFunction } from '~/@generic/utils/functions';

/** Maximum number of drafts to keep in localStorage before pruning the oldest. */
const MAX_DRAFTS = 10;

/** Prefix for the localStorage keys under which drafts are stored. */
const DRAFT_PREFIX = 'form_draft';

/**
 * Type guard narrowing an unknown value to a persisted `DraftData` object by
 * checking for its required keys.
 *
 * @param obj The parsed localStorage value to check.
 * @returns True if the value has the `DraftData` shape, otherwise false.
 */
const isFormDraft = (obj: unknown): obj is DraftData => {
    return typeof obj === 'object' &&
        obj !== null &&
        'last_modified' in obj &&
        'max_step' in obj &&
        'data' in obj;
};

/**
 * Removes the oldest form drafts from localStorage, keeping at most
 * `MAX_DRAFTS`. Drafts are ordered by their `last_modified` timestamp, and any
 * unreadable entry is treated as having no timestamp. Does nothing when
 * localStorage is unavailable.
 */
export const cleanupOldDrafts = (): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        const drafts: { key: string; lastModified: number }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(DRAFT_PREFIX)) {
                let lastModified = 0;
                try {
                    const itemStr = localStorage.getItem(key);
                    if (itemStr) {
                        const item = JSON.parse(itemStr);
                        if (isFormDraft(item)) {
                            lastModified = item.last_modified;
                        }
                    }
                } catch {
                    // Ignore malformed draft entry
                }
                drafts.push({ key, lastModified });
            }
        }
        if (drafts.length > MAX_DRAFTS) {
            drafts.sort((a, b) => b.lastModified - a.lastModified);
            for (let j = MAX_DRAFTS; j < drafts.length; j++) {
                localStorage.removeItem(drafts[j].key);
            }
        }
    } catch (e) {
        console.warn('Error cleaning up old form drafts:', e);
    }
};

/**
 * Resolves the draft id from the URL query parameter, generating and writing a
 * new one when the parameter is absent.
 *
 * @param paramName The query parameter holding the draft id. Defaults to `'draft_id'`.
 * @returns The draft id from the URL, or a newly generated one.
 */
export const initDraftId = (paramName: string = 'draft_id'): string => {
    const createNewId = () =>
        Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    try {
        const url = new URL(window.location.href);
        const id = url.searchParams.get(paramName);
        if (id) {
            return id;
        }

        const newId = createNewId();
        url.searchParams.set(paramName, newId);
        window.history.replaceState(null, '', url.toString());
        return newId;
    } catch {
        return createNewId();
    }
};

/**
 * Persists a form's values and workflow step to localStorage under a draft id,
 * restoring them on initialization so an in-progress form survives a reload.
 *
 * The draft id is read from the URL (`draft_id`), so it is stable across
 * reloads. Restored values are merged over `initialValues`, which lets callers
 * supply defaults for fields a stored draft predates.
 *
 * @param initialValues The default form values, or a function returning them.
 * @returns The form data and its setter, a `clearDraft` function to remove the
 *   persisted draft, the `draftId`, and the highest step reached with its setter.
 */
export const useFormDraft = <T>(
    initialValues: T | (() => T)
) => {
    const [draftId] = useState<string>(() => initDraftId('draft_id'));
    const draftKey = useMemo(() => `${DRAFT_PREFIX}${draftId}`, [draftId]);

    const savedDraft = useMemo(() => {
        try {
            const saved = localStorage.getItem(draftKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (isFormDraft(parsed)) {
                    return parsed as DraftData<T>;
                }
            }
        } catch (e) {
            console.warn('Could not restore form draft from localStorage', e);
        }
        return null;
    }, [draftKey]);

    const [formData, setFormData] = useState<T>(() => {
        const defaults = isFunction(initialValues) ? initialValues() : initialValues;
        if (savedDraft?.data && typeof savedDraft.data === 'object') {
            return { ...defaults, ...savedDraft.data };
        }
        return defaults;
    });

    const [maxStep, setMaxStep] = useState<number>(() => {
        return typeof savedDraft?.max_step === 'number' ? savedDraft.max_step : 0;
    });

    // Clean up older drafts once on initialization rather than on every state change
    useEffect(() => {
        cleanupOldDrafts();
    }, []);

    useEffect(() => {
        try {
            const draft: DraftData<T> = {
                last_modified: Date.now(),
                max_step: maxStep,
                data: formData
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch (e) {
            console.warn('Could not save form draft to localStorage', e);
        }
    }, [formData, maxStep, draftKey]);

    return { formData, setFormData, draftId, maxStep, setMaxStep };
};
