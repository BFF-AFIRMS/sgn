import React, { useState, useMemo } from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { useDesignResult } from '../../contexts/DesignResultContext';
import { useTrialValidation, validateTrialInfoSync, validateDesignInfoSync, validateFieldMapInfoSync } from '../../hooks/useTrialValidation';
import { useDesignGenerator } from '../../hooks/useDesignGenerator';
import { TrialInfoSection } from '../sections/TrialInfoSection';
import { DesignInfoSection } from '../sections/DesignInfoSection';
import { TrialLinkageSection } from '../sections/TrialLinkageSection';
import { FieldMapSection } from '../sections/FieldMapSection';
import { PlotNamingSection } from '../sections/PlotNamingSection';
import { WorkflowAccordion, evaluateAccordionSync } from '../../../workflow_accordion';

interface DesignDetailsStepProps {
    onOpenPrepHelp: () => void;
    onSuccess: () => void;
    onLockForward?: () => void;
}

export const DesignDetailsStep: React.FC<DesignDetailsStepProps> = ({ onOpenPrepHelp, onSuccess, onLockForward }) => {
    const { formData } = useTrialForm();
    const { setResult } = useDesignResult();
    const { validateTrialInfo, validateDesignInfo } = useTrialValidation();
    const { generateDesign, loading } = useDesignGenerator();
    const [validationError, setValidationError] = useState<string | null>(null);

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

        const { data: generated, error: genErr } = await generateDesign(formData);
        if (genErr) {
            setValidationError(genErr);
            alert(genErr);
            return;
        }
        if (generated) {
            setResult(generated);
            onSuccess();
        }
    };

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
                    disabled={loading}
                    onClick={handleContinue}
                >
                    {loading ? 'Generating Layout...' : 'Continue to Next Step'}
                </button>
            </div>
        </div>
    );
};
