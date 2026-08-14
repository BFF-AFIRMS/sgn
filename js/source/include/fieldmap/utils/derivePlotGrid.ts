import { Plot } from '../types';

export interface DerivedGridResult {
    plotObject: Record<string, Plot>;
    dimensions: {
        rows: number;
        cols: number;
    };
}

export const derivePlotGrid = (data: any[]): DerivedGridResult => {
    const mapped: Record<string, Plot> = {};
    const pseudo_layout: Record<string, number> = {};

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    data.forEach(plot => {
        let x = parseInt(plot.observationUnitPosition?.positionCoordinateX);
        let y = parseInt(plot.observationUnitPosition?.positionCoordinateY);

        if (isNaN(y)) {
            const rel = plot.observationUnitPosition?.observationLevelRelationships || [];
            const blockRel = rel.find((r: any) => r.levelName === 'block');
            const repRel = rel.find((r: any) => r.levelName === 'rep');
            const plotRel = rel.find((r: any) => r.levelName === 'plot');
            const code = blockRel?.levelCode || repRel?.levelCode || plotRel?.levelCode || '1';
            y = parseInt(code);
            if (isNaN(y)) y = 1;
        }

        if (isNaN(x)) {
            if (pseudo_layout[y] !== undefined) {
                pseudo_layout[y] += 1;
                x = pseudo_layout[y];
            } else {
                pseudo_layout[y] = 1;
                x = 1;
            }
        }

        if (!isNaN(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
        if (!isNaN(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }

        if (plot.observationUnitPosition?.observationLevel?.levelName === 'plot') {
            let type: Plot['type'] = 'data';
            if (plot.observationUnitPosition.entryType === 'filler' || plot.germplasmName === 'Filler') type = 'filler';
            else if (plot.observationUnitPosition.entryType === 'border') type = 'border';

            mapped[plot.observationUnitDbId] = {
                type,
                observationUnitDbId: plot.observationUnitDbId,
                observationUnitName: plot.observationUnitName,
                observationUnitPosition: {
                    positionCoordinateX: x,
                    positionCoordinateY: y,
                    observationLevel: plot.observationUnitPosition.observationLevel,
                    observationLevelRelationships: plot.observationUnitPosition.observationLevelRelationships,
                    entryType: plot.observationUnitPosition.entryType
                },
                germplasmDbId: plot.germplasmDbId,
                germplasmName: plot.germplasmName,
                crossName: plot.crossName,
                locationName: plot.locationName,
                studyName: plot.studyName,
                plotImageDbIds: plot.plotImageDbIds || [],
                additionalInfo: plot.additionalInfo || {}
            };
        }
    });

    const rows = isFinite(maxY) ? maxY - minY + 1 : 0;
    const cols = isFinite(maxX) ? maxX - minX + 1 : 0;
    
    return {
        plotObject: mapped,
        dimensions: { rows, cols }
    };
};