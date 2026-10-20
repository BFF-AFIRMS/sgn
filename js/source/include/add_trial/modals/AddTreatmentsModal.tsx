import React, { useState, useEffect, useMemo } from 'react';
import { useTrialForm } from '../contexts/TrialFormContext';
import { useDesignResult } from '../contexts/DesignResultContext';
import { FieldTrialTreatment } from '../types';

interface AddTreatmentsModalProps {
    show: boolean;
    onClose: () => void;
}

const DEFAULT_MANAGEMENT_FACTOR_TYPES = [
    'Fertilizer',
    'Fungicide',
    'Irrigation',
    'Drought',
    'Herbicide',
    'Weeding',
    'Pruning',
    'Hormone treatment',
    'Light treatment'
];

const formatTreatmentDate = (val?: string): string => {
    let d: Date;
    if (val) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [y, m, day] = val.split('-').map(Number);
            const now = new Date();
            d = new Date(y, m - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        } else {
            d = new Date(val);
        }
    } else {
        d = new Date();
    }
    if (isNaN(d.getTime())) return val || '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const AddTreatmentsModal: React.FC<AddTreatmentsModalProps> = ({ show, onClose }) => {
    const { formData, serverProps } = useTrialForm();
    const { result, setResult, parsedDesigns } = useDesignResult();

    const managementFactorTypes = useMemo(() => {
        if (serverProps.management_factor_types && serverProps.management_factor_types.length > 0) {
            return serverProps.management_factor_types;
        }
        return DEFAULT_MANAGEMENT_FACTOR_TYPES;
    }, [serverProps.management_factor_types]);

    const [step, setStep] = useState<1 | 2>(1);
    const [treatmentName, setTreatmentName] = useState('');
    const [treatmentType, setTreatmentType] = useState('');
    const [treatmentDate, setTreatmentDate] = useState('');
    const [treatmentYear, setTreatmentYear] = useState('');
    const [treatmentPlantingDate, setTreatmentPlantingDate] = useState('');
    const [treatmentDescription, setTreatmentDescription] = useState('');

    const [selectedPlots, setSelectedPlots] = useState<Record<number, Set<string>>>({});

    useEffect(() => {
        if (show) {
            setStep(1);
            setTreatmentName('');
            setTreatmentType(managementFactorTypes[0] || 'Fertilizer');
            setTreatmentDate(new Date().toISOString().slice(0, 10));
            setTreatmentYear(formData.year || String(new Date().getFullYear()));
            setTreatmentPlantingDate(formData.plantingDate || '');
            setTreatmentDescription('');
            setSelectedPlots({});
        }
    }, [show, managementFactorTypes, formData.year, formData.plantingDate]);

    const plotsByTrial = useMemo(() => {
        return parsedDesigns.map(designMap => {
            return Object.entries(designMap)
                .filter(([key, plot]) => key !== 'treatments' && plot && typeof plot === 'object' && (plot.plot_name || plot.plot_number !== undefined))
                .map(([_, plot]) => plot)
                .sort((a, b) => {
                    const numA = parseInt(String(a.plot_number || 0), 10);
                    const numB = parseInt(String(b.plot_number || 0), 10);
                    return isNaN(numA) || isNaN(numB)
                        ? String(a.plot_name).localeCompare(String(b.plot_name))
                        : numA - numB;
                });
        });
    }, [parsedDesigns]);

    const handleContinue = () => {
        if (!treatmentName.trim()) {
            alert('Please enter a treatment name.');
            return;
        }
        if (plotsByTrial.length === 0 || plotsByTrial.every(p => p.length === 0)) {
            alert('No experimental plots found in current design layout.');
            return;
        }
        setStep(2);
    };

    const togglePlot = (trialIndex: number, plotName: string, isChecked: boolean) => {
        setSelectedPlots(prev => {
            const currentSet = new Set(prev[trialIndex] || []);
            if (isChecked) {
                currentSet.add(plotName);
            } else {
                currentSet.delete(plotName);
            }
            return { ...prev, [trialIndex]: currentSet };
        });
    };

    const toggleSelectAllTrial = (trialIndex: number, isChecked: boolean) => {
        const plots = plotsByTrial[trialIndex] || [];
        setSelectedPlots(prev => {
            const currentSet = new Set(prev[trialIndex] || []);
            if (isChecked) {
                plots.forEach(p => currentSet.add(p.plot_name));
            } else {
                plots.forEach(p => currentSet.delete(p.plot_name));
            }
            return { ...prev, [trialIndex]: currentSet };
        });
    };

    const handleSubmit = () => {
        let totalSelected = 0;
        Object.values(selectedPlots).forEach(set => {
            totalSelected += set.size;
        });

        if (totalSelected === 0) {
            alert('Please select at least one plot for this treatment.');
            return;
        }
        if (!result?.design_json) return;

        let raw: string[];
        try {
            raw = JSON.parse(result.design_json);
        } catch {
            alert('Error parsing existing trial design data.');
            return;
        }

        const newDesignArray: string[] = [];
        const formattedDate = formatTreatmentDate(treatmentDate);

        for (let i = 0; i < raw.length; i++) {
            const designHash: Record<string, unknown> = JSON.parse(raw[i]);

            const existingTreatments: Record<string, FieldTrialTreatment> =
                (designHash['treatments'] as Record<string, FieldTrialTreatment>) || {};

            const selectedSet = selectedPlots[i] || new Set();
            const trialPlots = plotsByTrial[i] || [];

            const stocksForTrial: string[] = [];
            trialPlots.forEach(plot => {
                if (selectedSet.has(plot.plot_name)) {
                    stocksForTrial.push(plot.plot_name);
                    if (Array.isArray(plot.plant_names)) {
                        stocksForTrial.push(...plot.plant_names);
                    }
                    if (Array.isArray(plot.subplots_names)) {
                        stocksForTrial.push(...plot.subplots_names);
                    }
                }
            });

            if (stocksForTrial.length > 0) {
                existingTreatments[treatmentName] = {
                    new_treatment_stocks: stocksForTrial,
                    new_treatment_type: treatmentType,
                    new_treatment_date: formattedDate,
                    new_treatment_year: treatmentYear,
                    new_treatment_planting_date: treatmentPlantingDate,
                    new_treatment_description: treatmentDescription
                };
            }

            designHash['treatments'] = existingTreatments;
            newDesignArray.push(JSON.stringify(designHash));
        }

        setResult({
            ...result,
            design_json: JSON.stringify(newDesignArray)
        });

        onClose();
    };

    if (!show) return null;

    if (step === 1) {
        return (
            <div id="trial_design_add_treatments" className="modal show tw:block tw:bg-black/50" tabIndex={-1}>
                <div className="modal-dialog modal-md">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button type="button" className="close" onClick={onClose}>&times;</button>
                            <h4 className="modal-title tw:font-bold">Add Field Trial Treatments</h4>
                        </div>
                        <div className="modal-body tw:space-y-3">
                            <div className="form-group">
                                <label htmlFor="new_treatment_name">Treatment Name:</label>
                                <input
                                    id="new_treatment_name"
                                    name="new_treatment_name"
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Inoculation 1"
                                    value={treatmentName}
                                    onChange={e => setTreatmentName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="new_treatment_type">Treatment Type:</label>
                                <select
                                    id="new_treatment_type"
                                    name="new_treatment_type"
                                    className="form-control"
                                    value={treatmentType}
                                    onChange={e => setTreatmentType(e.target.value)}
                                >
                                    {managementFactorTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="new_treatment_date">Date of Treatment:</label>
                                <input
                                    id="new_treatment_date"
                                    name="new_treatment_date"
                                    type="date"
                                    className="form-control"
                                    value={treatmentDate}
                                    onChange={e => setTreatmentDate(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="new_treatment_year">Treatment Year:</label>
                                <input
                                    id="new_treatment_year"
                                    name="new_treatment_year"
                                    type="text"
                                    className="form-control"
                                    value={treatmentYear}
                                    onChange={e => setTreatmentYear(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="new_treatment_planting_date">Treatment Planting Date:</label>
                                <input
                                    id="new_treatment_planting_date"
                                    name="new_treatment_planting_date"
                                    type="date"
                                    className="form-control"
                                    value={treatmentPlantingDate}
                                    onChange={e => setTreatmentPlantingDate(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="new_treatment_description">Treatment Description:</label>
                                <textarea
                                    id="new_treatment_description"
                                    name="new_treatment_description"
                                    className="form-control"
                                    rows={3}
                                    value={treatmentDescription}
                                    onChange={e => setTreatmentDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-default" onClick={onClose}>Cancel</button>
                            <button
                                type="button"
                                id="new_trial_add_treatments_continue"
                                className="btn btn-primary"
                                onClick={handleContinue}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div id="trial_design_add_treatment_select" className="modal show tw:block tw:bg-black/50" tabIndex={-1}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={onClose}>&times;</button>
                        <h4 className="modal-title tw:font-bold">Select Plots for Treatment: {treatmentName}</h4>
                    </div>
                    <div className="modal-body">
                        <p className="tw:text-gray-600">Check the plots that will receive this treatment.</p>
                        <div id="trial_design_add_treatment_select_html" className="tw:max-h-[60vh] tw:overflow-y-auto">
                            {plotsByTrial.map((plots, trialIndex) => {
                                const locName = formData.locations[trialIndex] || (plots[0] && plots[0].studyName) || `Location ${trialIndex + 1}`;
                                const trialSelected = selectedPlots[trialIndex] || new Set();
                                const allSelected = plots.length > 0 && plots.every(p => trialSelected.has(p.plot_name));

                                return (
                                    <div key={trialIndex} className="tw:mb-5">
                                        {formData.locations.length > 1 && (
                                            <h4 className="tw:font-bold tw:mb-2">{locName}</h4>
                                        )}
                                        <table className="table table-hover table-striped table-bordered tw:text-sm">
                                            <thead>
                                                <tr>
                                                    <th>plot_name</th>
                                                    <th>accession</th>
                                                    <th>plot_number</th>
                                                    <th>block_number</th>
                                                    <th>rep_number</th>
                                                    <th>is_a_control</th>
                                                    <th>row_number</th>
                                                    <th>col_number</th>
                                                    <th className="table-success tw:bg-green-50 tw:whitespace-nowrap">
                                                        {treatmentName} [Select all{' '}
                                                        <input
                                                            type="checkbox"
                                                            name="add_trial_treatment_select_all"
                                                            checked={allSelected}
                                                            onChange={e => toggleSelectAllTrial(trialIndex, e.target.checked)}
                                                        />]
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {plots.map(p => {
                                                    const isChecked = trialSelected.has(p.plot_name);
                                                    return (
                                                        <tr key={p.plot_name}>
                                                            <td>{p.plot_name}</td>
                                                            <td>{p.stock_name}</td>
                                                            <td>{p.plot_number}</td>
                                                            <td>{p.block_number}</td>
                                                            <td>{p.rep_number}</td>
                                                            <td>{p.is_a_control ? 1 : 0}</td>
                                                            <td>{p.row_number ?? ''}</td>
                                                            <td>{p.col_number ?? ''}</td>
                                                            <td className="tw:text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    name="add_trial_treatment_input"
                                                                    data-plot_name={p.plot_name}
                                                                    data-trial_index={trialIndex}
                                                                    data-trial_treatment={treatmentName}
                                                                    data-plant_names={JSON.stringify(p.plant_names || [])}
                                                                    data-subplot_names={JSON.stringify(p.subplots_names || [])}
                                                                    checked={isChecked}
                                                                    onChange={e => togglePlot(trialIndex, p.plot_name, e.target.checked)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-default" onClick={() => setStep(1)}>Back</button>
                        <button
                            type="button"
                            id="new_trial_add_treatments_submit"
                            className="btn btn-primary"
                            onClick={handleSubmit}
                        >
                            Save Treatment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
