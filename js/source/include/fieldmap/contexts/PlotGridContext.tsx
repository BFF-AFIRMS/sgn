import React, { createContext, useContext, useState, useMemo } from 'react';
import { Plot } from '../model.types';
import { useLayoutConfig } from './LayoutConfigContext';
import { FieldMapContextProps } from '../context.types';

export interface GridBounds {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
    numRows: number;
    numCols: number;
}

interface PlotGridContextType {
    plotList: Plot[];
    bounds: GridBounds;
    renderBounds: GridBounds;
    svgDimensions: { width: number; height: number };
    gridMatrix: Plot[][];

    dimensions: { rows: number; cols: number };
    setDimensions: React.Dispatch<React.SetStateAction<{ rows: number; cols: number }>>;

    fillerAccessionId: string | undefined;
    setFillerAccessionId: React.Dispatch<React.SetStateAction<string | undefined>>;

    parsePlotData: (data: any[]) => void;
    recalculateLayout: (layout: 'serpentine' | 'zigzag') => void;

    transposeLayout: () => void;
    rotateLayout: () => void;

    isTransposed: boolean;
    mapRotation: number;
}

const PlotGridContext = createContext<PlotGridContextType | undefined>(undefined);

export const PlotGridProvider: React.FC<FieldMapContextProps> = ({ children }) => {
    const { topBorder, bottomBorder, leftBorder, rightBorder } = useLayoutConfig();
    const [plotObject, setPlotObject] = useState<Record<string, Plot>>({});
    const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });
    const [fillerAccessionId, setFillerAccessionId] = useState<string | undefined>(undefined);
    const [isTransposed, setIsTransposed] = useState<boolean>(false);
    const [mapRotation, setMapRotation] = useState<number>(0);

    const plotList = useMemo(() => {
        return Object.values(plotObject);
    }, [plotObject]);

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

    const svgDimensions = useMemo(() => {
        return {
            width: (renderBounds.numCols + 1) * 55 + 50,
            height: (renderBounds.numRows + 1) * 55 + 50
        };
    }, [renderBounds]);


    const parsePlotData = (data: any[]) => {
        const mapped: Record<string, Plot> = {};
        const pseudo_layout: Record<string, number> = {};

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        setIsTransposed(false);
        setMapRotation(0);

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

    const gridMatrix = useMemo(() => {
        const { minCol, maxCol, minRow, maxRow } = renderBounds;
        const matrix: Plot[][] = [];
        const indexed: Record<string, Plot[]> = {};

        plotList.forEach(p => {
            const x = Number(p.observationUnitPosition.positionCoordinateX);
            const y = Number(p.observationUnitPosition.positionCoordinateY);
            const key = `${x}-${y}`;
            if (!indexed[key]) indexed[key] = [];
            indexed[key].push(p);
        });

        for (let r = minRow; r <= maxRow; r++) {
            const rowArr: Plot[] = [];
            for (let c = minCol; c <= maxCol; c++) {
                const key = `${c}-${r}`;
                const found = indexed[key];
                if (found && found.length > 0) {
                    rowArr.push(found[0]);
                } else {
                    const isBorder = (r < bounds.minRow || r > bounds.maxRow || c < bounds.minCol || c > bounds.maxCol);
                    rowArr.push({
                        type: isBorder ? 'border' : (fillerAccessionId ? 'filler' : 'empty_space'),
                        observationUnitName: isBorder ? `Border (${c}_${r})` : (fillerAccessionId ? `Filler (${c}_${r})` : `Space (${c}_${r})`),
                        observationUnitPosition: {
                            positionCoordinateX: c,
                            positionCoordinateY: r,
                            observationLevel: { levelCode: '', levelName: 'plot' },
                            entryType: isBorder ? 'border' : (fillerAccessionId ? 'filler' : undefined)
                        }
                    });
                }
            }
            matrix.push(rowArr);
        }

        return matrix;
    }, [bounds, renderBounds, plotList, fillerAccessionId]);

    const recalculateLayout = (layout: 'serpentine' | 'zigzag') => {
        setPlotObject(currentPlots => {
            const rows = dimensions.rows || bounds.numRows;
            const cols = dimensions.cols || bounds.numCols;

            const plotsArr = Object.values(currentPlots).filter(p => !!p.observationUnitDbId);

            let minC = Infinity, minR = Infinity;
            plotsArr.forEach(p => {
                const x = Number(p.observationUnitPosition.positionCoordinateX);
                const y = Number(p.observationUnitPosition.positionCoordinateY);
                if (x < minC) minC = x;
                if (y < minR) minR = y;
            });
            if (minC === Infinity) minC = 1;
            if (minR === Infinity) minR = 1;

            const sortedPlots = [...plotsArr];
            sortedPlots.sort((a, b) => {
                const codeA = parseFloat(String(a.observationUnitPosition?.observationLevel?.levelCode)) || 0;
                const codeB = parseFloat(String(b.observationUnitPosition?.observationLevel?.levelCode)) || 0;
                return codeA - codeB;
            });

            const newPlotObject: Record<string, Plot> = {};
            let plotIdx = 0;
            for (let r = 0; r < rows; r++) {
                const currentRow = minR + r;
                const swap_columns = layout === 'serpentine' && (currentRow % 2 === 0);

                for (let c = 0; c < cols; c++) {
                    if (plotIdx < sortedPlots.length) {
                        const plot = sortedPlots[plotIdx];
                        const currentCol = swap_columns ? (minC + cols - 1 - c) : (minC + c);

                        newPlotObject[plot.observationUnitDbId!] = {
                            ...plot,
                            observationUnitPosition: {
                                ...plot.observationUnitPosition,
                                positionCoordinateX: currentCol,
                                positionCoordinateY: currentRow,
                            }
                        };
                        plotIdx++;
                    }
                }
            }
            return newPlotObject;
        });
    };

    const transposeLayout = () => {
        setIsTransposed(t => !t);
        setPlotObject(current => {
            const transposed: Record<string, Plot> = {};
            for (const [id, plot] of Object.entries(current)) {
                transposed[id] = {
                    ...plot,
                    observationUnitPosition: {
                        ...plot.observationUnitPosition,
                        positionCoordinateX: plot.observationUnitPosition.positionCoordinateY,
                        positionCoordinateY: plot.observationUnitPosition.positionCoordinateX
                    }
                };
            }
            return transposed;
        });
        setDimensions(d => ({ rows: d.cols, cols: d.rows }));
    };

    const rotateLayout = () => {
        setMapRotation(r => (r + 90) % 360);
        const { minCol, maxCol } = bounds;
        setPlotObject(current => {
            const rotated: Record<string, Plot> = {};
            for (const [id, plot] of Object.entries(current)) {
                const oldX = Number(plot.observationUnitPosition.positionCoordinateX);
                const oldY = Number(plot.observationUnitPosition.positionCoordinateY);

                rotated[id] = {
                    ...plot,
                    observationUnitPosition: {
                        ...plot.observationUnitPosition,
                        positionCoordinateX: oldY,
                        positionCoordinateY: maxCol - oldX + minCol
                    }
                };
            }
            return rotated;
        });
        setDimensions(d => ({ rows: d.cols, cols: d.rows }));
    };

    return (
        <PlotGridContext.Provider value={{
            plotList,
            dimensions,
            setDimensions,
            bounds,
            renderBounds,
            svgDimensions,
            parsePlotData,
            fillerAccessionId,
            setFillerAccessionId,
            gridMatrix,
            transposeLayout,
            rotateLayout,
            recalculateLayout,
            isTransposed,
            mapRotation
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
