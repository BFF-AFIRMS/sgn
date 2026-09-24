import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WorkflowPagedProps, WorkflowPagedStep, WorkflowPagedStepController } from '../types';

export const WorkflowPaged: React.FC<WorkflowPagedProps> = ({
    id = 'workflow',
    steps,
    initialStep = 0,
    urlParam,
    onStepChange,
    maxStep: controlledMaxStep,
    onMaxStepChange,
    className = ''
}) => {
    const paramName = typeof urlParam === 'string' ? urlParam : urlParam ? 'step' : null;

    const resolveStepFromUrl = useCallback((): number => {
        if (!paramName || typeof window === 'undefined') return initialStep;
        try {
            const val = new URLSearchParams(window.location.search).get(paramName);
            if (val) {
                const idxById = steps.findIndex(s => s.id && s.id.toLowerCase() === val.toLowerCase());
                if (idxById !== -1) return idxById;

                const num = parseInt(val, 10);
                if (!isNaN(num) && num >= 1 && num <= steps.length) {
                    return num - 1;
                }
            }
        } catch {}
        return initialStep;
    }, [paramName, steps, initialStep]);

    const resolvedInitialStep = useMemo(() => resolveStepFromUrl(), [resolveStepFromUrl]);

    const [currentStep, setCurrentStep] = useState<number>(resolvedInitialStep);
    const [internalMaxStep, setInternalMaxStep] = useState<number>(resolvedInitialStep);
    const isControlledMaxStep = controlledMaxStep !== undefined;
    const currentMaxStep = isControlledMaxStep ? controlledMaxStep : internalMaxStep;

    const updateMaxStep = useCallback((newMax: number) => {
        if (!isControlledMaxStep) {
            setInternalMaxStep(newMax);
        }
        if (onMaxStepChange) {
            onMaxStepChange(newMax);
        }
    }, [isControlledMaxStep, onMaxStepChange]);

    const updateUrl = useCallback((stepIndex: number, replace: boolean = true) => {
        if (!paramName || typeof window === 'undefined') return;
        try {
            const url = new URL(window.location.href);
            const step = steps[stepIndex];
            const paramVal = step?.id || String(stepIndex + 1);
            if (url.searchParams.get(paramName) !== paramVal) {
                url.searchParams.set(paramName, paramVal);
                if (replace) {
                    window.history.replaceState(null, '', url.toString());
                } else {
                    window.history.pushState(null, '', url.toString());
                }
            }
        } catch {}
    }, [paramName, steps]);

    const changeStep = useCallback((newStep: number, replace: boolean = false) => {
        setCurrentStep(newStep);
        updateUrl(newStep, replace);
        if (onStepChange && steps[newStep]) {
            onStepChange(newStep, steps[newStep]);
        }
    }, [updateUrl, onStepChange, steps]);

    useEffect(() => {
        if (currentStep > currentMaxStep) {
            changeStep(currentMaxStep, true);
        }
    }, [currentStep, currentMaxStep, changeStep]);

    useEffect(() => {
        if (paramName) {
            updateUrl(currentStep, true);
        }
    }, [paramName, currentStep, updateUrl]);

    useEffect(() => {
        if (!paramName || typeof window === 'undefined') return;
        const handlePopState = () => {
            const stepFromUrl = resolveStepFromUrl();
            const targetStep = Math.min(stepFromUrl, currentMaxStep);
            setCurrentStep(targetStep);
            updateUrl(targetStep, true);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [paramName, resolveStepFromUrl, currentMaxStep, updateUrl]);

    const getController = useCallback((stepIdx: number): WorkflowPagedStepController => ({
        next: () => {
            const nextStep = Math.min(stepIdx + 1, steps.length - 1);
            updateMaxStep(Math.max(currentMaxStep, nextStep));
            changeStep(nextStep, false);
        },
        prev: () => {
            const prevStep = Math.max(stepIdx - 1, 0);
            changeStep(prevStep, false);
        },
        goTo: (step: number) => {
            if (step >= 0 && step <= currentMaxStep && step < steps.length) {
                changeStep(step, false);
            }
        },
        completeStep: (step?: number) => {
            const target = step ?? stepIdx;
            updateMaxStep(Math.max(currentMaxStep, target + 1));
        },
        lockForward: () => {
            updateMaxStep(stepIdx);
        }
    }), [steps.length, currentMaxStep, updateMaxStep, changeStep]);

    const isStepAccessible = (stepIndex: number) => {
        return stepIndex <= currentMaxStep;
    };

    const handleProgClick = (stepIndex: number) => {
        if (isStepAccessible(stepIndex)) {
            changeStep(stepIndex, false);
        }
    };

    return (
        <div id={id} className={`workflow ${className}`}>
            <ol className="workflow-prog tw:table tw:table-fixed tw:list-none tw:text-center tw:m-0 tw:mb-[1em] tw:p-0 tw:w-full tw:text-[16px]">
                {steps.map((s, idx) => {
                    const isFocus = currentStep === idx;
                    const isComplete = idx < currentMaxStep;
                    const isAccessible = isStepAccessible(idx);
                    return (
                        <li
                            key={s.id || idx}
                            className={`tw:table-cell tw:text-center tw:text-black tw:relative tw:text-[11px] ${
                                isAccessible ? 'tw:cursor-pointer' : 'tw:cursor-not-allowed tw:opacity-60'
                            } ${
                                isFocus ? 'workflow-focus' : ''
                            } ${isComplete ? 'workflow-complete' : ''}`}
                            onClick={() => handleProgClick(idx)}
                        >
                            <div className="workflow-title tw:inline-block tw:w-full tw:whitespace-nowrap tw:overflow-hidden tw:text-ellipsis">
                                {s.title}
                            </div>
                            <div className="tw:relative tw:flex tw:items-center tw:justify-center">
                                {idx < steps.length - 1 && (
                                    <div
                                        className={`tw:absolute tw:left-1/2 tw:w-full tw:h-0.5 ${
                                            idx < currentMaxStep ? 'tw:bg-[#5fba7d]' : 'tw:bg-[#bbb]'
                                        }`}
                                    />
                                )}
                                <div
                                    className={`tw:relative tw:z-10 tw:flex tw:items-center tw:justify-center tw:w-7.5 tw:h-7.5 tw:rounded-full tw:border-4 tw:border-solid tw:text-[14px] tw:leading-none ${
                                        isComplete
                                            ? 'tw:border-[#5fba7d] tw:bg-[#5fba7d] tw:text-white'
                                            : isFocus
                                                ? 'tw:border-[#5fba7d] tw:bg-white tw:text-[#5fba7d]'
                                                : 'tw:border-[#bbb] tw:bg-white tw:text-[#bbb]'
                                    }`}
                                >
                                    {idx + 1}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>

            <div className="panel panel-default">
                <div className="panel-body">
                    <ol className="workflow-content tw:block tw:table-fixed tw:list-none tw:m-0 tw:p-0 tw:w-full">
                        {steps.map((s, idx) => (
                            <li
                                key={s.id || idx}
                                className={`tw:w-full tw:relative ${currentStep === idx ? 'workflow-focus tw:block' : 'tw:hidden'}`}
                            >
                                {currentStep === idx && (
                                    typeof s.content === 'function' ? s.content(getController(idx)) : s.content
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
};
