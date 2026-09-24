import React from 'react';

export interface AccordionStepValidationResult {
    valid: boolean;
    error?: string;
    message?: string;
}

export interface AccordionWorkflowStep {
    id: string;
    title: string;
    component?: React.ReactNode;
    content?: React.ReactNode;
    validate?: () => AccordionStepValidationResult;
}

export interface WorkflowAccordionProps {
    id?: string;
    steps: AccordionWorkflowStep[];
    maxUnlocked?: number;
    firstFailingMessage?: string | null;
    onOpenPanelsChange?: (panels: Set<number>) => void;
    onHeaderClick?: (index: number) => void;
    className?: string;
}
