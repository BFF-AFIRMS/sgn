/**
 * Lifecycle state for the design result being created by the Add Trial wizard.
 *
 * Tracks the design result through its generation and persistence:
 *
 * - `isGenerating`: a design result is currently being generated;
 * - `isSaving`: the current design result is being saved;
 * - `savedTrialId`: the trial id produced by saving the design result.
 *
 * This is request state, not form data, so it is kept out of the persisted
 * draft in `TrialFormContext` (which holds the design result itself, in
 * `formData.designResult`). The writers live in `useTrialActions`, nested
 * inside the workflow steps, while the readers span the step components and the
 * enclosing `AddTrialApp`; lifting the state to a shared context makes it
 * available to all of them.
 */

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
