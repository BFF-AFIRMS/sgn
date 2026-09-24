import React from 'react';

export interface WorkflowPagedStepHelpers {
    next: () => void;
    prev: () => void;
    goTo: (step: number) => void;
    completeStep: (step?: number) => void;
}

export interface WorkflowPagedStep {
    id?: string;
    title: string;
    content?: React.ReactNode | ((helpers: WorkflowPagedStepHelpers) => React.ReactNode);
}

export interface WorkflowPagedProps {
    id?: string;
    steps: WorkflowPagedStep[];
    initialStep?: number;
    className?: string;
    children?: React.ReactNode;
}
