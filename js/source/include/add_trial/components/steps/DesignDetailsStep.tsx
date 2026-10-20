import React, { useState, useMemo, useEffect } from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { useDesignResult } from '../../contexts/DesignResultContext';
import { useTrialValidation, validateTrialInfoSync, validateDesignInfoSync, validateFieldMapInfoSync } from '../../hooks/useTrialValidation';
import { TrialInfoSection } from '../sections/TrialInfoSection';
import { DesignInfoSection } from '../sections/DesignInfoSection';
import { TrialLinkageSection } from '../sections/TrialLinkageSection';
import { FieldMapSection } from '../sections/FieldMapSection';
import { PlotNamingSection } from '../sections/PlotNamingSection';
import { WorkflowAccordion, evaluateAccordionSync } from '../../../workflow_accordion';
import { showWorkingModal, hideWorkingModal } from '../../../working_modal';

interface DesignDetailsStepProps {
    onOpenPrepHelp: () => void;
    onSuccess: () => void;
    onLockForward?: () => void;
}

export const DesignDetailsStep: React.FC<DesignDetailsStepProps> = ({ onOpenPrepHelp, onSuccess, onLockForward }) => {
    const { formData } = useTrialForm();
    const { result, generateDesign, generating, generatorError } = useDesignResult();
    const { validateTrialInfo, validateDesignInfo } = useTrialValidation();
    const [validationError, setValidationError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const sections = useMemo(() => [
        {
            id: 'step_trial_info',
            title: 'Trial Information',
            component: <TrialInfoSection />,
            validate: () => validateTrialInfoSync(formData)
        },
        {
            id: 'step_design_info',
            title: 'Design Information',
            component: <DesignInfoSection onOpenPrepHelp={onOpenPrepHelp} />,
            validate: () => validateDesignInfoSync(formData)
        },
        {
            id: 'step_trial_linkage',
            title: 'Trial Linkage',
            component: <TrialLinkageSection />
        },
        {
            id: 'step_field_map',
            title: 'Field Map Information',
            component: <FieldMapSection />,
            validate: () => validateFieldMapInfoSync(formData)
        },
        {
            id: 'step_plot_naming',
            title: 'Custom Plot Naming',
            component: <PlotNamingSection />
        }
    ], [onOpenPrepHelp, formData]);

    const evaluation = useMemo(() => evaluateAccordionSync(sections), [sections]);

    const handleContinue = async () => {
        setValidationError(null);
        if (!evaluation.valid) {
            alert(`Please resolve errors in the design steps first: ${evaluation.message}`);
            return;
        }

        showWorkingModal();
        try {
            const infoCheck = await validateTrialInfo(formData);
            if (!infoCheck.valid) {
                setValidationError(infoCheck.error || 'Trial name verification failed.');
                alert(infoCheck.error || 'Trial name verification failed.');
                return;
            }

            const designCheck = await validateDesignInfo(formData);
            if (!designCheck.valid) {
                setValidationError(designCheck.error || 'Stock list validation failed.');
                alert(designCheck.error || 'Stock list validation failed.');
                return;
            }

            setSubmitting(true);
            generateDesign(formData);
        } finally {
            hideWorkingModal();
        }
    };

    useEffect(() => {
        if (!submitting) return;

        if (generatorError) {
            setSubmitting(false);
            setValidationError(generatorError);
            alert(generatorError);
        } else if (result) {
            setSubmitting(false);
            onSuccess();
        }
    }, [submitting, result, generatorError, onSuccess]);

    return (
        <div
            className="tw:flex tw:flex-col tw:gap-4"
            onInput={onLockForward}
            onChange={onLockForward}
        >
            <div id="pagetitle">
                <h3>Enter trial details and design options</h3>
            </div>
            <div className="tw:text-red-500 tw:text-center">
                * Required fields
            </div>

            {validationError && (
                <div className="alert alert-danger tw:m-0">{validationError}</div>
            )}

            <WorkflowAccordion
                id="trial_design_accordion"
                steps={sections}
            />

            <br />
            <div className="tw:flex tw:justify-center">
                <button
                    type="button"
                    id="new_trial_submit"
                    name="create_trial_submit"
                    className="btn btn-primary btn-lg"
                    disabled={generating}
                    onClick={handleContinue}
                >
                    {generating ? 'Generating Layout...' : 'Continue to Next Step'}
                </button>
            </div>
        </div>
    );
};
