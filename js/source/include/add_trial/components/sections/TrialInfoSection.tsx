import React, { useEffect, useMemo, useState } from 'react';
import { useTrialForm } from '../../contexts/TrialFormContext';
import { DESIGN_TYPE_ALIASES, STANDARD_DESIGN_TYPES, DesignType, StockType } from '../../types';

export const TrialInfoSection: React.FC = () => {
    const { formData, updateField, serverProps } = useTrialForm();
    const [trialTypes, setTrialTypes] = useState<Array<[number, string]>>([]);

    useEffect(() => {
        fetch('/ajax/breeder/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 'categories[]': 'trial_types' }).toString()
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data?.trial_types)) {
                    setTrialTypes(data.trial_types);
                }
            })
            .catch(() => {});
    }, []);

    const yearOptions = useMemo(() => {
        const current = new Date().getFullYear();
        const years: number[] = [];
        for (let y = current + 1; y >= 1970; y--) {
            years.push(y);
        }
        return years;
    }, []);

    const filteredLocations = useMemo(() => {
        return serverProps.locations.filter(loc => {
            return Boolean(formData.breedingProgram && loc.properties?.Program === formData.breedingProgram);
        });
    }, [serverProps.locations, formData.breedingProgram]);

    useEffect(() => {
        if (formData.locations.length > 0) {
            const validNames = new Set(filteredLocations.map(l => l.properties?.Name).filter(Boolean));
            const updated = formData.locations.filter(loc => validNames.has(loc));
            if (updated.length !== formData.locations.length) {
                updateField('locations', updated);
            }
        }
    }, [filteredLocations, formData.locations, updateField]);

    const availableDesignTypes = useMemo(() => {
        if (!serverProps.design_types || serverProps.design_types.length === 0) {
            return STANDARD_DESIGN_TYPES;
        }
        const seen = new Set<DesignType>();
        const ordered: Array<{ value: DesignType; label: string }> = [];

        for (const raw of serverProps.design_types) {
            const cleanLower = raw.trim().toLowerCase();
            const standardItem = STANDARD_DESIGN_TYPES.find(d => {
                const aliases = DESIGN_TYPE_ALIASES[d.value] || [d.value.toLowerCase(), d.label.toLowerCase()];
                return aliases.includes(cleanLower);
            });
            if (standardItem && !seen.has(standardItem.value)) {
                seen.add(standardItem.value);
                ordered.push(standardItem);
            }
        }
        return ordered.length > 0 ? ordered : STANDARD_DESIGN_TYPES;
    }, [serverProps.design_types]);

    useEffect(() => {
        if (availableDesignTypes.length > 0 && !availableDesignTypes.some(d => d.value === formData.designType)) {
            updateField('designType', availableDesignTypes[0].value);
        }
    }, [availableDesignTypes, formData.designType, updateField]);

    return (
        <div className="tw:flex tw:flex-col tw:gap-3.5">
            <div className="form-group row">
                <label className="col-sm-3 control-label">
                    <span className="tw:text-red-500 tw:mr-1">*</span>Breeding Program:
                </label>
                <div className="col-sm-9">
                    <select
                        id="select_breeding_program"
                        name="select_breeding_program"
                        className="form-control"
                        value={formData.breedingProgram}
                        onChange={e => updateField('breedingProgram', e.target.value)}
                    >
                        <option value="">-- Select Breeding Program --</option>
                        {serverProps.breeding_programs.map(p => (
                            <option key={p[0]} value={p[1]}>{p[1]}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">
                    <span className="tw:text-red-500 tw:mr-1">*</span>Locations:
                </label>
                <div className="col-sm-9">
                    <select
                        multiple
                        id="add_project_location"
                        name="add_project_location"
                        className="form-control"
                        size={4}
                        value={formData.locations}
                        onChange={e => {
                            const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                            updateField('locations', opts);
                        }}
                    >
                        {filteredLocations.map(l => (
                            <option key={l.properties.Name} value={l.properties.Name}>
                                {l.properties.Name}
                            </option>
                        ))}
                    </select>
                    <div id="locations_count" className="well well-sm tw:mt-1 tw:mb-0">
                        {formData.locations.length > 0
                            ? `Locations Selected: ${formData.locations.length}`
                            : 'No Locations Selected'}
                    </div>
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">
                    <span className="tw:text-red-500 tw:mr-1">*</span>Trial Name:
                </label>
                <div className="col-sm-9">
                    <input
                        id="new_trial_name"
                        name="new_trial_name"
                        type="text"
                        className="form-control"
                        value={formData.trialName}
                        onChange={e => updateField('trialName', e.target.value)}
                    />
                    <p className="tw:text-gray-500 tw:mt-1">
                        <em>Location abbreviation will automatically be appended if multiple locations are selected.</em>
                    </p>
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">Trial Type:</label>
                <div className="col-sm-9">
                    <select
                        id="add_project_type"
                        name="add_project_type"
                        className="form-control"
                        value={formData.trialType}
                        onChange={e => updateField('trialType', e.target.value)}
                    >
                        <option value="">-- Select Trial Type (Optional) --</option>
                        {trialTypes.map(t => (
                            <option key={t[0]} value={t[1]}>{t[1]}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">Year:</label>
                <div className="col-sm-9">
                    <select
                        id="add_project_year"
                        name="add_project_year"
                        className="form-control"
                        value={formData.year}
                        onChange={e => updateField('year', e.target.value)}
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={String(y)}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">Planting Date:</label>
                <div className="col-sm-9">
                    <input
                        id="add_project_planting_date"
                        name="add_project_planting_date"
                        type="date"
                        className="form-control"
                        value={formData.plantingDate}
                        onChange={e => updateField('plantingDate', e.target.value)}
                    />
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">Plot Dimensions (m):</label>
                <div className="col-sm-9 tw:flex tw:gap-4">
                    <div className="tw:flex-1">
                        <label>Width (m):</label>
                        <input
                            id="add_project_plot_width"
                            name="add_project_plot_width"
                            type="number"
                            step="0.1"
                            className="form-control"
                            placeholder="Width"
                            value={formData.plotWidth}
                            onChange={e => updateField('plotWidth', e.target.value)}
                        />
                    </div>
                    <div className="tw:flex-1">
                        <label>Length (m):</label>
                        <input
                            id="add_project_plot_length"
                            name="add_project_plot_length"
                            type="number"
                            step="0.1"
                            className="form-control"
                            placeholder="Length"
                            value={formData.plotLength}
                            onChange={e => updateField('plotLength', e.target.value)}
                        />
                    </div>
                    <div className="tw:flex-1">
                        <label>Field Size (ha):</label>
                        <input
                            id="new_trial_field_size"
                            name="new_trial_field_size"
                            type="number"
                            step="0.1"
                            className="form-control"
                            placeholder="Field Size"
                            value={formData.fieldSize}
                            onChange={e => updateField('fieldSize', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">Plants per Plot:</label>
                <div className="col-sm-9">
                    <input
                        id="add_plant_entries"
                        name="add_plant_entries"
                        type="number"
                        className="form-control"
                        value={formData.plantsPerPlot}
                        onChange={e => updateField('plantsPerPlot', e.target.value)}
                    />
                    <div className="tw:mt-2 tw:flex tw:flex-col tw:gap-1.5">
                        <label className="tw:font-normal">
                            <input
                                id="trial_create_plants_per_plot_inherit_treatments"
                                type="checkbox"
                                checked={formData.inheritTreatments}
                                onChange={e => updateField('inheritTreatments', e.target.checked)}
                            />{' '}
                            Inherits Treatment(s) From Plots
                        </label>
                        <label className="tw:font-normal">
                            <input
                                id="trial_create_rows_and_columns_to_plants"
                                type="checkbox"
                                checked={formData.assignRowColToPlants}
                                onChange={e => updateField('assignRowColToPlants', e.target.checked)}
                            />{' '}
                            Assign row and column coordinates to plants within plots?
                        </label>
                    </div>
                    {formData.assignRowColToPlants && (
                        <div className="well well-sm tw:mt-2 tw:flex tw:gap-4">
                            <div>
                                <label>Rows per Plot:</label>
                                <input
                                    id="trial_create_rows_per_plot"
                                    type="number"
                                    className="form-control input-sm"
                                    value={formData.rowsPerPlot}
                                    onChange={e => updateField('rowsPerPlot', e.target.value)}
                                />
                            </div>
                            <div>
                                <label>Columns per Plot:</label>
                                <input
                                    id="trial_create_cols_per_plot"
                                    type="number"
                                    className="form-control input-sm"
                                    value={formData.colsPerPlot}
                                    onChange={e => updateField('colsPerPlot', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">
                    <span className="tw:text-red-500 tw:mr-1">*</span>Description:
                </label>
                <div className="col-sm-9">
                    <textarea
                        id="add_project_description"
                        name="add_project_description"
                        className="form-control"
                        rows={3}
                        value={formData.description}
                        onChange={e => updateField('description', e.target.value)}
                    />
                </div>
            </div>

            <hr />

            <div className="form-group row">
                <label className="col-sm-3 control-label">
                    <span className="tw:text-red-500 tw:mr-1">*</span>Stock Type:
                </label>
                <div className="col-sm-9">
                    <select
                        id="select_stock_type"
                        className="form-control"
                        value={formData.stockType}
                        onChange={e => updateField('stockType', e.target.value as StockType)}
                    >
                        <option value="accession">Accession</option>
                        <option value="cross">Cross</option>
                        <option value="family_name">Family Name</option>
                    </select>
                </div>
            </div>

            <div className="form-group row">
                <label className="col-sm-3 control-label">
                    <span className="tw:text-red-500 tw:mr-1">*</span>Design Type:
                </label>
                <div className="col-sm-9">
                    <select
                        id="select_design_method"
                        name="select_design_method"
                        className="form-control"
                        value={formData.designType}
                        onChange={e => updateField('designType', e.target.value as DesignType)}
                    >
                        {availableDesignTypes.map(d => (
                            <option key={d.value} value={d.value} title={d.label}>{d.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {formData.locations.length > 1 && (
                <div id="randomization_div" className="form-group row">
                    <label className="col-sm-3 control-label">Use same randomization for all locations:</label>
                    <div className="col-sm-9">
                        <div className="checkbox">
                            <label className="tw:font-normal">
                                <input
                                    id="use_same_layout"
                                    type="checkbox"
                                    checked={formData.useSameLayout}
                                    onChange={e => updateField('useSameLayout', e.target.checked)}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
