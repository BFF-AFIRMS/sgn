import React from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { PlotLayoutFormat } from '../../types';

export const FieldMapSection: React.FC = () => {
    const { formData, updateField } = useTrialForm();
    const isWestcott = formData.designType === 'Westcott';
    const isFieldMapHidden = ['Alpha', 'MAD', 'greenhouse', 'p-rep', 'Westcott'].includes(formData.designType);
    const isFieldMapRowHidden = ['Augmented', 'DRRC', 'URDD'].includes(formData.designType);
    const isFieldMapRowRequired = formData.designType === 'RRC';

    return (
        <div>
            <p>Specify the number of rows and columns for the entire field</p>
            <p>By default field map display is set to serpentine and uses the block or rep number as row number.</p>
            <p>If you do not want to create field map along with this trial, set &apos;Plot layout format&apos; to &apos;select plot layout format&apos;.</p>
            <p>If you do not know exactly in which rows and columns you will end up planting the plots, do not provide this and go to the next step.</p>
            <p>If you will plant your plots in an irregular (non-rectangular) layout, do not provide this and go to the next step.</p>
            <p>You can upload the exact row and column information for your plots (in any layout shape) on the Trial Detail Page after you have created the trial in the database and actually planted the experiment.</p>

            <hr />

            <div className="form-group" id="FieldMap_westcott" style={{ display: isWestcott ? '' : 'none' }}>
                <label className="col-sm-4 control-label">Field map display: </label>
                <div className="col-sm-8">
                    <label className="control-label tw:font-normal">
                        <input type="checkbox" id="westcott_field_map" checked disabled /> (comes with design)
                    </label>
                </div>
            </div>

            <div className="form-group tw:flex tw:flex-row tw:gap-2" id="FieldMap" style={{ display: isFieldMapHidden ? 'none' : '' }}>
                <label className="col-sm-4 control-label">Field map display: </label>
                <div className="col-sm-8 tw:flex tw:items-center tw:pt-1.25">
                    <input
                        type="checkbox"
                        id="show_field_map_options"
                        checked={formData.showFieldMapOptions}
                        onChange={e => updateField('showFieldMapOptions', e.target.checked)}
                    />
                </div>
            </div>

            <div id="field_map_options" style={{ display: !isFieldMapHidden && formData.showFieldMapOptions ? '' : 'none' }}>
                <div className="form-group form-group-sm" id="field_map_row_aug" style={{ display: isFieldMapRowHidden ? 'none' : '' }}>
                    <label className="col-sm-7 control-label">
                        {isFieldMapRowRequired && <span className="tw:text-red-500 tw:mr-1">*</span>}
                        Number of rows:
                    </label>
                    <div className="col-sm-5">
                        <input
                            type="text"
                            className="form-control"
                            id="fieldMap_row_number"
                            name="fieldMap_row_number"
                            placeholder={isFieldMapRowRequired ? "" : "Will use number of blocks by default"}
                            value={formData.fieldMapRowNumber}
                            onChange={e => updateField('fieldMapRowNumber', e.target.value)}
                        />
                    </div>
                </div>
                <div className="form-group form-group-sm">
                    <label className="col-sm-7 control-label">Plot layout format: </label>
                    <div className="col-sm-5">
                        <select
                            className="form-control"
                            id="plot_layout_format"
                            name="plot_layout_format"
                            value={formData.plotLayoutFormat}
                            onChange={e => updateField('plotLayoutFormat', e.target.value as PlotLayoutFormat)}
                        >
                            <option value="">select plot layout format</option>
                            <option value="zigzag">Zigzag(unserpentine)</option>
                            <option value="serpentine">Serpentine</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};
