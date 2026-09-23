import React, { createContext, useContext, useState, useCallback } from 'react';
import { WorkflowPagedContextType } from './types';

const WorkflowPagedContext = createContext<WorkflowPagedContextType | undefined>(undefined);

export interface WorkflowPagedProviderProps {
    initialStep?: number;
    currentStep?: number;
    onStepChange?: (step: number) => void;
    completedSteps?: Set<number>;
    children: React.ReactNode;
}

export const WorkflowPagedProvider: React.FC<WorkflowPagedProviderProps> = ({
    initialStep = 0,
    currentStep: controlledStep,
    onStepChange,
    completedSteps: controlledCompletedSteps,
    children
}) => {
    const [uncontrolledStep, setUncontrolledStep] = useState(initialStep);
    const [uncontrolledCompleted, setUncontrolledCompleted] = useState<Set<number>>(new Set());

    const isControlledStep = controlledStep !== undefined;
    const currentStep = isControlledStep ? controlledStep : uncontrolledStep;

    const completedSteps = controlledCompletedSteps !== undefined
        ? controlledCompletedSteps
        : uncontrolledCompleted;

    const setCurrentStep = useCallback((step: number) => {
        if (!isControlledStep) {
            setUncontrolledStep(step);
        }
        if (onStepChange) {
            onStepChange(step);
        }
    }, [isControlledStep, onStepChange]);

    const markStepComplete = useCallback((step: number) => {
        setUncontrolledCompleted(prev => new Set(prev).add(step));
    }, []);

    const resetStepsAfter = useCallback((step: number) => {
        setUncontrolledCompleted(prev => {
            const next = new Set<number>();
            prev.forEach(s => {
                if (s <= step) next.add(s);
            });
            return next;
        });
    }, []);

    const goToNextStep = useCallback(() => {
        setCurrentStep(currentStep + 1);
    }, [currentStep, setCurrentStep]);

    const goToPrevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    }, [currentStep, setCurrentStep]);

    const isStepComplete = useCallback((step: number) => {
        return completedSteps.has(step);
    }, [completedSteps]);

    return (
        <WorkflowPagedContext.Provider value={{
            currentStep,
            setCurrentStep,
            completedSteps,
            markStepComplete,
            resetStepsAfter,
            goToNextStep,
            goToPrevStep,
            isStepComplete
        }}>
            {children}
        </WorkflowPagedContext.Provider>
    );
};

export const useWorkflowPaged = () => {
    const ctx = useContext(WorkflowPagedContext);
    if (!ctx) {
        throw new Error('useWorkflowPaged must be used within a WorkflowPagedProvider');
    }
    return ctx;
};
