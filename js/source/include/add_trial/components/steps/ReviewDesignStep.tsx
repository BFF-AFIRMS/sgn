import React, { useMemo, useEffect, useState } from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { useDesignResult } from '../../contexts/DesignResultContext';
import { useDesignGenerator } from '../../hooks/useDesignGenerator';
import { useTrialSaver } from '../../hooks/useTrialSaver';
import { designMapToObservationUnits } from '../../utils/designAdapters';
import { FieldMapContainer } from '../../../fieldmap';
import { AddTreatmentsModal } from '../../modals/AddTreatmentsModal';
import { TrialDesignInformation } from '../review/TrialDesignInformation';
import { TrialDesignLayoutTable } from '../review/TrialDesignLayoutTable';
import { GeneratedDesignPlot, FieldTrialTreatment } from '../../types';

interface ReviewDesignStepProps {
    onSuccess: () => void;
}

export const ReviewDesignStep: React.FC<ReviewDesignStepProps> = ({ onSuccess }) => {
    const { formData, clearDraft } = useTrialForm();
    const {
        result,
        setResult,
        parsedDesigns,
        selectedLocationIndex,
        setSelectedLocationIndex,
        setSavedTrialId
    } = useDesignResult();
    const { generateDesign, loading: regenerating, error: regenError } = useDesignGenerator();
    const { saveTrial, saving, error: saveError } = useTrialSaver();
    const [showTreatmentModal, setShowTreatmentModal] = useState(false);

    const currentDesign = parsedDesigns[selectedLocationIndex] || parsedDesigns[0] || {};
    const currentUnits = useMemo(() => {
        const locName = formData.locations[selectedLocationIndex] || formData.trialName;
        return designMapToObservationUnits(currentDesign, locName);
    }, [currentDesign, selectedLocationIndex, formData.locations, formData.trialName]);

    const currentPlots = useMemo(() => {
        return Object.entries(currentDesign)
            .filter(([key, plot]) => key !== 'treatments' && plot && typeof plot === 'object' && (plot.plot_name || plot.plot_number !== undefined))
            .map(([_, plot]) => plot as GeneratedDesignPlot);
    }, [currentDesign]);

    useEffect(() => {
        if (!result && !regenerating && formData.trialName.trim()) {
            generateDesign(formData).then(({ data }) => {
                if (data) {
                    setResult(data);
                }
            });
        }
    }, [result, regenerating, formData, generateDesign, setResult]);

    const confirmedTreatments = useMemo(() => {
        if (!result?.design_json) return [];
        try {
            const raw = JSON.parse(result.design_json);
            const designArray = Array.isArray(raw) ? raw : [raw];
            const list: Array<{ name: string; type?: string; stocks: string[] }> = [];
            const seen = new Map<string, { type?: string; stocks: Set<string> }>();

            for (let i = 0; i < designArray.length; i++) {
                const dh = typeof designArray[i] === 'string' ? JSON.parse(designArray[i] as string) : designArray[i];
                const treatments = dh?.treatments as Record<string, FieldTrialTreatment> | undefined;
                if (treatments && typeof treatments === 'object') {
                    for (const [key, val] of Object.entries(treatments)) {
                        if (!seen.has(key)) {
                            seen.set(key, {
                                type: val.new_treatment_type,
                                stocks: new Set(val.new_treatment_stocks || [])
                            });
                        } else {
                            const entry = seen.get(key)!;
                            (val.new_treatment_stocks || []).forEach(s => entry.stocks.add(s));
                        }
                    }
                }
            }

            for (const [name, entry] of seen.entries()) {
                list.push({ name, type: entry.type, stocks: Array.from(entry.stocks) });
            }

            return list;
        } catch {
            return [];
        }
    }, [result?.design_json]);

    const handleRedo = async () => {
        const { data: generated, error: err } = await generateDesign(formData);
        if (err) {
            alert(err);
            return;
        }
        if (generated) {
            setResult(generated);
        }
    };

    const handleConfirm = async () => {
        if (!result?.design_json) return;
        const res = await saveTrial(formData, result.design_json);
        if (res.success && res.trialId) {
            clearDraft();
            setSavedTrialId(res.trialId);
            onSuccess();
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
            {regenError && (
                <div className="alert alert-danger tw:m-0">{regenError}</div>
            )}
            {saveError && (
                <div className="alert alert-danger tw:m-0">{saveError}</div>
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
                        hasPlantEntries={parseInt(formData.plantsPerPlot || '0', 10) > 0}
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
                    disabled={regenerating || saving}
                    onClick={handleRedo}
                >
                    {regenerating ? 'Regenerating...' : 'Redo Randomization'}
                </button>
                <button
                    type="button"
                    id="add_trial_treatments_button"
                    name="new_trial_add_treatments"
                    className="btn btn-default btn-lg"
                    disabled={regenerating || saving}
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
                    disabled={saving || regenerating}
                    onClick={handleConfirm}
                >
                    {saving ? 'Saving Trial...' : 'Confirm (Save Trial in Database)'}
                </button>
            </div>

            <AddTreatmentsModal
                show={showTreatmentModal}
                onClose={() => setShowTreatmentModal(false)}
            />
        </div>
    );
};
