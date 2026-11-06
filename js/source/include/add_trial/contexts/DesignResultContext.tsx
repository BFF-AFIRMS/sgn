import React, { createContext, useContext, useState } from 'react';

/**
 * Lifecycle state for the design result being created by the Add Trial wizard,
 * covering its generation and persistence.
 *
 * This is request state, not form data, so it is kept out of the persisted
 * draft in `TrialFormContext` (which holds the design result itself, in
 * `formData.designResult`).
 */
export interface DesignResultContextType {
    /**
     * The trial id produced by saving the current design result, or null before
     * it has been saved.
     */
    savedTrialId: string | null;
    setSavedTrialId: (id: string | null) => void;

    /**
     * Whether a design result is currently being generated.
     */
    isGenerating: boolean;
    setIsGenerating: (val: boolean) => void;

    /**
     * Whether the current design result is currently being saved.
     */
    isSaving: boolean;
    setIsSaving: (val: boolean) => void;
}

const DesignResultContext = createContext<DesignResultContextType | undefined>(undefined);

/**
 * Provides the design result lifecycle state to the Add Trial wizard, making it
 * available to the writers in `useTrialActions` (nested inside the workflow
 * steps) and the readers in the step components and the enclosing `AddTrialApp`
 * alike.
 */
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

/**
 * Accesses the design result lifecycle state. Throws if used outside a
 * `DesignResultProvider`.
 */
export const useDesignResult = () => {
    const ctx = useContext(DesignResultContext);
    if (!ctx) throw new Error('useDesignResult must be used within DesignResultProvider');
    return ctx;
};
