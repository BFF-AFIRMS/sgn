import React, { useEffect, useState } from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
export const TrialLinkageSection: React.FC = () => {
    const { formData, updateField } = useTrialForm();
    const [precedingTrials, setPrecedingTrials] = useState<Array<[number, string]>>([]);

    useEffect(() => {
        if (formData.trialSourced === 'yes' && formData.breedingProgram) {
            fetch('/ajax/breeder/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    'categories[]': 'trials',
                    'data[breeding_programs][]': formData.breedingProgram
                }).toString()
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data?.trials)) {
                        setPrecedingTrials(data.trials);
                    }
                })
                .catch(() => {});
        }
    }, [formData.trialSourced, formData.breedingProgram]);

    return (
        <div className="tw:flex tw:flex-col tw:gap-4">
            <div className="well">
                <div className="form-group row">
                    <label className="col-sm-5 control-label">Is this trial following-up a previous field trial?</label>
                    <div className="col-sm-7">
                        <select
                            id="add_project_trial_sourced"
                            name="add_project_trial_sourced"
                            className="form-control"
                            value={formData.trialSourced}
                            onChange={e => updateField('trialSourced', e.target.value as 'yes' | 'no')}
                        >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>
                </div>
                {formData.trialSourced === 'yes' && (
                    <div className="form-group row tw:mt-3">
                        <label className="col-sm-5 control-label">Select Preceding Trial(s):</label>
                        <div className="col-sm-7">
                            <select
                                multiple
                                id="add_project_trial_source_select"
                                name="add_project_trial_source_select"
                                className="form-control"
                                size={4}
                                value={formData.sourceTrialIds}
                                onChange={e => {
                                    const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                                    updateField('sourceTrialIds', opts);
                                }}
                            >
                                {precedingTrials.map(t => (
                                    <option key={t[0]} value={String(t[0])}>{t[1]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div className="well">
                <div className="form-group row">
                    <label className="col-sm-5 control-label">Will this trial be genotyped?</label>
                    <div className="col-sm-7">
                        <select
                            id="add_project_trial_will_be_genotyped"
                            name="add_project_trial_will_be_genotyped"
                            className="form-control"
                            value={formData.willBeGenotyped}
                            onChange={e => updateField('willBeGenotyped', e.target.value as 'yes' | 'no')}
                        >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="well">
                <div className="form-group row">
                    <label className="col-sm-5 control-label">Will crosses be performed on this trial?</label>
                    <div className="col-sm-7">
                        <select
                            id="add_project_trial_will_be_crossed"
                            name="add_project_trial_will_be_crossed"
                            className="form-control"
                            value={formData.willBeCrossed}
                            onChange={e => updateField('willBeCrossed', e.target.value as 'yes' | 'no')}
                        >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};
