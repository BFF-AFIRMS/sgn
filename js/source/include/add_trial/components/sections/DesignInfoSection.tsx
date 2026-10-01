import React from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { BreedbaseListSelect } from '../common/BreedbaseListSelect';
import { AccessionAutocomplete } from '../../../autocomplete';
import { useListItems } from '../../hooks/useBreedbaseLists';
import { StockType } from '../../types';

interface DesignInfoSectionProps {
    onOpenPrepHelp: () => void;
}

export const DesignInfoSection: React.FC<DesignInfoSectionProps> = ({ onOpenPrepHelp }) => {
    const { formData, updateField } = useTrialForm();
    const { designType, stockType } = formData;
    const { items: greenhouseStocks } = useListItems(formData.stockListId);

    const stockTypeLabels: Record<StockType, { singular: string; plural: string }> = {
        accession: { singular: 'Accession', plural: 'Accessions' },
        cross: { singular: 'Cross', plural: 'Crosses' },
        family_name: { singular: 'Family Name', plural: 'Family Names' },
    };

    const stockListSectionId = `show_list_of_${stockType}_section`;
    const stockListDivId = stockType === 'accession' ? 'select_list' : `select_${stockType}_list`;
    const stockListSelectId = `${stockListDivId}_list_select`;

    const unrepSectionId = `show_list_of_unrep_${stockType}`;
    const unrepDivId = `list_of_unrep_${stockType}`;
    const unrepSelectId = `${unrepDivId}_list_select`;

    const repSectionId = `show_list_of_rep_${stockType}`;
    const repDivId = `list_of_rep_${stockType}`;
    const repSelectId = `${repDivId}_list_select`;

    const checkSectionId = stockType === 'accession' ? 'show_list_of_checks_section' : `show_list_of_${stockType}_checks_section`;
    const checkDivId = stockType === 'accession' ? 'list_of_checks_section' : `list_of_${stockType}_checks_section`;
    const checkSelectId = `${checkDivId}_list_select`;

    const crbdCheckSectionId = stockType === 'accession' ? 'crbd_show_list_of_checks_section' : `crbd_show_list_of_${stockType}_checks_section`;
    const crbdCheckDivId = stockType === 'accession' ? 'crbd_list_of_checks_section' : `crbd_list_of_${stockType}_checks_section`;
    const crbdCheckSelectId = `${crbdCheckDivId}_list_select`;

    return (
        <div className="tw:flex tw:flex-col tw:gap-4">
            {/* Stock List selection */}
            <div className="well well-sm">
                {designType === 'p-rep' ? (
                    <>
                        <div className="form-group form-group-sm" id={unrepSectionId}>
                            <label className="col-sm-7 control-label">
                                <span className="tw:text-red-500 tw:mr-1">*</span>List of unreplicated {stockTypeLabels[stockType].singular.toLowerCase()}:
                            </label>
                            <div className="col-sm-5">
                                <BreedbaseListSelect
                                    id={unrepDivId}
                                    selectId={unrepSelectId}
                                    listType={stockType}
                                    value={formData.unrepStockListId}
                                    onChange={id => updateField('unrepStockListId', id)}
                                    placeholder="Required: e.g. 200"
                                />
                            </div>
                        </div>
                        <div className="form-group form-group-sm" id={repSectionId}>
                            <label className="col-sm-7 control-label">
                                <span className="tw:text-red-500 tw:mr-1">*</span>List of replicated {stockTypeLabels[stockType].singular.toLowerCase()}:
                            </label>
                            <div className="col-sm-5">
                                <BreedbaseListSelect
                                    id={repDivId}
                                    selectId={repSelectId}
                                    listType={stockType}
                                    value={formData.repStockListId}
                                    onChange={id => updateField('repStockListId', id)}
                                    placeholder="Required: e.g. 119"
                                />
                            </div>
                        </div>
                        <div className="tw:text-right">
                            <button type="button" className="btn btn-link btn-xs" onClick={onOpenPrepHelp}>
                                Usage Help <span className="glyphicon glyphicon-question-sign"></span>
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="tw:flex tw:justify-center">
                            <h4 className="tw:font-bold">Which {stockTypeLabels[stockType].plural.toLowerCase()} will be in the field?</h4>
                        </div>
                        <hr />
                        <div className="form-group form-group-sm" id={stockListSectionId}>
                            <label className="col-sm-7 control-label">
                                <span className="tw:text-red-500 tw:mr-1">*</span>List of {stockTypeLabels[stockType].plural.toLowerCase()} to include:
                            </label>
                            <div className="col-sm-5">
                                <BreedbaseListSelect
                                    id={stockListDivId}
                                    selectId={stockListSelectId}
                                    listType={stockType}
                                    value={formData.stockListId}
                                    onChange={id => updateField('stockListId', id)}
                                    placeholder="select a list"
                                />
                            </div>
                        </div>
                        {(designType === 'Augmented' || designType === 'MAD') && (
                            <div className="form-group form-group-sm" id={checkSectionId}>
                                <label className="col-sm-7 control-label">
                                    <span className="tw:text-red-500 tw:mr-1">*</span>List of checks to include:
                                </label>
                                <div className="col-sm-5">
                                    <BreedbaseListSelect
                                        id={checkDivId}
                                        selectId={checkSelectId}
                                        listType="accessions"
                                        value={formData.controlListId}
                                        onChange={id => updateField('controlListId', id)}
                                        placeholder="select optional check list"
                                    />
                                </div>
                            </div>
                        )}
                        {['RCBD', 'CRD', 'Alpha', 'Lattice', 'RRC', 'DRRC', 'URDD'].includes(designType) && (
                            <div className="form-group form-group-sm" id={crbdCheckSectionId}>
                                <label className="col-sm-7 control-label">
                                    List of checks to include. Checks list should be {stockType === 'accession' ? 'separate from accessions' : 'accessions'} list. (optional): 
                                </label>
                                <div className="col-sm-5">
                                    <BreedbaseListSelect
                                        id={crbdCheckDivId}
                                        selectId={crbdCheckSelectId}
                                        listType="accessions"
                                        value={formData.crbdControlListId}
                                        onChange={id => updateField('crbdControlListId', id)}
                                        placeholder="select optional check list"
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="tw:flex tw:justify-center tw:items-center tw:gap-4 tw:mt-3">
                    <span>Need to create a list?</span>
                    <button
                        name="lists_link"
                        type="button"
                        className="btn btn-default btn-sm"
                        style={{ margin: '6px 0px 0px 0px' }}
                        onClick={() => (window as any).show_lists?.()}
                    >
                        Manage Lists
                    </button>
                </div>
            </div>

            {/* Design-specific numeric parameters */}
            <div id="design_info">
                    {['CRD', 'Alpha', 'Lattice', 'DRRC'].includes(designType) && (
                        <div className="form-group form-group-sm" id="rep_count_section">
                            <label className="col-sm-7 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of replicates: </label>
                            <div className="col-sm-5">
                                <input
                                    id="rep_count"
                                    name="rep_count"
                                    type="text"
                                    className="form-control"
                                    value={formData.repCount}
                                    onChange={e => updateField('repCount', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {['RCBD', 'RRC', 'URDD', 'splitplot'].includes(designType) && (
                        <div className="form-group form-group-sm" id="block_number_section">
                            <label className="col-sm-7 control-label">Number of blocks: </label>
                            <div className="col-sm-5">
                                <input
                                    id="block_number"
                                    name="block_number"
                                    type="text"
                                    className="form-control"
                                    value={formData.blockNumber}
                                    onChange={e => updateField('blockNumber', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {designType === 'DRRC' && (
                        <div className="form-group form-group-sm" id="col_number_section">
                            <label className="col-sm-7 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of Columns: </label>
                            <div className="col-sm-5">
                                <input
                                    id="col_number"
                                    name="col_number"
                                    type="text"
                                    className="form-control"
                                    value={formData.colNumber}
                                    onChange={e => updateField('colNumber', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {designType === 'Alpha' && (
                        <div className="form-group form-group-sm" id="block_size_section">
                            <label className="col-sm-7 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Block size: </label>
                            <div className="col-sm-5">
                                <input
                                    id="block_size"
                                    name="block_size"
                                    type="text"
                                    className="form-control"
                                    value={formData.blockSize}
                                    onChange={e => updateField('blockSize', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {designType === 'Augmented' && (
                        <>
                        <div className="form-group form-group-sm" id="max_block_size_section">
                            <label className="col-sm-7 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Maximum block size: </label>
                            <div className="col-sm-5">
                                <input
                                    id="max_block_size"
                                    name="max_block_size"
                                    type="text"
                                    className="form-control"
                                    value={formData.maxBlockSize}
                                    onChange={e => updateField('maxBlockSize', e.target.value)}
                                />
                            </div>
                        </div>
                            <div className="form-group form-group-sm" id="row_number_per_block_section">
                                <label className="col-sm-7 control-label">Number of Rows Per Block (Optional): </label>
                                <div className="col-sm-5">
                                    <input
                                        id="row_number_per_block"
                                        name="row_number_per_block"
                                        type="text"
                                        className="form-control"
                                        value={formData.rowNumberPerBlock}
                                        onChange={e => updateField('rowNumberPerBlock', e.target.value)}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {designType === 'MAD' && (
                        <>
                            <div className="form-group form-group-sm" id="row_number_section">
                                <label className="col-sm-7 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of field rows: </label>
                                <div className="col-sm-5">
                                    <input
                                        id="row_number"
                                        name="row_number"
                                        type="text"
                                        className="form-control"
                                        value={formData.rowNumber}
                                        onChange={e => updateField('rowNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group form-group-sm" id="col_number_section">
                                <label className="col-sm-7 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of Columns: </label>
                                <div className="col-sm-5">
                                    <input
                                        id="col_number"
                                        name="col_number"
                                        type="text"
                                        className="form-control"
                                        value={formData.colNumber}
                                        onChange={e => updateField('colNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group form-group-sm" id="col_number_per_block_section">
                                <label className="col-sm-7 control-label">Number of Columns per Block (2 or 4): </label>
                                <div className="col-sm-5">
                                    <input
                                        id="fieldMap_col_number"
                                        name="fieldMap_col_number"
                                        type="text"
                                        className="form-control"
                                        value={formData.colNumberPerBlock}
                                        onChange={e => updateField('colNumberPerBlock', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group form-group-sm" id="row_number_per_block_section">
                                <label className="col-sm-7 control-label">Number of Rows Per Block (Optional): </label>
                                <div className="col-sm-5">
                                    <input
                                        id="row_number_per_block"
                                        name="row_number_per_block"
                                        type="text"
                                        className="form-control"
                                        value={formData.rowNumberPerBlock}
                                        onChange={e => updateField('rowNumberPerBlock', e.target.value)}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {(designType === 'p-rep' || designType === 'URDD') && (
                        <>
                            <div className="form-group form-group-sm" id="show_no_of_row_in_design">
                                <label className="col-sm-7 control-label">Number of rows in design: </label>
                                <div className="col-sm-5">
                                    <div className="input-group">
                                        <span className="input-group-addon"><i className="glyphicon glyphicon-qrcode"></i></span>
                                        <input
                                            id="no_of_row_in_design"
                                            name="no_of_row_in_design"
                                            type="text"
                                            className="form-control"
                                            placeholder="26"
                                            value={formData.rowInDesignNumber}
                                            onChange={e => updateField('rowInDesignNumber', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="form-group form-group-sm" id="show_no_of_col_in_design">
                                <label className="col-sm-7 control-label">Number of columns in design : </label>
                                <div className="col-sm-5">
                                    <div className="input-group">
                                        <span className="input-group-addon"><i className="glyphicon glyphicon-qrcode"></i></span>
                                        <input
                                            id="no_of_col_in_design"
                                            name="no_of_col_in_design"
                                            type="text"
                                            className="form-control"
                                            placeholder="26"
                                            value={formData.colInDesignNumber}
                                            onChange={e => updateField('colInDesignNumber', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {designType === 'p-rep' && (
                        <>
                            <div className="form-group form-group-sm" id="show_no_of_rep_times">
                                <label className="col-sm-7 control-label">Number of times replicated accessions are replicated: </label>
                                <div className="col-sm-5">
                                    <div className="input-group">
                                        <span className="input-group-addon"><i className="glyphicon glyphicon-qrcode"></i></span>
                                        <input
                                            id="no_of_rep_times"
                                            name="no_of_rep_times"
                                            type="text"
                                            className="form-control"
                                            placeholder="4"
                                            value={formData.noOfRepTimes}
                                            onChange={e => updateField('noOfRepTimes', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="form-group form-group-sm" id="show_no_of_block_sequence">
                                <label className="col-sm-7 control-label">Block sequence: </label>
                                <div className="col-sm-5">
                                    <div className="input-group">
                                        <span className="input-group-addon"><i className="glyphicon glyphicon-qrcode"></i></span>
                                        <input
                                            id="no_of_block_sequence"
                                            name="no_of_block_sequence"
                                            type="text"
                                            className="form-control"
                                            placeholder="13, 2"
                                            value={formData.noOfBlockSequence}
                                            onChange={e => updateField('noOfBlockSequence', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="form-group form-group-sm" id="show_no_of_sub_block_sequence">
                                <label className="col-sm-7 control-label">Sub-block sequence: </label>
                                <div className="col-sm-5">
                                    <div className="input-group">
                                        <span className="input-group-addon"><i className="glyphicon glyphicon-qrcode"></i></span>
                                        <input
                                            id="no_of_sub_block_sequence"
                                            name="no_of_sub_block_sequence"
                                            type="text"
                                            className="form-control"
                                            placeholder="13, 1"
                                            value={formData.noOfSubBlockSequence}
                                            onChange={e => updateField('noOfSubBlockSequence', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {designType === 'greenhouse' && (
                        <>
                            <div className="form-group form-group-sm" id="greenhouse_default_num_plants_per_accession">
                                <label className="col-sm-7 control-label">Default Number of Plants: </label>
                                <div className="col-sm-5">
                                    <input
                                        id="greenhouse_default_num_plants_per_accession_val"
                                        name="greenhouse_default_num_plants_per_accession_val"
                                        type="text"
                                        className="form-control"
                                        placeholder="1"
                                        value={formData.greenhouseDefaultPlants}
                                        onChange={e => updateField('greenhouseDefaultPlants', e.target.value)}
                                    />
                                </div>
                            </div>
                            {formData.stockListId && (
                                <div className="form-group form-group-sm" id="greenhouse_num_plants_per_accession_section">
                                    <hr />
                                    <div className="tw:flex tw:justify-center">
                                         <h4 className="tw:font-bold">Number of Plants:</h4>
                                    </div>
                                    <div className="tw:max-h-60 tw:overflow-y-auto tw:mt-2" id="greenhouse_num_plants_per_accession">
                                        {greenhouseStocks.map((name, i) => (
                                            <div key={name} className="form-group form-group-sm">
                                                <label className="col-sm-9 control-label">{name}: </label>
                                                <div className="col-sm-3">
                                                <input
                                                    id={`greenhouse_num_plants_input_${i}`}
                                                    name={`greenhouse_num_plants_input_${i}`}
                                                    type="text"
                                                    className="form-control input-sm"
                                                    placeholder={formData.greenhouseDefaultPlants || '1'}
                                                    value={formData.greenhouseCustomPlants[name] || ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        updateField('greenhouseCustomPlants', {
                                                            ...formData.greenhouseCustomPlants,
                                                            [name]: val
                                                        });
                                                    }}
                                                />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {designType === 'splitplot' && (
                        <div id="create_trial_with_treatment_section">
                            {formData.treatments.map((t, idx) => (
                                <div key={idx} className="form-group form-group-sm">
                                    <label className="col-sm-7 control-label">Treatment {idx + 1}: </label>
                                    <div className="col-sm-5 tw:flex tw:flex-col tw:gap-1">
                                        <input
                                            type="text"
                                            id={`create_trial_with_treatment_name_input${idx + 1}`}
                                            className="form-control"
                                            placeholder={idx === 0 ? "Required Treatment 1 (likely a control value)" : idx === 1 ? "Required Treatment 2" : `Optional Treatment ${idx + 1}`}
                                            value={t.name}
                                            onChange={e => {
                                                const updated = [...formData.treatments];
                                                updated[idx] = { ...updated[idx], name: e.target.value };
                                                updateField('treatments', updated);
                                            }}
                                        />
                                        <input
                                            type="text"
                                            id={`create_trial_with_treatment_value_input${idx + 1}`}
                                            className="form-control"
                                            placeholder="treatment value"
                                            value={t.value}
                                            onChange={e => {
                                                const updated = [...formData.treatments];
                                                updated[idx] = { ...updated[idx], value: e.target.value };
                                                updateField('treatments', updated);
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="form-group form-group-sm">
                                <label className="col-sm-7 control-label">Add Another Treatment: </label>
                                <div className="col-sm-5">
                                    <button
                                        type="button"
                                        id="create_trial_with_treatment_additional_treatment_buton"
                                        className="btn btn-info btn-sm"
                                        onClick={() => updateField('treatments', [...formData.treatments, { name: '', value: '' }])}
                                    >
                                        + Treatment
                                    </button>
                                </div>
                            </div>
                            <div className="form-group form-group-sm" id="num_plants_per_plot_section">
                                <label className="col-sm-7 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of Plants Per Treatment: </label>
                                <div className="col-sm-5">
                                    <input
                                        id="num_plants_per_treatment"
                                        name="num_plants_per_treatment"
                                        type="text"
                                        className="form-control"
                                        value={formData.numPlantsPerTreatment}
                                        onChange={e => updateField('numPlantsPerTreatment', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {designType === 'Westcott' && (
                        <>
                            <div className="form-group form-group-sm" id="westcott_check_1_section">
                                <label className="col-sm-7 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Name of Check 1: </label>
                                <div className="col-sm-5">
                                    <AccessionAutocomplete
                                        id="westcott_check_1"
                                        name="westcott_check_1"
                                        value={formData.westcottCheck1}
                                        onChange={val => updateField('westcottCheck1', val)}
                                        className="form-control"
                                        placeholder="Required"
                                    />
                                </div>
                            </div>
                            <div className="form-group form-group-sm" id="westcott_check_2_section">
                                <label className="col-sm-7 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Name of Check 2: </label>
                                <div className="col-sm-5">
                                    <AccessionAutocomplete
                                        id="westcott_check_2"
                                        name="westcott_check_2"
                                        value={formData.westcottCheck2}
                                        onChange={val => updateField('westcottCheck2', val)}
                                        className="form-control"
                                        placeholder="Required"
                                    />
                                </div>
                            </div>
                            <div className="form-group form-group-sm" id="westcott_num_col_section">
                                <label className="col-sm-7 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of Columns: </label>
                                <div className="col-sm-5" id="westcott_num_col">
                                    <input
                                        id="westcott_col"
                                        name="westcott_col"
                                        type="text"
                                        className="form-control"
                                        placeholder="Required"
                                        value={formData.westcottCol}
                                        onChange={e => updateField('westcottCol', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group form-group-sm" id="westcott_num_col_between_check_section">
                                <label className="col-sm-7 control-label">Number of columns between two check columns (Optional): </label>
                                <div className="col-sm-5" id="westcott_num_col_between_check">
                                    <input
                                        id="westcott_col_between_check"
                                        name="westcott_col_between_check"
                                        type="text"
                                        className="form-control"
                                        placeholder="default is 10"
                                        value={formData.westcottColBetweenCheck}
                                        onChange={e => updateField('westcottColBetweenCheck', e.target.value)}
                                    />
                                </div>
                            </div>
                        </>
                    )}
            </div>
        </div>
    );
};
