import React from 'react';

export interface WorkflowPagedStepController {
    next: () => void;
    prev: () => void;
    goTo: (step: number) => void;
    completeStep: (step?: number) => void;
}

export interface WorkflowPagedStep {
    id?: string;
    title: string;
    content?: React.ReactNode | ((controller: WorkflowPagedStepController) => React.ReactNode);
}

export interface WorkflowPagedProps {
    id?: string;
    steps: WorkflowPagedStep[];
    initialStep?: number;
    urlParam?: string | boolean;
    onStepChange?: (stepIndex: number, step: WorkflowPagedStep) => void;
    className?: string;
    children?: React.ReactNode;
}
