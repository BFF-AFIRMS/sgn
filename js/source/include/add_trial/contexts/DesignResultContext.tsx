import React, { createContext, useContext, useState, useMemo } from 'react';
import { GeneratedDesignPlot } from '../types';
import { useTrialForm } from './TrialFormContext';

export interface DesignResultContextType {
    parsedDesigns: Array<Record<string, GeneratedDesignPlot>>;
    savedTrialId: string | null;
    setSavedTrialId: (id: string | null) => void;
    isGenerating: boolean;
    setIsGenerating: (val: boolean) => void;
    isSaving: boolean;
    setIsSaving: (val: boolean) => void;
}

const DesignResultContext = createContext<DesignResultContextType | undefined>(undefined);

export const DesignResultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { formData } = useTrialForm();
    const result = formData.designResult ?? null;

    const [savedTrialId, setSavedTrialId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const parsedDesigns = useMemo(() => {
        if (!result?.design_json) return [];
        try {
            const raw: string[] = JSON.parse(result.design_json);
            return raw.map(item => JSON.parse(item));
        } catch {
            return [];
        }
    }, [result]);

    return (
        <DesignResultContext.Provider value={{
            parsedDesigns,
            savedTrialId,
            setSavedTrialId,
            isGenerating,
            setIsGenerating,
            isSaving,
            setIsSaving
        }}>
            {children}
        </DesignResultContext.Provider>
    );
};

export const useDesignResult = () => {
    const ctx = useContext(DesignResultContext);
    if (!ctx) throw new Error('useDesignResult must be used within DesignResultProvider');
    return ctx;
};
