import React, { createContext, useContext, useState, useCallback } from 'react';

export interface WizardContextType {
    currentStep: number; // 0: Intro, 1: Details, 2: Review, 3: Complete
    setCurrentStep: (step: number) => void;
    activeAccordionStep: string;
    setActiveAccordionStep: (step: string) => void;
    completedSteps: Set<number>;
    markStepComplete: (step: number) => void;
    resetStepsAfter: (step: number) => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const WizardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [activeAccordionStep, setActiveAccordionStep] = useState('step_trial_info');
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    const markStepComplete = useCallback((step: number) => {
        setCompletedSteps(prev => new Set(prev).add(step));
    }, []);

    const resetStepsAfter = useCallback((step: number) => {
        setCompletedSteps(prev => {
            const next = new Set<number>();
            prev.forEach(s => {
                if (s <= step) next.add(s);
            });
            return next;
        });
    }, []);

    return (
        <WizardContext.Provider value={{
            currentStep,
            setCurrentStep,
            activeAccordionStep,
            setActiveAccordionStep,
            completedSteps,
            markStepComplete,
            resetStepsAfter
        }}>
            {children}
        </WizardContext.Provider>
    );
};

export const useWizard = () => {
    const ctx = useContext(WizardContext);
    if (!ctx) throw new Error('useWizard must be used within WizardProvider');
    return ctx;
};
