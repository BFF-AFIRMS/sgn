import { GeneratedDesignPlot, FieldTrialTreatment, ConfirmedTreatment } from '../types';

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
 * Adapts a generated design plot map (from /ajax/trial/generate_experimental_design)
 * into BrAPI ObservationUnit records compatible with FieldMap's derivePlotGrid.
 */
export const designMapToObservationUnits = (
    designMap: Record<string, GeneratedDesignPlot>,
    studyName?: string
): any[] => {
    return Object.entries(designMap)
        .filter(([key, plot]) => (
            key !== 'treatments' &&
            plot &&
            typeof plot === 'object' &&
            (plot.plot_name || plot.plot_number !== undefined)
        ))
        .map(([_, plot]) => {
        const col = parseInt(String(plot.col_number));
        const row = parseInt(String(plot.row_number));

        return {
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
