import React from 'react';
import { WorkflowPagedProps } from './types';
import { useWorkflowPaged } from './WorkflowPagedContext';

export const WorkflowPaged: React.FC<WorkflowPagedProps> = ({
    id = 'workflow',
    steps,
    className = ''
}) => {
    const { currentStep, setCurrentStep, completedSteps } = useWorkflowPaged();

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
            <style>{`
                ol.workflow-prog {
                    display: table;
                    table-layout: fixed;
                    list-style-type: none;
                    text-align: center;
                    margin: 0 0 1em 0;
                    padding: 0;
                    width: 100%;
                    counter-reset: step;
                    font-size: 16px;
                }
                ol.workflow-prog > li {
                    display: table-cell;
                    text-align: center;
                    color: black;
                    position: relative;
                    font-size: 11px;
                    cursor: pointer;
                }
                ol.workflow-prog > li > div.workflow-title {
                    display: inline-block;
                    width: 100%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                ol.workflow-prog > li::after {
                    font-size: 14px;
                    width: 30px;
                    height: 30px;
                    content: counter(step);
                    counter-increment: step;
                    line-height: 1em;
                    padding-top: 0.3em;
                    border: 4px solid;
                    display: block;
                    text-align: center;
                    position: relative;
                    border-radius: 50%;
                    margin: 0 auto 0 auto;
                    background: white;
                    border-color: #bbb;
                    color: #bbb;
                }
                ol.workflow-prog > li.workflow-complete::after {
                    border-color: #5fba7d;
                    color: white;
                    background: #5fba7d;
                }
                ol.workflow-prog > li.workflow-focus::after {
                    border-color: #5fba7d;
                    background: white;
                    color: #5fba7d;
                }
                ol.workflow-prog > li::before {
                    width: 100%;
                    height: 2px;
                    content: '';
                    display: block;
                    position: relative;
                    top: 34px;
                    margin-left: 50%;
                    background-color: #bbb;
                }
                ol.workflow-prog > li:last-of-type::before {
                    width: 0%;
                }
                ol.workflow-prog > li.workflow-complete::before {
                    background: #5fba7d;
                }
                ol.workflow-content {
                    display: block;
                    table-layout: fixed;
                    list-style-type: none;
                    margin: 0;
                    padding: 0;
                    width: 100%;
                }
                ol.workflow-content > li {
                    width: 100%;
                    position: relative;
                    display: none;
                }
                ol.workflow-content > li.workflow-focus {
                    display: block;
                }
            `}</style>

            <ol className="workflow-prog">
                {steps.map((s, idx) => {
                    const isFocus = currentStep === idx;
                    const isComplete = completedSteps.has(idx);
                    return (
                        <li
                            key={s.id || idx}
                            className={`${isFocus ? 'workflow-focus' : ''} ${isComplete ? 'workflow-complete' : ''}`}
                            onClick={() => handleProgClick(idx)}
                        >
                            <div className="workflow-title">{s.title}</div>
                        </li>
                    );
                })}
            </ol>

            <div className="panel panel-default">
                <div className="panel-body">
                    <ol className="workflow-content">
                        {steps.map((s, idx) => (
                            <li
                                key={s.id || idx}
                                className={currentStep === idx ? 'workflow-focus' : ''}
                            >
                                {currentStep === idx && (
                                    typeof s.content === 'function' ? s.content() : s.content
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
};
