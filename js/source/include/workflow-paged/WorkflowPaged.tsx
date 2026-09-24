import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WorkflowPagedProps, WorkflowPagedStep, WorkflowPagedStepController } from './types';

export const WorkflowPaged: React.FC<WorkflowPagedProps> = ({
    id = 'workflow',
    steps,
    initialStep = 0,
    urlParam,
    onStepChange,
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
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
        const set = new Set<number>();
        for (let i = 0; i < resolvedInitialStep; i++) {
            set.add(i);
        }
        return set;
    });

    const updateUrl = useCallback((stepIndex: number) => {
        if (!paramName || typeof window === 'undefined') return;
        try {
            const url = new URL(window.location.href);
            const step = steps[stepIndex];
            const paramVal = step?.id || String(stepIndex + 1);
            if (url.searchParams.get(paramName) !== paramVal) {
                url.searchParams.set(paramName, paramVal);
                window.history.replaceState(null, '', url.toString());
            }
        } catch {}
    }, [paramName, steps]);

    const changeStep = useCallback((newStep: number) => {
        setCurrentStep(newStep);
        updateUrl(newStep);
        if (onStepChange && steps[newStep]) {
            onStepChange(newStep, steps[newStep]);
        }
    }, [updateUrl, onStepChange, steps]);

    useEffect(() => {
        if (paramName) {
            updateUrl(currentStep);
        }
    }, [paramName, currentStep, updateUrl]);

    useEffect(() => {
        if (!paramName || typeof window === 'undefined') return;
        const handlePopState = () => {
            const stepFromUrl = resolveStepFromUrl();
            setCurrentStep(stepFromUrl);
            setCompletedSteps(prev => {
                const nextSet = new Set(prev);
                for (let i = 0; i < stepFromUrl; i++) {
                    nextSet.add(i);
                }
                return nextSet;
            });
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [paramName, resolveStepFromUrl]);

    const next = () => {
        setCompletedSteps(prev => new Set(prev).add(currentStep));
        const nextStep = Math.min(currentStep + 1, steps.length - 1);
        changeStep(nextStep);
    };

    const prev = () => {
        const prevStep = Math.max(currentStep - 1, 0);
        changeStep(prevStep);
    };

    const goTo = (step: number) => {
        if (step >= 0 && step < steps.length) {
            changeStep(step);
        }
    };

    const completeStep = (step: number = currentStep) => {
        setCompletedSteps(p => new Set(p).add(step));
    };

    const controller: WorkflowPagedStepController = {
        next,
        prev,
        goTo,
        completeStep
    };

    const handleProgClick = (stepIndex: number) => {
        if (
            completedSteps.has(stepIndex) ||
            stepIndex === currentStep ||
            (stepIndex > 0 && completedSteps.has(stepIndex - 1))
        ) {
            changeStep(stepIndex);
        }
    };

    return (
        <div id={id} className={`workflow ${className}`}>
            <ol className="workflow-prog tw:table tw:table-fixed tw:list-none tw:text-center tw:m-0 tw:mb-[1em] tw:p-0 tw:w-full tw:text-[16px]">
                {steps.map((s, idx) => {
                    const isFocus = currentStep === idx;
                    const isComplete = completedSteps.has(idx);
                    return (
                        <li
                            key={s.id || idx}
                            className={`tw:table-cell tw:text-center tw:text-black tw:relative tw:text-[11px] tw:cursor-pointer ${
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
                                        className={`tw:absolute tw:left-1/2 tw:w-full tw:h-[2px] ${
                                            isComplete ? 'tw:bg-[#5fba7d]' : 'tw:bg-[#bbb]'
                                        }`}
                                    />
                                )}
                                <div
                                    className={`tw:relative tw:z-10 tw:flex tw:items-center tw:justify-center tw:w-[30px] tw:h-[30px] tw:rounded-full tw:border-4 tw:border-solid tw:text-[14px] tw:leading-none ${
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
                                    typeof s.content === 'function' ? s.content(controller) : s.content
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
};
