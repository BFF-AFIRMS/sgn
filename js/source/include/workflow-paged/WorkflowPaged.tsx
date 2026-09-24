import React, { useState } from 'react';
import { WorkflowPagedProps, WorkflowPagedStepController } from './types';

export const WorkflowPaged: React.FC<WorkflowPagedProps> = ({
    id = 'workflow',
    steps,
    initialStep = 0,
    className = ''
}) => {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    const next = () => {
        setCompletedSteps(prev => new Set(prev).add(currentStep));
        setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    };

    const prev = () => {
        setCurrentStep(p => Math.max(p - 1, 0));
    };

    const goTo = (step: number) => {
        if (step >= 0 && step < steps.length) {
            setCurrentStep(step);
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
            setCurrentStep(stepIndex);
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
