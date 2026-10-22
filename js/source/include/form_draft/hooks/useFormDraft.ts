import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { DraftData } from '../types';
import { isFunction } from '~/@generic/utils/functions';

const MAX_DRAFTS = 10;
const DRAFT_PREFIX = 'form_draft';

const isFormDraft = (obj: unknown): obj is DraftData => {
    return typeof obj === 'object' &&
        obj !== null &&
        'last_modified' in obj &&
        'max_step' in obj &&
        'data' in obj;
};

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

export const useFormDraft = <T>(
    initialValues: T | (() => T),
    debounceMs: number = 300
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

    const pendingDataRef = useRef<DraftData<T> | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clean up older drafts once on initialization rather than on every state change
    useEffect(() => {
        cleanupOldDrafts();
    }, []);

    const flushDraft = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (pendingDataRef.current) {
            try {
                localStorage.setItem(draftKey, JSON.stringify(pendingDataRef.current));
            } catch (e) {
                console.warn('Could not save form draft to localStorage', e);
            }
            pendingDataRef.current = null;
        }
    }, [draftKey]);

    useEffect(() => {
        pendingDataRef.current = {
            last_modified: Date.now(),
            max_step: maxStep,
            data: formData
        };

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            flushDraft();
        }, debounceMs);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [formData, maxStep, debounceMs, flushDraft]);

    // Flush any pending write before the page unloads or the component unmounts
    useEffect(() => {
        const handleBeforeUnload = () => {
            flushDraft();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            flushDraft();
        };
    }, [flushDraft]);

    const clearDraft = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        pendingDataRef.current = null;
        try {
            localStorage.removeItem(draftKey);
        } catch {}
    }, [draftKey]);

    return { formData, setFormData, clearDraft, draftId, maxStep, setMaxStep };
};
