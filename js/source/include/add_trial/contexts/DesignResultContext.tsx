import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { DesignResultResponse, GeneratedDesignPlot } from '../types';
import { useTrialForm } from './TrialFormContext';

export interface DesignResultContextType {
    result: DesignResultResponse | null;
    setResult: React.Dispatch<React.SetStateAction<DesignResultResponse | null>>;
    parsedDesigns: Array<Record<string, GeneratedDesignPlot>>;
    selectedLocationIndex: number;
    setSelectedLocationIndex: (idx: number) => void;
    savedTrialId: string | null;
    setSavedTrialId: (id: string | null) => void;
    isGenerating: boolean;
    setIsGenerating: (val: boolean) => void;
    isSaving: boolean;
    setIsSaving: (val: boolean) => void;
}

const DesignResultContext = createContext<DesignResultContextType | undefined>(undefined);

export const DesignResultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { formData, setFormData } = useTrialForm();
    const result = formData.designResult ?? null;

    const setResult = useCallback((valOrFn: React.SetStateAction<DesignResultResponse | null>) => {
        setFormData(prev => ({
            ...prev,
            designResult: typeof valOrFn === 'function' ? valOrFn(prev.designResult ?? null) : valOrFn
        }));
    }, [setFormData]);

    const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
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
            result,
            setResult,
            parsedDesigns,
            selectedLocationIndex,
            setSelectedLocationIndex,
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
