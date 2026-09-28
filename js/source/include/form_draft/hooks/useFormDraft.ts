import { useEffect, useCallback, useState, useMemo } from 'react';
import { DraftData } from '../types';

const MAX_DRAFTS = 10;
const DRAFT_PREFIX = 'form_draft';

const isFormDraft = (obj: any): obj is DraftData => {
    return obj && typeof obj === 'object' && 'last_modified' in obj && 'max_step' in obj && 'data' in obj;
};

const isFunction = <T>(value: T | (() => T)): value is (() => T) => {
    return typeof value === 'function';
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
    if (typeof window === 'undefined') return '';
    try {
        const url = new URL(window.location.href);
        let id = url.searchParams.get(paramName);
        if (!id) {
            id = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            url.searchParams.set(paramName, id);
            window.history.replaceState(null, '', url.toString());
        }
        return id;
    } catch {
        return Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    }
};

export const useFormDraft = <T>(
    initialValues: T | (() => T)
) => {
    const [draftId] = useState<string>(() => initDraftId('draft_id'));
    const draftKey = useMemo(() => `${DRAFT_PREFIX}${draftId}`, [draftId]);

    const savedDraft = useMemo(() => {
        if (typeof window === 'undefined' || !window.localStorage) return null;
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

    useEffect(() => {
        try {
            const draftData: DraftData<T> = {
                last_modified: Date.now(),
                max_step: maxStep,
                data: formData
            };
            localStorage.setItem(draftKey, JSON.stringify(draftData));
            cleanupOldDrafts();
        } catch {}
    }, [formData, maxStep, draftKey]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(draftKey);
        } catch {}
    }, [draftKey]);

    return { formData, setFormData, clearDraft, draftId, maxStep, setMaxStep };
};
