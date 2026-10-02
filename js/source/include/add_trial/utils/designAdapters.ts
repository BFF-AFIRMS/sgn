import { GeneratedDesignPlot } from '../types';

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
