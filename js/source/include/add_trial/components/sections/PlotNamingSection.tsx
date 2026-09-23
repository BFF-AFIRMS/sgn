import React from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { PlotNumberingScheme } from '../../types';

export const PlotNamingSection: React.FC = () => {
    const { formData, updateField } = useTrialForm();

    return (
        <div className="tw:flex tw:flex-col tw:gap-3">
            <div className="form-group row">
                <div className="col-sm-offset-3 col-sm-9">
                    <label className="tw:font-normal">
                        <input
                            id="show_plot_naming_options"
                            type="checkbox"
                            checked={formData.showPlotNamingOptions}
                            onChange={e => updateField('showPlotNamingOptions', e.target.checked)}
                        />{' '}
                        Custom plot naming/numbering
                    </label>
                </div>
            </div>
            {formData.showPlotNamingOptions && (
                <>
            <div className="form-group row">
                <label className="col-sm-3 control-label">Numbering Scheme:</label>
                <div className="col-sm-9 tw:flex tw:flex-col tw:gap-1.5">
                    <label className="tw:font-normal">
                        <input
                            id="block_based"
                            type="radio"
                            name="plot_num_scheme"
                            value="block_based"
                            checked={formData.plotNumberingScheme === 'block_based'}
                            onChange={() => updateField('plotNumberingScheme', 'block_based' as PlotNumberingScheme)}
                        />{' '}
                        Block-based plot numbers (increment leading digit for every block, e.g. 101, 201)
                    </label>
                    <label className="tw:font-normal">
                        <input
                            id="consecutive"
                            type="radio"
                            name="plot_num_scheme"
                            value="consecutive"
                            checked={formData.plotNumberingScheme === 'consecutive'}
                            onChange={() => updateField('plotNumberingScheme', 'consecutive' as PlotNumberingScheme)}
                        />{' '}
                        Consecutive plot numbers throughout the blocks (e.g. 1, 2, 3...)
                    </label>
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">Plot Prefix:</label>
                <div className="col-sm-9">
                    <input
                        id="plot_prefix"
                        name="plot_prefix"
                        type="text"
                        className="form-control"
                        placeholder="Optional prefix"
                        value={formData.plotPrefix}
                        onChange={e => updateField('plotPrefix', e.target.value)}
                    />
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">Plot Start Number:</label>
                <div className="col-sm-9">
                    <select
                        id="start_number"
                        name="start_number"
                        className="form-control"
                        value={formData.startNumber}
                        onChange={e => updateField('startNumber', e.target.value)}
                    >
                        <option value="1">1</option>
                        <option value="101">101</option>
                        <option value="1001">1001</option>
                    </select>
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">Plot Number Increment:</label>
                <div className="col-sm-9">
                    <input
                        id="increment"
                        name="increment"
                        type="number"
                        className="form-control"
                        value={formData.increment}
                        onChange={e => updateField('increment', e.target.value)}
                    />
                </div>
            </div>
                </>
            )}
        </div>
    );
};
