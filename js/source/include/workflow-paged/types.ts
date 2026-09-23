import React from 'react';

export interface WorkflowPagedStep {
    id?: string;
    title: string;
    content?: React.ReactNode | (() => React.ReactNode);
}

export interface WorkflowPagedProps {
    id?: string;
    steps: WorkflowPagedStep[];
    className?: string;
    children?: React.ReactNode;
}

export interface WorkflowPagedContextType {
    currentStep: number;
    setCurrentStep: (step: number) => void;
    completedSteps: Set<number>;
    markStepComplete: (step: number) => void;
    resetStepsAfter: (step: number) => void;
    goToNextStep: () => void;
    goToPrevStep: () => void;
    isStepComplete: (step: number) => boolean;
}
