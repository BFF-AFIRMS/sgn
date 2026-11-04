import React, { useState, useMemo } from 'react';
import { useTrialForm } from '../contexts/TrialFormContext';
import { getDesignTreatments, extractDesignPlots } from '../utils/designAdapters';
import { useParsedDesign } from '../hooks/useParsedDesign';

interface AddTreatmentsModalProps {
    show?: boolean;
    onClose: () => void;
}

/**
 * Fallback management factor types, used when the server does not supply
 * `management_factor_types`.
 */
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

// Initial values for the treatment form fields. 
const DEFAULT_TREATMENT_NAME = '';
const DEFAULT_TREATMENT_TYPE = 'Fertilizer';
const DEFAULT_TREATMENT_DATE = new Date().toISOString().slice(0, 10);
const DEFAULT_TREATMENT_YEAR = String(new Date().getFullYear());
const DEFAULT_TREATMENT_PLANTING_DATE = '';
const DEFAULT_TREATMENT_DESCRIPTION = '';

/**
 * Formats a treatment date as `YYYY/MM/DD HH:mm:ss`, the format expected by the
 * design result's treatment records.
 *
 * A bare `YYYY-MM-DD` value is treated as a calendar date and combined with the
 * current time of day; any other value is parsed by `Date`. A value that cannot
 * be parsed is returned unchanged.
 *
 * @param val The date to format, e.g. a value from an `<input type="date">`.
 * @returns The formatted date string.
 */
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

/**
 * Two-step modal for attaching a field treatment to plots in the current design
 * result.
 *
 * The first step collects the treatment's metadata (name, type, date, year,
 * planting date, description); the second lets the user pick, per trial
 * location, the plots that receive the treatment.
 * 
 * On submit, the selected plots together with their plants and subplots are
 * recorded under the treatment name in each location's `treatments` map, and the
 * updated `design_json` is written back to the wizard's form data.
 */
export const AddTreatmentsModal: React.FC<AddTreatmentsModalProps> = ({ show = true, onClose }) => {
    const { formData, setFormData, serverProps } = useTrialForm();
    const parsedDesign = useParsedDesign(formData);
    const result = formData.designResult ?? null;

    const managementFactorTypes = useMemo(() => {
        const types = serverProps.management_factor_types;
        if (types && types.length > 0) {
            return types;
        }
        return DEFAULT_MANAGEMENT_FACTOR_TYPES;
    }, [serverProps.management_factor_types]);

    const [step, setStep] = useState<1 | 2>(1);
    const [treatmentName, setTreatmentName] = useState(DEFAULT_TREATMENT_NAME);
    const [treatmentType, setTreatmentType] = useState(() => managementFactorTypes[0] || DEFAULT_TREATMENT_TYPE);
    const [treatmentDate, setTreatmentDate] = useState(DEFAULT_TREATMENT_DATE);
    const [treatmentYear, setTreatmentYear] = useState(() => formData.year || DEFAULT_TREATMENT_YEAR);
    const [treatmentPlantingDate, setTreatmentPlantingDate] = useState(() => formData.plantingDate || DEFAULT_TREATMENT_PLANTING_DATE);
    const [treatmentDescription, setTreatmentDescription] = useState(DEFAULT_TREATMENT_DESCRIPTION);

    const [selectedPlots, setSelectedPlots] = useState<Record<number, Set<string>>>({});

    const plotsByTrial = useMemo(
        () => parsedDesign.map(extractDesignPlots),
        [parsedDesign]
    );

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
        if (!result || parsedDesign.length === 0) return;

        const formattedDate = formatTreatmentDate(treatmentDate);

        const newDesignArray = parsedDesign.map((design, i) => {
            const existingTreatments = { ...getDesignTreatments(design) };

            const selectedSet = selectedPlots[i] || new Set();
            const trialPlots = plotsByTrial[i] || [];

            const stocksForTrial: string[] = [];
            trialPlots.forEach(plot => {
                if (selectedSet.has(plot.plot_name)) {
                    stocksForTrial.push(plot.plot_name);
                    stocksForTrial.push(...(plot.plant_names || []));
                    stocksForTrial.push(...(plot.subplots_names || []));
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

            return JSON.stringify({
                ...design,
                treatments: existingTreatments
            });
        });

        setFormData(prev => ({
            ...prev,
            designResult: {
                ...(prev.designResult ?? {}),
                design_json: JSON.stringify(newDesignArray)
            }
        }));

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
                                    defaultValue={treatmentName}
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
                                    defaultValue={treatmentType}
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
                                    defaultValue={treatmentDate}
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
                                    defaultValue={treatmentYear}
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
                                    defaultValue={treatmentPlantingDate}
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
                                    defaultValue={treatmentDescription}
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
                                                            defaultChecked={allSelected}
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
                                                                    defaultChecked={isChecked}
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
