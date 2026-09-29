import React, { useEffect, useState } from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { fetchSelectOptions, HtmlSelectOption } from '../../../fetch';

export const TrialLinkageSection: React.FC = () => {
    const { formData, updateField } = useTrialForm();
    const [precedingTrials, setPrecedingTrials] = useState<HtmlSelectOption[]>([]);

    useEffect(() => {
        let isMounted = true;
        if (formData.trialSourced === 'yes' && formData.breedingProgram) {
            fetchSelectOptions('trials', {
                breeding_program_name: formData.breedingProgram,
                empty: false
            }).then(options => {
                if (!isMounted) {
                    return;
                }
                setPrecedingTrials(options.filter(opt => opt.value));
            });
        } else {
            setPrecedingTrials([]);
        }
        return () => {
            isMounted = false;
        };
    }, [formData.trialSourced, formData.breedingProgram]);

    return (
        <div className="tw:flex tw:flex-col tw:gap-4">
            <p>
                Is your trial linked with other field trials, genotyping plates, or crossing experiments in the database? If you are unsure, you can skip this. This information can be added from the trial detail page after the trial is saved.
            </p>

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
                                    <option key={t.value} value={t.value} title={t.title}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <p>
                If you go on to collect tissue samples for creating a 96 well plate for genotyping, when adding the genotyping plate (96 well plate layout) to the database you can use plot names or plant names or tissue sample names from this field trial. By doing so, we can create linkage between this field trial and the genotyping plate.
            </p>

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

            <p>
                If you go on to perform crosses on this field trial, each cross can be linked to specific female and male plots. When you upload these crosses we can then automatically link this field trial to the crossing experiment in the database.
            </p>

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
