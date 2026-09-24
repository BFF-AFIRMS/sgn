import React, { useMemo, useEffect } from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { useDesignResult } from '../../contexts/DesignResultContext';
import { useDesignGenerator } from '../../hooks/useDesignGenerator';
import { useTrialSaver } from '../../hooks/useTrialSaver';
import { useBreedbaseLists } from '../../hooks/useBreedbaseLists';
import { designMapToObservationUnits } from '../../utils/designAdapters';
import { FieldMapProps } from '../../../fieldmap/types';

interface ReviewDesignStepProps {
    FieldMapContainer: React.ComponentType<FieldMapProps>;
    onSuccess: () => void;
}

export const ReviewDesignStep: React.FC<ReviewDesignStepProps> = ({ FieldMapContainer, onSuccess }) => {
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
    const { getListElements } = useBreedbaseLists(formData.stockType === 'cross' ? 'crosses' : formData.stockType === 'family_name' ? 'family_names' : 'accessions');

    const currentDesign = parsedDesigns[selectedLocationIndex] || parsedDesigns[0] || {};
    const currentUnits = useMemo(() => {
        const locName = formData.locations[selectedLocationIndex] || formData.trialName;
        return designMapToObservationUnits(currentDesign, locName);
    }, [currentDesign, selectedLocationIndex, formData.locations, formData.trialName]);

    useEffect(() => {
        if (!result && !regenerating && formData.trialName.trim()) {
            generateDesign(formData, getListElements).then(({ data }) => {
                if (data) {
                    setResult(data);
                }
            });
        }
    }, [result, regenerating, formData, getListElements, generateDesign, setResult]);

    const handleRedo = async () => {
        const { data: generated, error: err } = await generateDesign(formData, getListElements);
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

    const layoutTablesHtml = useMemo(() => {
        if (!result?.design_layout_view_html) return '';
        try {
            const parsed = JSON.parse(result.design_layout_view_html);
            if (Array.isArray(parsed)) {
                return parsed.join('<br/>');
            }
            return String(parsed);
        } catch {
            return result.design_layout_view_html;
        }
    }, [result?.design_layout_view_html]);

    return (
        <div className="tw:flex tw:flex-col tw:gap-4 tw:p-4">
            <div className="page_title">
                <h3 className="tw:font-bold tw:text-lg">Review the generated trial layout. Make sure to click Submit at the bottom of this page if you approve of the trial!</h3>
            </div>

            {result?.warning_message && (
                <center>
                    <div className="well">
                        <h4 className="text-warning tw:font-bold">Warning: {result.warning_message}</h4>
                    </div>
                </center>
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
                <div className="panel panel-default tw:m-0">
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

            {layoutTablesHtml && (
                <div
                    id="trial_design_view_layout_return"
                    className="tw:overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: layoutTablesHtml }}
                />
            )}

            <div className="tw:flex tw:justify-center tw:my-2">
                <button
                    type="button"
                    id="redo_trial_layout_button"
                    className="btn btn-info btn-lg"
                    disabled={regenerating || saving}
                    onClick={handleRedo}
                >
                    {regenerating ? 'Regenerating...' : 'Redo Randomization'}
                </button>
            </div>

            <hr />
            <p>
                <span className="glyphicon glyphicon-ok tw:text-green-600 tw:mr-2"></span>
                <strong>Trial Is Valid</strong><br />The following trial will be added:
            </p>
            <hr />

            {result?.design_info_view_html && (
                <div
                    id="trial_design_information"
                    dangerouslySetInnerHTML={{ __html: result.design_info_view_html }}
                />
            )}

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
        </div>
    );
};
