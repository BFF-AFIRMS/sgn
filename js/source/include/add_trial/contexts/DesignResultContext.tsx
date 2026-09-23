import React, { createContext, useContext, useState } from 'react';
import { DesignResultResponse, GeneratedDesignPlot } from '../types';

export interface DesignResultContextType {
    result: DesignResultResponse | null;
    setResult: (res: DesignResultResponse | null) => void;
    parsedDesigns: Array<Record<string, GeneratedDesignPlot>>;
    selectedLocationIndex: number;
    setSelectedLocationIndex: (idx: number) => void;
    savedTrialId: string | null;
    setSavedTrialId: (id: string | null) => void;
}

const DesignResultContext = createContext<DesignResultContextType | undefined>(undefined);

export const DesignResultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [result, setResult] = useState<DesignResultResponse | null>(null);
    const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
    const [savedTrialId, setSavedTrialId] = useState<string | null>(null);

    const parsedDesigns = React.useMemo(() => {
        if (!result?.design_json) return [];
        try {
            const raw = JSON.parse(result.design_json);
            if (Array.isArray(raw)) {
                return raw.map(item => (typeof item === 'string' ? JSON.parse(item) : item));
            }
            return [raw];
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
