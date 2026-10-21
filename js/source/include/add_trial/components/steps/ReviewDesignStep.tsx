import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { useDesignResult } from '../../contexts/DesignResultContext';
import { useTrialActions } from '../../hooks/useTrialActions';
import {
    extractDesignPlots,
    designPlotsToObservationUnits,
    extractConfirmedTreatments
} from '../../utils/designAdapters';
import { FieldMapContainer } from '../../../fieldmap';
import { AddTreatmentsModal } from '../../modals/AddTreatmentsModal';
import { TrialDesignInformation } from '../review/TrialDesignInformation';
import { TrialDesignLayoutTable } from '../review/TrialDesignLayoutTable';
import { Alert } from '../../../@generic';

interface ReviewDesignStepProps {
    onSuccess: () => void;
}

export const ReviewDesignStep: React.FC<ReviewDesignStepProps> = ({ onSuccess }) => {
    const { formData } = useTrialForm();
    const {
        result,
        parsedDesigns,
        selectedLocationIndex,
        setSelectedLocationIndex,
    } = useDesignResult();
    const { generate, save, isGenerating, isSaving } = useTrialActions();
    const [showTreatmentModal, setShowTreatmentModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const currentLocationName = formData.locations[selectedLocationIndex] || formData.trialName;
    const currentDesign = parsedDesigns[selectedLocationIndex] || parsedDesigns[0];

    const currentPlots = useMemo(
        () => extractDesignPlots(currentDesign),
        [currentDesign]
    );

    const currentUnits = useMemo(() => {
        return designPlotsToObservationUnits(currentPlots, currentLocationName);
    }, [currentPlots, currentLocationName]);

    const hasRestoredRef = useRef(false);
    useEffect(() => {
        if (!result && formData.trialName.trim() && !hasRestoredRef.current) {
            hasRestoredRef.current = true;
            generate(formData).then(res => {
                Alert.warnings(res.warnings);
                if (!res.ok) {
                    setErrorMessage(res.error || 'Failed to restore design layout.');
                }
            });
        }
    }, [result, formData, generate]);

    const confirmedTreatments = useMemo(() => {
        return extractConfirmedTreatments(parsedDesigns);
    }, [parsedDesigns]);

    const handleRedo = async () => {
        setErrorMessage(null);
        const res = await generate(formData);
        Alert.warnings(res.warnings);
        if (!res.ok) {
            setErrorMessage(res.error || 'Failed to regenerate layout.');
            alert(res.error || 'Failed to regenerate layout.');
        }
    };

    const handleConfirm = async () => {
        if (!result?.design_json) return;
        setErrorMessage(null);
        const res = await save(formData, result.design_json);
        if (res.ok) {
            onSuccess();
        } else {
            setErrorMessage(res.error || 'An error occurred saving the trial.');
            alert(res.error || 'An error occurred saving the trial.');
        }
    };

    return (
        <div className="tw:flex tw:flex-col tw:gap-4">
            <div id="pagetitle">
                <h3>Review the generated trial layout. Make sure to click Submit at the bottom of this page if you approve of the trial!</h3>
            </div>

            {result?.warning_message && (
                <center>
                    <div className="well">
                        <h4 className="text-warning tw:font-bold">Warning: {result.warning_message}</h4>
                    </div>
                </center>
            )}
            {errorMessage && (
                <div className="alert alert-danger tw:m-0">{errorMessage}</div>
            )}

            {formData.locations.length > 1 && (
                <div className="tw:flex tw:items-center tw:gap-3">
                    <label className="tw:font-bold tw:mr-2">Select Location Preview:</label>
                    <select
                        className="form-control tw:w-auto"
                        value={selectedLocationIndex}
                        onChange={e => setSelectedLocationIndex(parseInt(e.target.value, 10))}
                    >
                        {formData.locations.map((loc, idx) => (
                            <option key={loc} value={idx}>{loc}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="well">
                <div className="tw:flex tw:justify-center">
                    <p className="tw:text-gray-600">Check to confirm that your design looks good. If there are any problems you can redo the randomization step.</p>
                </div>
                <div className="tw:m-0">
                    <FieldMapContainer
                        mode="preview"
                        initialUnits={currentUnits}
                        trialStockType={formData.stockType}
                        trialPlotType="plot"
                        hasColAndRowNumbers={true}
                        hasSubplotEntries={formData.designType === 'splitplot'}
                        hasPlantEntries={formData.designType === 'greenhouse' || parseInt(formData.plantsPerPlot || formData.greenhouseDefaultPlants || '0', 10) > 0}
                    />
                </div>
            </div>

            <div id="trial_design_view_layout_return" className="tw:overflow-x-auto">
                <TrialDesignLayoutTable
                    plots={currentPlots}
                    stockType={formData.stockType}
                    designType={formData.designType}
                />
            </div>

            <div className="tw:flex tw:justify-center tw:gap-3 tw:my-2">
                <button
                    type="button"
                    id="redo_trial_layout_button"
                    className="btn btn-info btn-lg"
                    disabled={isGenerating || isSaving}
                    onClick={handleRedo}
                >
                    {isGenerating ? 'Regenerating...' : 'Redo Randomization'}
                </button>
                <button
                    type="button"
                    id="add_trial_treatments_button"
                    name="new_trial_add_treatments"
                    className="btn btn-default btn-lg"
                    disabled={isGenerating || isSaving}
                    onClick={() => setShowTreatmentModal(true)}
                >
                    + Add Field Treatments
                </button>
            </div>

            <hr />
            <p>
                <span className="glyphicon glyphicon-ok tw:text-green-600 tw:mr-2"></span>
                <strong>Trial Is Valid</strong><br />The following trial will be added:
            </p>
            <hr />

            <TrialDesignInformation
                formData={formData}
                plots={currentPlots}
                confirmedTreatments={confirmedTreatments}
            />

            <br />
            <div className="tw:flex tw:justify-center">
                <button
                    type="button"
                    id="new_trial_confirm_submit"
                    name="new_trial_confirm_submit"
                    className="btn btn-primary btn-lg"
                    disabled={isSaving || isGenerating}
                    onClick={handleConfirm}
                >
                    {isSaving ? 'Saving Trial...' : 'Confirm (Save Trial in Database)'}
                </button>
            </div>

            <AddTreatmentsModal
                show={showTreatmentModal}
                onClose={() => setShowTreatmentModal(false)}
            />
        </div>
    );
};
