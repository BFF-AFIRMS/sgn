import { useEffect, useCallback, useRef, useState } from 'react';
import { TrialFormData } from '../types';

const MAX_DRAFTS = 10;
export const DEFAULT_DRAFT_PREFIX = 'trial_create_form_state_';

export interface DraftData<T = TrialFormData> {
    last_modified: number;
    max_step?: number;
    data: T;
}

export interface UseFormDraftOptions {
    prefix?: string;
    maxDrafts?: number;
}

export const cleanupOldDrafts = (prefix: string, maxDrafts: number = MAX_DRAFTS): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        const drafts: { key: string; lastModified: number }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                let lastModified = 0;
                try {
                    const itemStr = localStorage.getItem(key);
                    if (itemStr) {
                        const item = JSON.parse(itemStr);
                        if (item && typeof item === 'object') {
                            lastModified = Number(item.last_modified) || 0;
                        }
                    }
                } catch {
                    // Ignore malformed draft entry
                }
                drafts.push({ key, lastModified });
            }
        }
        if (drafts.length > maxDrafts) {
            drafts.sort((a, b) => b.lastModified - a.lastModified);
            for (let j = maxDrafts; j < drafts.length; j++) {
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

export const useFormDraft = (
    formData: TrialFormData,
    setFormData: React.Dispatch<React.SetStateAction<TrialFormData>>,
    options?: UseFormDraftOptions
) => {
    const draftPrefix = options?.prefix ?? DEFAULT_DRAFT_PREFIX;
    const maxDrafts = options?.maxDrafts ?? MAX_DRAFTS;
    const [draftId] = useState<string>(() => initDraftId('draft_id'));
    const [maxStep, setMaxStep] = useState<number>(0);
    const isRestoredRef = useRef(false);
    const getDraftKey = useCallback(() => `${draftPrefix}${draftId}`, [draftPrefix, draftId]);

    useEffect(() => {
        const key = getDraftKey();
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    const data = (parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
                    setFormData(prev => ({ ...prev, ...data }));
                    if (typeof parsed.max_step === 'number') {
                        setMaxStep(parsed.max_step);
                    }
                }
            }
        } catch (e) {
            console.warn('Could not restore trial creation form draft', e);
        } finally {
            isRestoredRef.current = true;
        }
    }, [getDraftKey, setFormData]);

    useEffect(() => {
        if (!isRestoredRef.current) return;
        const timeout = setTimeout(() => {
            try {
                const key = getDraftKey();
                const draftData: DraftData<TrialFormData> = {
                    last_modified: Date.now(),
                    max_step: maxStep,
                    data: formData
                };
                localStorage.setItem(key, JSON.stringify(draftData));
                cleanupOldDrafts(draftPrefix, maxDrafts);
            } catch {}
        }, 500);
        return () => clearTimeout(timeout);
    }, [formData, maxStep, draftPrefix, maxDrafts, getDraftKey]);

    const clearDraft = useCallback(() => {
        try {
            const key = getDraftKey();
            localStorage.removeItem(key);
        } catch {}
    }, [getDraftKey]);

    return { clearDraft, draftId, maxStep, setMaxStep };
};
