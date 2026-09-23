import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FieldMapContainer } from './fieldmap';
import { ServerProps } from '../include/add_trial/types';
import { WorkflowPaged, WorkflowPagedProvider, useWorkflowPaged } from '../include/workflow-paged';
import { TrialFormProvider } from '../include/add_trial/contexts/TrialFormContext';
import { DesignResultProvider } from '../include/add_trial/contexts/DesignResultContext';
import { IntroStep } from '../include/add_trial/components/steps/IntroStep';
import { DesignDetailsStep } from '../include/add_trial/components/steps/DesignDetailsStep';
import { ReviewDesignStep } from '../include/add_trial/components/steps/ReviewDesignStep';
import { CompleteStep } from '../include/add_trial/components/steps/CompleteStep';
import { PartialRepHelpModal } from '../include/add_trial/modals/PartialRepHelpModal';

export const AddTrialApp: React.FC = () => {
    const { currentStep } = useWorkflowPaged();
    const [showPrepHelp, setShowPrepHelp] = useState(false);

    const steps = [
        {
            id: 'intro',
            title: 'Intro',
            content: currentStep === 0 ? <IntroStep /> : null
        },
        {
            id: 'details',
            title: 'Trial Design Details',
            content: currentStep === 1 ? <DesignDetailsStep onOpenPrepHelp={() => setShowPrepHelp(true)} /> : null
        },
        {
            id: 'review',
            title: 'Review Designed Trial',
            content: currentStep === 2 ? <ReviewDesignStep FieldMapContainer={FieldMapContainer} /> : null
        },
        {
            id: 'complete',
            title: 'Complete',
            content: currentStep === 3 ? <CompleteStep /> : null
        }
    ];

    return (
        <div className="well">
            <form className="form-horizontal" id="create_new_trial_form" name="create_new_trial_form" onSubmit={e => e.preventDefault()}>
                <style>{`
                    .form-horizontal .control-label {
                        text-align: right;
                        margin-bottom: 0;
                        padding-top: var(--padding-md);
                        padding-right: var(--padding-sm);
                    }
                `}</style>

                <WorkflowPaged
                    id="trial_design_workflow"
                    steps={steps}
                />

                <PartialRepHelpModal show={showPrepHelp} onClose={() => setShowPrepHelp(false)} />
            </form>
        </div>
    );
};

export const AddTrialContainer: React.FC<ServerProps> = (props) => {
    return (
        <WorkflowPagedProvider>
            <TrialFormProvider serverProps={props}>
                <DesignResultProvider>
                    <AddTrialApp />
                </DesignResultProvider>
            </TrialFormProvider>
        </WorkflowPagedProvider>
    );
};

export const init = (containerId: string, props: ServerProps) => {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(<AddTrialContainer {...props} />);
    }
};