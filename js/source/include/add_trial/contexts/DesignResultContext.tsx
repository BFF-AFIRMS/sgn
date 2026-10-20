import React, { createContext, useContext, useState, useMemo } from 'react';
import { DesignResultResponse, GeneratedDesignPlot, TrialFormData } from '../types';
import { useDesignGenerator } from '../hooks/useDesignGenerator';

export interface DesignResultContextType {
    result: DesignResultResponse | null;
    setResult: React.Dispatch<React.SetStateAction<DesignResultResponse | null>>;
    generateDesign: (form: TrialFormData) => void;
    generating: boolean;
    generatorError: string | null;
    parsedDesigns: Array<Record<string, GeneratedDesignPlot>>;
    selectedLocationIndex: number;
    setSelectedLocationIndex: (idx: number) => void;
    savedTrialId: string | null;
    setSavedTrialId: (id: string | null) => void;
}

const DesignResultContext = createContext<DesignResultContextType | undefined>(undefined);

export const DesignResultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: result, setData: setResult, generateDesign, loading: generating, error: generatorError } = useDesignGenerator();
    const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
    const [savedTrialId, setSavedTrialId] = useState<string | null>(null);

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
            generateDesign,
            generating,
            generatorError,
            parsedDesigns,
            selectedLocationIndex,
            setSelectedLocationIndex,
            savedTrialId,
            setSavedTrialId
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
