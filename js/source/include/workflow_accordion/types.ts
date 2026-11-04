import React from 'react';

/**
 * Result returned by an `AccordionWorkflowStep` validator.
 */
export interface AccordionStepValidationResult {
    /** Whether the step passed validation. */
    valid: boolean;
    /** Reason the step failed validation. Takes precedence over `message`. */
    error?: string;
    /** Alternative failure reason, used when `error` is not provided. */
    message?: string;
}

/**
 * A single step (panel) in a `WorkflowAccordion`.
 */
export interface AccordionWorkflowStep {
    /** Unique identifier, used as the React key and in the generated DOM ids. */
    id: string;
    /** Label rendered in the step's header. */
    title: string;
    /** Body rendered inside the panel; kept mounted and hidden while collapsed. */
    content?: React.ReactNode;
    /**
     * Optional validator. Steps are evaluated in order, and the first failure
     * locks every step after it (the failing step itself stays openable so it
     * can be corrected).
     */
    validate?: () => AccordionStepValidationResult;
}

/**
 * Props for `WorkflowAccordion`.
 */
export interface WorkflowAccordionProps {
    /** DOM id for the container, also prefixed onto the panels' ids. Defaults to `'workflow_accordion'`. */
    id?: string;
    /** The steps to render, in order. */
    steps: AccordionWorkflowStep[];
    /** Highest step index that may be opened. Defaults to the value computed from `steps`. */
    maxUnlocked?: number;
    /** Message shown when a locked step's header is clicked. Defaults to the computed failure message. */
    firstFailingMessage?: string | null;
    /** Called whenever the set of open panels changes, including on mount. */
    onOpenPanelsChange?: (panels: Set<number>) => void;
    /** When provided, replaces the default header-click behavior (toggle, or alert when locked). */
    onHeaderClick?: (index: number) => void;
    /** Extra class names appended to the container. */
    className?: string;
}
