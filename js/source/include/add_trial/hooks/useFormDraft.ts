import { useEffect, useCallback } from 'react';
import { TrialFormData } from '../types';

const DRAFT_KEY = 'trial_create_form_draft_v1';

export const useFormDraft = (
    formData: TrialFormData,
    setFormData: React.Dispatch<React.SetStateAction<TrialFormData>>
) => {
    // Restore draft on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    setFormData(prev => ({ ...prev, ...parsed }));
                }
            }
        } catch (e) {
            console.warn('Could not restore trial creation form draft', e);
        }
    }, []);

    // Auto-save on change
    useEffect(() => {
        const timeout = setTimeout(() => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
            } catch {}
        }, 500);
        return () => clearTimeout(timeout);
    }, [formData]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch {}
    }, []);

    return { clearDraft };
};
