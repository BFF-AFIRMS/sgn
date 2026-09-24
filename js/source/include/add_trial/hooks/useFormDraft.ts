import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { TrialFormData } from '../types';

const MAX_DRAFTS = 10;
const DRAFT_PREFIX = 'form_draft';

export interface DraftData<T = TrialFormData> {
    last_modified: number;
    max_step?: number;
    data: T;
}

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

export const useFormDraft = (
    formData: TrialFormData,
    setFormData: React.Dispatch<React.SetStateAction<TrialFormData>>
) => {
    const [draftId] = useState<string>(() => initDraftId('draft_id'));
    const [maxStep, setMaxStep] = useState<number>(0);
    const isRestoredRef = useRef(false);

    const draftKey = useMemo(() => `${DRAFT_PREFIX}${draftId}`, [draftId]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(draftKey);
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
    }, [draftKey, setFormData]);

    useEffect(() => {
        if (!isRestoredRef.current) return;
        const timeout = setTimeout(() => {
            try {
                const draftData: DraftData<TrialFormData> = {
                    last_modified: Date.now(),
                    max_step: maxStep,
                    data: formData
                };
                localStorage.setItem(draftKey, JSON.stringify(draftData));
                cleanupOldDrafts();
            } catch {}
        }, 500);
        return () => clearTimeout(timeout);
    }, [formData, maxStep, draftKey]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(draftKey);
        } catch {}
    }, [draftKey]);

    return { clearDraft, draftId, maxStep, setMaxStep };
};
