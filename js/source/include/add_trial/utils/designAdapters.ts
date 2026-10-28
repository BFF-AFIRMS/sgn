import { GeneratedDesignPlot, FieldTrialTreatment, ConfirmedTreatment, SplitplotTreatment } from '../types';
import { Plot } from '../../fieldmap/types';

/**
 * Extracts and sorts plot records from a raw design layout map,
 * filtering out metadata keys such as 'treatments'.
 */
export const extractDesignPlots = (
    design?: Record<string, unknown>
): GeneratedDesignPlot[] => {
    if (!design) return [];
    return Object.entries(design)
        .filter(([key, plot]) => (
            key !== 'treatments' &&
            plot &&
            typeof plot === 'object' &&
            (('plot_name' in plot) || ('plot_number' in plot))
        ))
        .map(([_, plot]) => plot as GeneratedDesignPlot)
        .sort((a, b) => {
            const numA = parseInt(String(a.plot_number ?? ''), 10);
            const numB = parseInt(String(b.plot_number ?? ''), 10);
            if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                return numA - numB;
            }
            return String(a.plot_name || '').localeCompare(String(b.plot_name || ''));
        });
};

/**
 * Safely extracts the treatments dictionary from a design map.
 */
export const getDesignTreatments = (
    design?: Record<string, unknown>
): Record<string, FieldTrialTreatment> => {
    const treatments = design?.treatments;
    if (treatments && typeof treatments === 'object' && !Array.isArray(treatments)) {
        return treatments as Record<string, FieldTrialTreatment>;
    }
    return {};
};

/**
 * Aggregates field treatments defined across one or more design layouts,
 * combining stock lists for treatments shared across multiple locations.
 */
export const extractConfirmedTreatments = (
    designs: Array<Record<string, unknown>>
): ConfirmedTreatment[] => {
    const seen = new Map<string, { type?: string; stocks: Set<string> }>();

    for (const design of designs) {
        const treatments = getDesignTreatments(design);
        for (const [key, val] of Object.entries(treatments)) {
            // Split-plot designs also store their subplot/plant metadata under
            // the "treatments" key; only entries describing an actual field
            // treatment carry a list of treated stocks.
            if (!Array.isArray(val?.new_treatment_stocks)) {
                continue;
            }
            if (!seen.has(key)) {
                seen.set(key, {
                    type: val.new_treatment_type,
                    stocks: new Set(val.new_treatment_stocks || [])
                });
            } else {
                const entry = seen.get(key)!;
                (val.new_treatment_stocks || []).forEach(s => entry.stocks.add(s));
            }
        }
    }

    return Array.from(seen.entries()).map(([name, entry]) => ({
        name,
        type: entry.type,
        stocks: Array.from(entry.stocks)
    }));
};

/**
 * Groups splitplot treatments by factor name and computes the total subplots per plot.
 */
export const getSplitplotTreatments = (
    treatments?: SplitplotTreatment[]
): { treatmentsMap: Record<string, string[]>; subplotsPerPlot: number } => {
    const treatmentsMap: Record<string, string[]> = {};
    let subplotsPerPlot = 1;

    if (!treatments) {
        return { treatmentsMap, subplotsPerPlot };
    }

    for (const t of treatments) {
        const name = t.name.trim();
        const value = t.value.trim();
        if (name && value) {
            if (!treatmentsMap[name]) {
                treatmentsMap[name] = [];
            }
            treatmentsMap[name].push(value);
        }
    }

    for (const vals of Object.values(treatmentsMap)) {
        if (vals.length > 0) {
            subplotsPerPlot *= vals.length;
        }
    }

    return { treatmentsMap, subplotsPerPlot };
};

/**
 * Converts generated design plots into BrAPI ObservationUnit records
 * compatible with FieldMap's derivePlotGrid.
 */
export const designPlotsToObservationUnits = (
    plots: GeneratedDesignPlot[],
    studyName?: string
): Plot[] => {
    return plots.map(plot => {
        const col = parseInt(String(plot.col_number));
        const row = parseInt(String(plot.row_number));

        return {
            type: 'data',
            observationUnitDbId: String(plot.plot_name || plot.plot_number),
            observationUnitName: String(plot.plot_name),
            germplasmName: String(plot.stock_name),
            studyName: studyName || '',
            observationUnitPosition: {
                positionCoordinateX: !isNaN(col) ? col : undefined,
                positionCoordinateY: !isNaN(row) ? row : undefined,
                observationLevel: {
                    levelCode: String(plot.plot_number),
                    levelName: 'plot'
                },
                observationLevelRelationships: [
                    { levelName: 'rep', levelCode: String(plot.rep_number || '1') },
                    { levelName: 'block', levelCode: String(plot.block_number || '1') }
                ],
                entryType: plot.is_a_control ? 'check' : undefined
            },
            additionalInfo: {
                is_a_control: Boolean(plot.is_a_control)
            }
        };
    });
};

/**
 * Adapts a raw design layout map into BrAPI ObservationUnit records.
 */
export const designMapToObservationUnits = (
    designMap: Record<string, unknown>,
    studyName?: string
): Plot[] => {
    return designPlotsToObservationUnits(extractDesignPlots(designMap), studyName);
};
