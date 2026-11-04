import React, { createContext, useContext, useState } from 'react';

export interface DesignResultContextType {
    savedTrialId: string | null;
    setSavedTrialId: (id: string | null) => void;
    isGenerating: boolean;
    setIsGenerating: (val: boolean) => void;
    isSaving: boolean;
    setIsSaving: (val: boolean) => void;
}

const DesignResultContext = createContext<DesignResultContextType | undefined>(undefined);

export const DesignResultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [savedTrialId, setSavedTrialId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    return (
        <DesignResultContext.Provider value={{
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
