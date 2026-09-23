import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FieldMapContainer } from './fieldmap';
import { ServerProps } from '../include/add_trial/types';
import { useWizard, WizardProvider } from '../include/add_trial/contexts/WizardContext';
import { TrialFormProvider } from '../include/add_trial/contexts/TrialFormContext';
import { DesignResultProvider } from '../include/add_trial/contexts/DesignResultContext';
import { IntroStep } from '../include/add_trial/components/steps/IntroStep';
import { DesignDetailsStep } from '../include/add_trial/components/steps/DesignDetailsStep';
import { ReviewDesignStep } from '../include/add_trial/components/steps/ReviewDesignStep';
import { CompleteStep } from '../include/add_trial/components/steps/CompleteStep';
import { PartialRepHelpModal } from '../include/add_trial/modals/PartialRepHelpModal';

export const AddTrialApp: React.FC = () => {
    const { currentStep, setCurrentStep, completedSteps } = useWizard();
    const [showPrepHelp, setShowPrepHelp] = useState(false);

    const steps = [
        { num: 0, title: 'Intro' },
        { num: 1, title: 'Trial Design Details' },
        { num: 2, title: 'Review Designed Trial' },
        { num: 3, title: 'Complete' }
    ];

    const handleProgClick = (stepIndex: number) => {
        if (completedSteps.has(stepIndex) || stepIndex === currentStep || (stepIndex > 0 && completedSteps.has(stepIndex - 1))) {
            setCurrentStep(stepIndex);
        }
    };

    return (
        <div id="trial_design_workflow" className="workflow">
            <div className="well">
            <form className="form-horizontal" id="create_new_trial_form" name="create_new_trial_form" onSubmit={e => e.preventDefault()}>
            <style>{`
                .form-horizontal .control-label {
                    text-align: right;
                    margin-bottom: 0;
                    padding-top: 7px;
                    padding-right: 24px;
                }
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
                .accordion-workflow .accordion-step-panel {
                    margin-bottom: 15px;
                }
                .accordion-workflow .accordion-locked {
                    opacity: 0.5;
                    cursor: help !important;
                }
                .accordion-workflow .accordion-locked * {
                    cursor: help !important;
                }
                .accordion-workflow .accordion-collapse-wrapper {
                    display: grid !important;
                    grid-template-rows: 0fr;
                    transition: grid-template-rows 0.35s ease-in-out, visibility 0.35s ease-in-out;
                    visibility: hidden;
                }
                .accordion-workflow .accordion-collapse-wrapper.in {
                    grid-template-rows: 1fr;
                    visibility: visible;
                }
                .accordion-workflow .accordion-collapse-inner {
                    overflow: hidden;
                    min-height: 0;
                }
                .collapser-chevron {
                    transition: transform 0.2s ease-in-out;
                    margin-right: 8px;
                    display: inline-block;
                }
                .collapsed .collapser-chevron {
                    transform: rotate(-90deg);
                }
            `}</style>

            <ol className="workflow-prog">
                {steps.map(s => {
                    const isFocus = currentStep === s.num;
                    const isComplete = completedSteps.has(s.num);
                    return (
                        <li
                            key={s.num}
                            className={`${isFocus ? 'workflow-focus' : ''} ${isComplete ? 'workflow-complete' : ''}`}
                            onClick={() => handleProgClick(s.num)}
                        >
                            <div className="workflow-title">{s.title}</div>
                        </li>
                    );
                })}
            </ol>

            <div className="panel panel-default">
                <div className="panel-body">
                    <ol className="workflow-content">
                        <li className={currentStep === 0 ? 'workflow-focus' : ''}>
                            {currentStep === 0 && <IntroStep />}
                        </li>
                        <li className={currentStep === 1 ? 'workflow-focus' : ''}>
                            {currentStep === 1 && <DesignDetailsStep onOpenPrepHelp={() => setShowPrepHelp(true)} />}
                        </li>
                        <li className={currentStep === 2 ? 'workflow-focus' : ''}>
                            {currentStep === 2 && <ReviewDesignStep FieldMapContainer={FieldMapContainer} />}
                        </li>
                        <li className={currentStep === 3 ? 'workflow-focus' : ''}>
                            {currentStep === 3 && <CompleteStep />}
                        </li>
                    </ol>
                </div>
            </div>

            <PartialRepHelpModal show={showPrepHelp} onClose={() => setShowPrepHelp(false)} />
            </form>
            </div>
        </div>
    );
};

export const AddTrialContainer: React.FC<ServerProps> = (props) => {
    return (
        <WizardProvider>
            <TrialFormProvider serverProps={props}>
                <DesignResultProvider>
                    <AddTrialApp />
                </DesignResultProvider>
            </TrialFormProvider>
        </WizardProvider>
    );
};

export const init = (containerId: string, props: ServerProps) => {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(<AddTrialContainer {...props} />);
    }
};