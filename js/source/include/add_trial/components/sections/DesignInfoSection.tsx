import React, { useEffect } from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { BreedbaseListSelect } from '../common/BreedbaseListSelect';
import { AccessionAutocomplete } from '../../../fieldmap/components/AccessionAutocomplete';
import { useBreedbaseLists } from '../../hooks/useBreedbaseLists';
import { StockType } from '../../types';

interface DesignInfoSectionProps {
    onOpenPrepHelp: () => void;
}

export const DesignInfoSection: React.FC<DesignInfoSectionProps> = ({ onOpenPrepHelp }) => {
    const { formData, updateField } = useTrialForm();
    const { designType, stockType } = formData;

    const { getListElements } = useBreedbaseLists(stockType === 'cross' ? 'crosses' : stockType === 'family_name' ? 'family_names' : 'accessions');

    useEffect(() => {
        const targetStockList = formData.designType === 'p-rep' ? formData.repStockListId : formData.stockListId;
        if (targetStockList && formData.seedlotListId) {
            const stocks = getListElements(targetStockList);
            const seedlots = getListElements(formData.seedlotListId);
            if (stocks.length > 0 && seedlots.length > 0) {
                fetch('/ajax/trial/verify_seedlot_list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ stock_list: JSON.stringify(stocks), seedlot_list: JSON.stringify(seedlots) }).toString()
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.seedlot_hash) updateField('seedlotHash', data.seedlot_hash);
                    })
                    .catch(() => {});
            }
        }
    }, [formData.stockListId, formData.repStockListId, formData.seedlotListId, formData.designType, getListElements]);

    const listCategory = stockType === 'cross' ? 'crosses' : stockType === 'family_name' ? 'family_names' : 'accessions';

    const stockTypeLabels: Record<StockType, { singular: string; plural: string }> = {
        accession: { singular: 'Accession', plural: 'Accessions' },
        cross: { singular: 'Cross', plural: 'Crosses' },
        family_name: { singular: 'Family Name', plural: 'Family Names' },
    };

    const stockListDivId = stockType === 'cross' ? 'select_cross_list' : stockType === 'family_name' ? 'select_family_name_list' : 'select_list';
    const stockListSelectId = `${stockListDivId}_list_select`;

    const unrepDivId = stockType === 'cross' ? 'list_of_unrep_cross' : stockType === 'family_name' ? 'list_of_unrep_family_name' : 'list_of_unrep_accession';
    const unrepSelectId = `${unrepDivId}_list_select`;

    const repDivId = stockType === 'cross' ? 'list_of_rep_cross' : stockType === 'family_name' ? 'list_of_rep_family_name' : 'list_of_rep_accession';
    const repSelectId = `${repDivId}_list_select`;

    const checkDivId = stockType === 'cross' ? 'list_of_cross_checks_section' : stockType === 'family_name' ? 'list_of_family_name_checks_section' : 'list_of_checks_section';
    const checkSelectId = `${checkDivId}_list_select`;

    const crbdCheckDivId = stockType === 'cross' ? 'crbd_list_of_cross_checks_section' : stockType === 'family_name' ? 'crbd_list_of_family_name_checks_section' : 'crbd_list_of_checks_section';
    const crbdCheckSelectId = `${crbdCheckDivId}_list_select`;

    return (
        <div className="tw:flex tw:flex-col tw:gap-4">
            {/* Stock List selection */}
            {designType === 'p-rep' ? (
                <div className="well well-sm">
                    <div className="form-group row">
                        <label className="col-sm-5 control-label">
                            <span className="tw:text-red-500 tw:mr-1">*</span>Unreplicated {stockTypeLabels[stockType].singular} List:
                        </label>
                        <div className="col-sm-7">
                            <BreedbaseListSelect
                                id={unrepDivId}
                                selectId={unrepSelectId}
                                listType={listCategory}
                                value={formData.unrepStockListId}
                                onChange={id => updateField('unrepStockListId', id)}
                            />
                        </div>
                    </div>
                    <div className="form-group row">
                        <label className="col-sm-5 control-label">
                            <span className="tw:text-red-500 tw:mr-1">*</span>Replicated {stockTypeLabels[stockType].singular} List:
                        </label>
                        <div className="col-sm-7">
                            <BreedbaseListSelect
                                id={repDivId}
                                selectId={repSelectId}
                                listType={listCategory}
                                value={formData.repStockListId}
                                onChange={id => updateField('repStockListId', id)}
                            />
                        </div>
                    </div>
                    <div className="tw:text-right">
                        <button type="button" className="btn btn-link btn-xs" onClick={onOpenPrepHelp}>
                            Partially Replicated Design Help <span className="glyphicon glyphicon-question-sign"></span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="well well-sm">
                    <div className="form-group row">
                        <label className="col-sm-5 control-label">
                            <span className="tw:text-red-500 tw:mr-1">*</span>List of {stockTypeLabels[stockType].plural}:
                        </label>
                        <div className="col-sm-7">
                            <BreedbaseListSelect
                                id="select_list"
                                selectId="select_list_list_select"
                                listType={listCategory}
                                value={formData.stockListId}
                                onChange={id => updateField('stockListId', id)}
                            />
                        </div>
                    </div>
                    {(designType === 'Augmented' || designType === 'MAD') && (
                        <div className="form-group row">
                            <label className="col-sm-5 control-label">
                                <span className="tw:text-red-500 tw:mr-1">*</span>List of Checks:
                            </label>
                            <div className="col-sm-7">
                                <BreedbaseListSelect
                                    id="list_of_checks_section"
                                    selectId="list_of_checks_section_list_select"
                                    listType="accessions"
                                    value={formData.controlListId}
                                    onChange={id => updateField('controlListId', id)}
                                    placeholder="Select checks list"
                                />
                            </div>
                        </div>
                    )}
                    {['RCBD', 'CRD', 'Alpha', 'Lattice', 'RRC', 'DRRC', 'URDD'].includes(designType) && (
                        <div className="form-group row">
                            <label className="col-sm-5 control-label">Optional Checks List:</label>
                            <div className="col-sm-7">
                                <BreedbaseListSelect
                                    id="crbd_list_of_checks_section"
                                    selectId="crbd_list_of_checks_section_list_select"
                                    listType="accessions"
                                    value={formData.crbdControlListId}
                                    onChange={id => updateField('crbdControlListId', id)}
                                    placeholder="Optional checks list"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Design-specific numeric parameters */}
            <div className="panel panel-default">
                <div className="panel-heading"><h4 className="panel-title">Design Parameters</h4></div>
                <div className="panel-body tw:flex tw:flex-col tw:gap-3">
                    {['CRD', 'Alpha', 'Lattice', 'DRRC'].includes(designType) && (
                        <div className="form-group row">
                            <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Replicates:</label>
                            <div className="col-sm-7">
                                <input
                                    id="rep_count"
                                    name="rep_count"
                                    type="number"
                                    className="form-control"
                                    value={formData.repCount}
                                    onChange={e => updateField('repCount', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {['RCBD', 'RRC', 'URDD', 'splitplot'].includes(designType) && (
                        <div className="form-group row">
                            <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of Blocks:</label>
                            <div className="col-sm-7">
                                <input
                                    id="block_number"
                                    name="block_number"
                                    type="number"
                                    className="form-control"
                                    value={formData.blockNumber}
                                    onChange={e => updateField('blockNumber', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {designType === 'RRC' && (
                        <div className="form-group row">
                            <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of Rows in Design:</label>
                            <div className="col-sm-7">
                                <input
                                    id="fieldMap_row_number"
                                    name="fieldMap_row_number"
                                    type="number"
                                    className="form-control"
                                    placeholder="Required for Resolvable Row-Column"
                                    value={formData.fieldMapRowNumber}
                                    onChange={e => updateField('fieldMapRowNumber', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {designType === 'DRRC' && (
                        <div className="form-group row">
                            <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of Columns in Design:</label>
                            <div className="col-sm-7">
                                <input
                                    id="col_number"
                                    name="col_number"
                                    type="number"
                                    className="form-control"
                                    value={formData.colNumber}
                                    onChange={e => updateField('colNumber', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {designType === 'Alpha' && (
                        <div className="form-group row">
                            <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Block Size:</label>
                            <div className="col-sm-7">
                                <input
                                    id="block_size"
                                    name="block_size"
                                    type="number"
                                    className="form-control"
                                    value={formData.blockSize}
                                    onChange={e => updateField('blockSize', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {designType === 'Augmented' && (
                        <>
                        <div className="form-group row">
                            <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Max Block Size:</label>
                            <div className="col-sm-7">
                                <input
                                        id="max_block_size"
                                        name="max_block_size"
                                    type="number"
                                    className="form-control"
                                    value={formData.maxBlockSize}
                                    onChange={e => updateField('maxBlockSize', e.target.value)}
                                />
                            </div>
                        </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label">Rows per Block (Optional):</label>
                                <div className="col-sm-7">
                                    <input
                                        id="row_number_per_block"
                                        name="row_number_per_block"
                                        type="number"
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
                            <div className="form-group row">
                                <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of Field Rows:</label>
                                <div className="col-sm-7">
                                    <input
                                        id="row_number"
                                        name="row_number"
                                        type="number"
                                        className="form-control"
                                        value={formData.rowNumber}
                                        onChange={e => updateField('rowNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of Field Columns:</label>
                                <div className="col-sm-7">
                                    <input
                                        id="col_number"
                                        name="col_number"
                                        type="number"
                                        className="form-control"
                                        value={formData.colNumber}
                                        onChange={e => updateField('colNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label">Columns per Block (2 or 4):</label>
                                <div className="col-sm-7">
                                    <input
                                        id="fieldMap_col_number"
                                        name="fieldMap_col_number"
                                        type="number"
                                        className="form-control"
                                        value={formData.colNumberPerBlock}
                                        onChange={e => updateField('colNumberPerBlock', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label">Rows per Block (Optional):</label>
                                <div className="col-sm-7">
                                    <input
                                        id="row_number_per_block"
                                        name="row_number_per_block"
                                        type="number"
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
                            <div className="form-group row">
                                <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Rows in Design:</label>
                                <div className="col-sm-7">
                                    <input
                                        id="no_of_row_in_design"
                                        name="no_of_row_in_design"
                                        type="number"
                                        className="form-control"
                                        value={formData.rowInDesignNumber}
                                        onChange={e => updateField('rowInDesignNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Columns in Design:</label>
                                <div className="col-sm-7">
                                    <input
                                        id="no_of_col_in_design"
                                        name="no_of_col_in_design"
                                        type="number"
                                        className="form-control"
                                        value={formData.colInDesignNumber}
                                        onChange={e => updateField('colInDesignNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {designType === 'p-rep' && (
                        <>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label">Rows in Design:</label>
                                <div className="col-sm-7">
                                    <input
                                        id="no_of_rep_times"
                                        name="no_of_rep_times"
                                        type="number"
                                        className="form-control"
                                        value={formData.rowInDesignNumber}
                                        onChange={e => updateField('rowInDesignNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label">Columns in Design:</label>
                                <div className="col-sm-7">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={formData.colInDesignNumber}
                                        onChange={e => updateField('colInDesignNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label">Replication Factor for Replicated Entries:</label>
                                <div className="col-sm-7">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={formData.noOfRepTimes}
                                        onChange={e => updateField('noOfRepTimes', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label">Block Sequence (e.g. 13, 2):</label>
                                <div className="col-sm-7">
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
                            <div className="form-group row">
                                <label className="col-sm-5 control-label">Sub-block Sequence (e.g. 13, 1):</label>
                                <div className="col-sm-7">
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
                        </>
                    )}

                    {designType === 'greenhouse' && (
                        <div className="tw:flex tw:flex-col tw:gap-3">
                            <div className="form-group row">
                                <label className="col-sm-5 control-label">Default Number of Plants:</label>
                                <div className="col-sm-7">
                                    <input
                                        id="greenhouse_default_num_plants_per_accession_val"
                                        type="number"
                                        className="form-control"
                                        value={formData.greenhouseDefaultPlants}
                                        onChange={e => updateField('greenhouseDefaultPlants', e.target.value)}
                                    />
                                </div>
                            </div>
                            {formData.stockListId && (
                                <div className="well well-sm">
                                    <h5 className="tw:font-bold tw:mb-2">Custom Number of Plants per Entry:</h5>
                                    <div className="tw:max-h-48 tw:overflow-y-auto tw:space-y-2">
                                        {getListElements(formData.stockListId).map((name, i) => (
                                            <div key={name} className="tw:flex tw:items-center tw:gap-2">
                                                <label className="tw:flex-1 tw:text-xs tw:truncate">{name}</label>
                                                <input
                                                    id={`greenhouse_num_plants_input_${i}`}
                                                    type="number"
                                                    className="form-control input-sm tw:w-24"
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
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {designType === 'splitplot' && (
                        <div className="tw:flex tw:flex-col tw:gap-3">
                            <h5 className="tw:font-bold">Split Plot Treatments:</h5>
                            {formData.treatments.map((t, idx) => (
                                <div key={idx} className="tw:flex tw:gap-2 tw:items-center">
                                    <input
                                        type="text"
                                        id={`create_trial_with_treatment_name_input${idx + 1}`}
                                        className="form-control"
                                        placeholder={`Treatment ${idx + 1} Name`}
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
                                        placeholder="Value (e.g. Control, NPK)"
                                        value={t.value}
                                        onChange={e => {
                                            const updated = [...formData.treatments];
                                            updated[idx] = { ...updated[idx], value: e.target.value };
                                            updateField('treatments', updated);
                                        }}
                                    />
                                </div>
                            ))}
                            <button
                                type="button"
                                id="create_trial_with_treatment_additional_treatment_buton"
                                className="btn btn-info btn-xs tw:self-start"
                                onClick={() => updateField('treatments', [...formData.treatments, { name: '', value: '' }])}
                            >
                                + Add Treatment
                            </button>
                            <div className="form-group row tw:mt-2">
                                <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Plants per Treatment:</label>
                                <div className="col-sm-7">
                                    <input
                                        id="num_plants_per_treatment"
                                        name="num_plants_per_treatment"
                                        type="number"
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
                            <div className="form-group row">
                                <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Check 1 Name:</label>
                                <div className="col-sm-7">
                                    <AccessionAutocomplete
                                        value={formData.westcottCheck1}
                                        onChange={val => updateField('westcottCheck1', val)}
                                        className="form-control"
                                        placeholder="Check 1 Accession"
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Check 2 Name:</label>
                                <div className="col-sm-7">
                                    <AccessionAutocomplete
                                        value={formData.westcottCheck2}
                                        onChange={val => updateField('westcottCheck2', val)}
                                        className="form-control"
                                        placeholder="Check 2 Accession"
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label"><span className="tw:text-red-500 tw:mr-1">*</span>Number of Columns:</label>
                                <div className="col-sm-7">
                                    <input
                                        id="westcott_col"
                                        name="westcott_col"
                                        type="number"
                                        className="form-control"
                                        value={formData.westcottCol}
                                        onChange={e => updateField('westcottCol', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-5 control-label">Cols Between Checks (Optional):</label>
                                <div className="col-sm-7">
                                    <input
                                        id="westcott_col_between_check"
                                        name="westcott_col_between_check"
                                        type="number"
                                        className="form-control"
                                        placeholder="10"
                                        value={formData.westcottColBetweenCheck}
                                        onChange={e => updateField('westcottColBetweenCheck', e.target.value)}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Optional seedlots */}
            <div className="well well-sm">
                <h4 className="tw:font-bold tw:text-sm">Optional Seedlot Linking</h4>
                <div className="form-group row">
                    <label className="col-sm-5 control-label">Seedlot List:</label>
                    <div className="col-sm-7">
                        <BreedbaseListSelect
                            id="select_seedlot_list"
                            selectId="select_seedlot_list_list_select"
                            listType="seedlots"
                            value={formData.seedlotListId}
                            onChange={id => updateField('seedlotListId', id)}
                            placeholder="Optional seedlot list"
                        />
                    </div>
                </div>
                {formData.seedlotListId && (
                    <div className="form-group row">
                        <label className="col-sm-5 control-label">Seeds per Plot:</label>
                        <div className="col-sm-7">
                            <input
                                id="num_seed_per_plot"
                                name="num_seed_per_plot"
                                type="number"
                                className="form-control"
                                value={formData.numSeedPerPlot}
                                onChange={e => updateField('numSeedPerPlot', e.target.value)}
                            />
                        </div>
                    </div>
                )}
                <div className="tw:text-center tw:mt-2">
                    <button
                        type="button"
                        name="convert_accessions_to_seedlots"
                        className="btn btn-default btn-sm"
                        onClick={() => {
                            if (!formData.stockListId) {
                                alert('Please first select a list of accessions above!');
                            } else {
                                (window as any).CXGN?.List && new (window as any).CXGN.List().seedlotSearch(formData.stockListId);
                            }
                        }}
                    >
                        Search Seedlots for Accessions
                    </button>
                </div>
            </div>
        </div>
    );
};
