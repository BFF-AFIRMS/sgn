import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useWizard } from '../../contexts/WizardContext';
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

interface DesignDetailsStepProps {
    onOpenPrepHelp: () => void;
}

interface AccordionPanelContentProps {
    id: string;
    isOpen: boolean;
    children: React.ReactNode;
}

const AccordionPanelContent: React.FC<AccordionPanelContentProps> = ({ id, isOpen, children }) => {
    const [isTransitioning, setIsTransitioning] = useState(false);
    const prevOpenRef = useRef(isOpen);

    useEffect(() => {
        if (prevOpenRef.current !== isOpen) {
            setIsTransitioning(true);
            prevOpenRef.current = isOpen;
        }
    }, [isOpen]);

    const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && e.propertyName === 'grid-template-rows') {
            setIsTransitioning(false);
        }
    };

    return (
        <div
            id={id}
            className={`accordion-collapse-wrapper collapse ${isOpen ? 'in' : ''}`}
            style={{
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                visibility: isOpen || isTransitioning ? 'visible' : 'hidden'
            }}
            onTransitionEnd={handleTransitionEnd}
        >
            <div
                className="accordion-collapse-inner"
                style={{ overflow: isTransitioning || !isOpen ? 'hidden' : 'visible' }}
            >
                <div className="sub_infosectioncontent">{children}</div>
            </div>
        </div>
    );
};

export const DesignDetailsStep: React.FC<DesignDetailsStepProps> = ({ onOpenPrepHelp }) => {
    const { setCurrentStep, markStepComplete } = useWizard();
    const { formData } = useTrialForm();
    const { setResult } = useDesignResult();
    const { validateTrialInfo, validateDesignInfo } = useTrialValidation();
    const { generateDesign, loading, error: generatorError } = useDesignGenerator();
    const { getListElements } = useBreedbaseLists(formData.stockType === 'cross' ? 'crosses' : formData.stockType === 'family_name' ? 'family_names' : 'accessions');
    const [validationError, setValidationError] = useState<string | null>(null);

    const sections = useMemo(() => [
        { id: 'step_trial_info', title: '1. Trial Information', component: <TrialInfoSection /> },
        { id: 'step_design_info', title: '2. Design Information', component: <DesignInfoSection onOpenPrepHelp={onOpenPrepHelp} /> },
        { id: 'step_trial_linkage', title: '3. Trial Linkage (Optional)', component: <TrialLinkageSection /> },
        { id: 'step_field_map', title: '4. Field Map Settings', component: <FieldMapSection /> },
        { id: 'step_plot_naming', title: '5. Custom Plot Naming', component: <PlotNamingSection /> }
    ], [onOpenPrepHelp]);

    // Evaluate sequential validation rules
    const firstFailing = useMemo(() => {
        const infoCheck = validateTrialInfoSync(formData);
        if (!infoCheck.valid) {
            return { index: 0, message: infoCheck.error || 'Trial information is incomplete' };
        }
        const designCheck = validateDesignInfoSync(formData, getListElements);
        if (!designCheck.valid) {
            return { index: 1, message: designCheck.error || 'Design parameters are incomplete' };
        }
        return { index: sections.length, message: null };
    }, [formData, getListElements, sections.length]);

    const maxUnlocked = firstFailing.index;
    const [openPanels, setOpenPanels] = useState<Set<number>>(new Set([0]));
    const prevMaxUnlockedRef = useRef<number>(0);

    // Auto-open newly unlocked panels & collapse newly locked panels
    useEffect(() => {
        const prevMax = prevMaxUnlockedRef.current;
        if (maxUnlocked > prevMax) {
            setOpenPanels(prev => {
                const next = new Set(prev);
                for (let j = prevMax + 1; j <= maxUnlocked && j < sections.length; j++) {
                    next.add(j);
                }
                return next;
            });
        } else if (maxUnlocked < prevMax) {
            setOpenPanels(prev => {
                const next = new Set<number>();
                prev.forEach(idx => {
                    if (idx <= maxUnlocked) next.add(idx);
                });
                return next;
            });
        }
        prevMaxUnlockedRef.current = maxUnlocked;
    }, [maxUnlocked, sections.length]);

    const handleHeaderClick = (idx: number) => {
        if (idx > maxUnlocked) {
            alert(firstFailing.message || 'Please complete preceding steps first.');
            return;
        }
        setOpenPanels(prev => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
            }
            return next;
        });
    };

    const handleContinue = async () => {
        setValidationError(null);
        if (firstFailing.index < sections.length) {
            alert(`Please resolve errors in the design steps first: ${firstFailing.message}`);
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
            markStepComplete(1);
            setCurrentStep(2);
        }
    };

    return (
        <div className="tw:flex tw:flex-col tw:gap-4 tw:p-4">
            <div className="page_title">
                <h3 className="tw:font-bold tw:text-lg">Enter trial details and design options</h3>
            </div>
            <div className="tw:text-red-500 tw:text-center">
                * Required fields
            </div>

            {validationError && (
                <div className="alert alert-danger tw:m-0">{validationError}</div>
            )}

            <div className="panel-group accordion-workflow" id="trial_design_accordion">
                {sections.map((sec, i) => {
                    const isOpen = openPanels.has(i);
                    const isLocked = i > maxUnlocked;
                    return (
                        <div
                            key={sec.id}
                            className="accordion-step-panel"
                            id={`trial_design_accordion_panel_${i}`}
                            data-step-index={i}
                        >
                            <table cellSpacing="0" cellPadding="0" className="sub_infosectionhead" summary="">
                                <tbody>
                                    <tr>
                                        <td className="sub_infosectiontitle">
                                            <a
                                                className={`collapser collapser_show ${!isOpen ? 'collapsed' : ''} ${isLocked ? 'accordion-locked' : ''}`}
                                                style={{ textDecoration: 'none', cursor: isLocked ? 'help' : 'pointer' }}
                                                onClick={() => handleHeaderClick(i)}
                                            >
                                                <span className="glyphicon glyphicon-chevron-down collapser-chevron"></span>
                                                <span className="collapser-label">{sec.title}</span>
                                            </a>
                                        </td>
                                        <td className="sub_infosectionsubtitle" role="button" tabIndex={0}>&nbsp;</td>
                                    </tr>
                                </tbody>
                            </table>
                            <AccordionPanelContent
                                id={`trial_design_accordion_collapse_${i}_content`}
                                isOpen={isOpen}
                            >
                                {sec.component}
                            </AccordionPanelContent>
                        </div>
                    );
                })}
            </div>

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
