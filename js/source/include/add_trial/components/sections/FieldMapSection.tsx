import React from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { PlotLayoutFormat } from '../../types';

export const FieldMapSection: React.FC = () => {
    const { formData, updateField } = useTrialForm();

    return (
        <div className="tw:flex tw:flex-col tw:gap-3">
            <p className="tw:text-sm tw:text-gray-600">
                Configure the spatial layout for this trial. Plot coordinates can be auto-generated in serpentine or zigzag order.
            </p>
            <div className="form-group row">
                <label className="col-sm-3 control-label">Field map display:</label>
                <div className="col-sm-9">
                    <div className="checkbox">
                        <label className="tw:font-normal">
                            <input
                                id="show_field_map_options"
                                type="checkbox"
                                checked={formData.showFieldMapOptions}
                                onChange={e => updateField('showFieldMapOptions', e.target.checked)}
                            />{' '}
                            Enable field layout generation
                        </label>
                    </div>
                </div>
            </div>

            {formData.showFieldMapOptions && (
                <>
                    <div className="form-group row">
                        <label className="col-sm-3 control-label">Number of Rows:</label>
                        <div className="col-sm-9">
                            <input
                                id="fieldMap_row_number"
                                name="fieldMap_row_number"
                                type="number"
                                className="form-control"
                                placeholder="Defaults to number of blocks"
                                value={formData.fieldMapRowNumber}
                                onChange={e => updateField('fieldMapRowNumber', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group row">
                        <label className="col-sm-3 control-label">Layout Format:</label>
                        <div className="col-sm-9">
                            <select
                                id="plot_layout_format"
                                name="plot_layout_format"
                                className="form-control"
                                value={formData.plotLayoutFormat}
                                onChange={e => updateField('plotLayoutFormat', e.target.value as PlotLayoutFormat)}
                            >
                                <option value="serpentine">Serpentine</option>
                                <option value="zigzag">Zigzag (unserpentine)</option>
                            </select>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
