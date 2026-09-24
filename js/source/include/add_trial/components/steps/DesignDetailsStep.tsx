import React, { useState, useMemo } from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { useDesignResult } from '../../contexts/DesignResultContext';
import { useTrialValidation, validateTrialInfoSync, validateDesignInfoSync } from '../../hooks/useTrialValidation';
import { useDesignGenerator } from '../../hooks/useDesignGenerator';
import { TrialInfoSection } from '../sections/TrialInfoSection';
import { DesignInfoSection } from '../sections/DesignInfoSection';
import { TrialLinkageSection } from '../sections/TrialLinkageSection';
import { FieldMapSection } from '../sections/FieldMapSection';
import { PlotNamingSection } from '../sections/PlotNamingSection';
import { useBreedbaseLists } from '../../hooks/useBreedbaseLists';
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
    const { getListElements } = useBreedbaseLists(formData.stockType === 'cross' ? 'crosses' : formData.stockType === 'family_name' ? 'family_names' : 'accessions');
    const [validationError, setValidationError] = useState<string | null>(null);

    const sections = useMemo(() => [
        {
            id: 'step_trial_info',
            title: '1. Trial Information',
            component: <TrialInfoSection />,
            validate: () => validateTrialInfoSync(formData)
        },
        {
            id: 'step_design_info',
            title: '2. Design Information',
            component: <DesignInfoSection onOpenPrepHelp={onOpenPrepHelp} />,
            validate: () => validateDesignInfoSync(formData, getListElements)
        },
        {
            id: 'step_trial_linkage',
            title: '3. Trial Linkage (Optional)',
            component: <TrialLinkageSection />
        },
        {
            id: 'step_field_map',
            title: '4. Field Map Settings',
            component: <FieldMapSection />
        },
        {
            id: 'step_plot_naming',
            title: '5. Custom Plot Naming',
            component: <PlotNamingSection />
        }
    ], [onOpenPrepHelp, formData, getListElements]);

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

        const designCheck = await validateDesignInfo(formData, getListElements);
        if (!designCheck.valid) {
            setValidationError(designCheck.error || 'Stock list validation failed.');
            alert(designCheck.error || 'Stock list validation failed.');
            return;
        }

        const { data: generated, error: genErr } = await generateDesign(formData, getListElements);
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
            className="tw:flex tw:flex-col tw:gap-4 tw:p-4"
            onInput={onLockForward}
            onChange={onLockForward}
        >
            <div className="page_title">
                <h3 className="tw:font-bold tw:text-lg">Enter trial details and design options</h3>
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
