import React from 'react';

/**
 * Navigation handle passed to a step whose `content` is a function, letting the
 * step drive the wizard (advance, go back, jump, or mark progress).
 */
export interface WorkflowPagedStepController {
    /** Advances to the next step, raising the highest reached step to match. */
    next: () => void;
    /** Returns to the previous step. */
    prev: () => void;
    /** Jumps to `step` if it is within range and already reachable. */
    goTo: (step: number) => void;
    /** Marks `step` (default: the current step) complete, unlocking the step after it. */
    completeStep: (step?: number) => void;
    /** Prevents navigation past the current step, e.g. once an edit invalidates later steps. */
    lockForward: () => void;
}

/** A single step (screen) in a `WorkflowPaged`. */
export interface WorkflowPagedStep {
    /** Optional identifier, used as the React key and as the `urlParam` value. */
    id?: string;
    /** Label rendered in the progress bar. */
    title: string;
    /**
     * Body rendered for the active step. Either a plain node, or a function that
     * receives the step's `WorkflowPagedStepController`.
     */
    content?: React.ReactNode | ((controller: WorkflowPagedStepController) => React.ReactNode);
}

/** Props for `WorkflowPaged`. */
export interface WorkflowPagedProps {
    /** DOM id for the container. Defaults to `'workflow'`. */
    id?: string;
    /** The steps to render, in order. */
    steps: WorkflowPagedStep[];
    /** Step index to start on. Defaults to `0`. */
    initialStep?: number;
    /**
     * When set, the active step is mirrored into this URL query parameter
     * (`true` → `'step'`, or the given string).
     */
    urlParam?: string | boolean;
    /** Called when the active step changes, with its index and step. */
    onStepChange?: (stepIndex: number, step: WorkflowPagedStep) => void;
    /** Highest step index that may be reached. When omitted, it is tracked internally. */
    maxStep?: number;
    /** Called when the highest step reached changes. */
    onMaxStepChange?: (maxStep: number) => void;
    /** Extra class names appended to the container. */
    className?: string;
}
