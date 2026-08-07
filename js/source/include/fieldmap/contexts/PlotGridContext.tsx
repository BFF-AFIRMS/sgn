import React, { createContext, useContext, useState, useMemo } from 'react';
import { Plot } from '../types';
import { useBorder } from './BorderContext';

export interface GridBounds {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
    numRows: number;
    numCols: number;
}

interface PlotGridContextType {
    plotObject: Record<string, Plot>;
    setPlotObject: React.Dispatch<React.SetStateAction<Record<string, Plot>>>;
    plotList: Plot[];
    dimensions: { rows: number; cols: number };
    setDimensions: React.Dispatch<React.SetStateAction<{ rows: number; cols: number }>>;
    bounds: GridBounds;
    renderBounds: GridBounds;
    parsePlotData: (data: any[]) => void;
}

const PlotGridContext = createContext<PlotGridContextType | undefined>(undefined);

export const PlotGridProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { topBorder, bottomBorder, leftBorder, rightBorder } = useBorder();
    const [plotObject, setPlotObject] = useState<Record<string, Plot>>({});
    const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

    const plotList = useMemo(() => {
        return Object.values(plotObject);
    }, [plotObject]);

    const parsePlotData = (data: any[]) => {
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
        setPlotObject(mapped);
        setDimensions({
            rows: isFinite(maxY) ? maxY - minY + 1 : 0,
            cols: isFinite(maxX) ? maxX - minX + 1 : 0
        });
    };

    const bounds = useMemo(() => {
        if (plotList.length === 0) {
            return {
                minCol: 1,
                maxCol: dimensions.cols || 1,
                minRow: 1,
                maxRow: dimensions.rows || 1,
                numRows: dimensions.rows || 1,
                numCols: dimensions.cols || 1
            };
        }
        let minCol = Infinity;
        let minRow = Infinity;
        let maxCol = -Infinity;
        let maxRow = -Infinity;

        plotList.forEach(p => {
            const x = Number(p.observationUnitPosition.positionCoordinateX);
            const y = Number(p.observationUnitPosition.positionCoordinateY);
            if (!isNaN(x)) {
                if (x < minCol) minCol = x;
                if (x > maxCol) maxCol = x;
            }
            if (!isNaN(y)) {
                if (y < minRow) minRow = y;
                if (y > maxRow) maxRow = y;
            }
        });

        if (minCol === Infinity) minCol = 1;
        if (maxCol === -Infinity) maxCol = 1;
        if (minRow === Infinity) minRow = 1;
        if (maxRow === -Infinity) maxRow = 1;

        let finalMaxCol = maxCol;
        let finalMaxRow = maxRow;

        if (dimensions.cols > (maxCol - minCol + 1)) {
            finalMaxCol = minCol + dimensions.cols - 1;
        }
        if (dimensions.rows > (maxRow - minRow + 1)) {
            finalMaxRow = minRow + dimensions.rows - 1;
        }

        return {
            minCol,
            maxCol: finalMaxCol,
            minRow,
            maxRow: finalMaxRow,
            numRows: finalMaxRow - minRow + 1,
            numCols: finalMaxCol - minCol + 1
        };
    }, [plotList, dimensions]);

    const renderBounds = useMemo(() => {
        const { minCol, maxCol, minRow, maxRow } = bounds;
        const rMinCol = leftBorder ? minCol - 1 : minCol;
        const rMaxCol = rightBorder ? maxCol + 1 : maxCol;
        const rMinRow = bottomBorder ? minRow - 1 : minRow;
        const rMaxRow = topBorder ? maxRow + 1 : maxRow;

        return {
            minCol: rMinCol,
            maxCol: rMaxCol,
            minRow: rMinRow,
            maxRow: rMaxRow,
            numRows: rMaxRow - rMinRow + 1,
            numCols: rMaxCol - rMinCol + 1
        };
    }, [bounds, topBorder, bottomBorder, leftBorder, rightBorder]);

    return (
        <PlotGridContext.Provider value={{
            plotObject,
            setPlotObject,
            plotList,
            dimensions,
            setDimensions,
            bounds,
            renderBounds,
            parsePlotData
        }}>
            {children}
        </PlotGridContext.Provider>
    );
};

export const usePlotGrid = () => {
    const context = useContext(PlotGridContext);
    if (!context) {
        throw new Error('usePlotGrid must be used within a PlotGridProvider');
    }
    return context;
};
