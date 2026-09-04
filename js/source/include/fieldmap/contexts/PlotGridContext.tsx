import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Plot, PlotStructureNode } from '../types';
import { SecondaryAxis, useLayoutConfig } from './LayoutConfigContext';
import { FieldMapContextProps } from '../types';
import { useModals } from './ModalsContext';
import { useView } from './ViewContext';
import { derivePlotGrid } from '../utils/derivePlotGrid';

export interface GridBounds {
    readonly minCol: number;
    readonly maxCol: number;
    readonly minRow: number;
    readonly maxRow: number;
    readonly numRows: number;
    readonly numCols: number;
}

export interface AxisOrientation {
    readonly x: { source: 'x' | 'y'; reversed: boolean };
    readonly y: { source: 'x' | 'y'; reversed: boolean };
}

export interface PlotGridContextType {
    plotList: Plot[];
    overlappingPlots: Record<string, Plot[]>;
    bounds: GridBounds;
    renderBounds: GridBounds;
    svgDimensions: { width: number; height: number };
    gridMatrix: Plot[][];

    fetchObservationUnits: () => Promise<void>;
    recalculateLayout: (layout: 'serpentine' | 'zigzag') => void;
    mutatePlot: (plotId: string | Plot, updatedFields: Partial<Plot>) => void;

    dimensions: { rows: number; cols: number };
    applyDimensions: (rowsInput: string, colsInput: string, fillerAccessionInput?: string) => Promise<void>;

    fillerAccessionId: string | undefined;
    setFillerAccessionId: React.Dispatch<React.SetStateAction<string | undefined>>;
    fillerAccessionName: string | undefined;
    setFillerAccessionName: React.Dispatch<React.SetStateAction<string | undefined>>;

    transposeLayout: () => void;
    rotateLayout: () => void;
    axisOrientation: AxisOrientation;

    plotStructure: PlotStructureNode | null;
    setPlotStructure: React.Dispatch<React.SetStateAction<PlotStructureNode | null>>;
    plotContentCache: Record<string, string[]>;
    setPlotContentCache: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
    plotImages: string;
    setPlotImages: React.Dispatch<React.SetStateAction<string>>;

    transformedSecondaryAxis: SecondaryAxis | undefined;
}

const PlotGridContext = createContext<PlotGridContextType | undefined>(undefined);

export const PlotGridProvider: React.FC<FieldMapContextProps> = ({ trialId, authToken, children }) => {
    const {
        topBorder, setTopBorder,
        bottomBorder, setBottomBorder,
        leftBorder, setLeftBorder,
        rightBorder, setRightBorder,
        plotLayout,
        setInvertCols,
        setInvertRows,
        setPlotLayout,
        setColorVar,
        setLabelVar,
        setLabelSize,
        setNorthArrowAngle,
        secondaryAxis,
        hasSecondaryAxis
    } = useLayoutConfig();

    const {
        activeTrialIds
    } = useView();

    const {
        setLoading
    } = useModals();

    const [plotObject, setPlotObject] = useState<Record<string, Plot>>({});
    const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });
    const [fillerAccessionId, setFillerAccessionId] = useState<string | undefined>(undefined);
    const [fillerAccessionName, setFillerAccessionName] = useState<string | undefined>(undefined);
    const [axisOrientation, setAxisOrientation] = useState<AxisOrientation>({
        x: { source: 'x', reversed: false },
        y: { source: 'y', reversed: false }
    });

    const [plotStructure, setPlotStructure] = useState<PlotStructureNode | null>(null);
    const [plotContentCache, setPlotContentCache] = useState<Record<string, string[]>>({});
    const [plotImages, setPlotImages] = useState<string>('');

    const plotList = useMemo(() => {
        return Object.values(plotObject);
    }, [plotObject]);

    const overlappingPlots = useMemo(() => {
        const positions: Record<string, Plot[]> = {};
        plotList.forEach(p => {
            const x = p.observationUnitPosition?.positionCoordinateX;
            const y = p.observationUnitPosition?.positionCoordinateY;
            if (x !== undefined && y !== undefined) {
                const key = `${x}-${y}`;
                if (!positions[key]) positions[key] = [];
                positions[key].push(p);
            }
        });
        const overlaps: Record<string, Plot[]> = {};
        Object.entries(positions).forEach(([key, plots]) => {
            if (plots.length > 1) overlaps[key] = plots;
        });
        return overlaps;
    }, [plotList]);

    const bounds = useMemo(() => {
        return {
            minCol: 1,
            maxCol: dimensions.cols || 1,
            minRow: 1,
            maxRow: dimensions.rows || 1,
            numRows: dimensions.rows || 1,
            numCols: dimensions.cols || 1
        };
    }, [dimensions]);

    /**
     * Computed bounds including borders
     */
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
        const extraWidth = hasSecondaryAxis ? 140 : 50;
        const extraHeight = hasSecondaryAxis ? 140 : 50;
        return {
            width: (renderBounds.numCols + 1) * 55 + extraWidth,
            height: (renderBounds.numRows + 1) * 55 + extraHeight
        };
    }, [renderBounds, hasSecondaryAxis]);


    const parsePlotData = useCallback((data: any[]) => {
        setAxisOrientation({
            x: { source: 'x', reversed: false },
            y: { source: 'y', reversed: false }
        });

        const {
            plotObject,
            dimensions: { rows, cols }
        } = derivePlotGrid(data);

        setPlotObject(plotObject);
        setDimensions({ rows, cols });
    }, []);

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

    const recalculateLayout = useCallback((layout: 'serpentine' | 'zigzag', rows?: number, cols?: number) => {
        setPlotObject(currentPlots => {
            rows = rows ?? dimensions.rows ?? bounds.numRows;
            cols = cols ?? dimensions.cols ?? bounds.numCols;

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
    }, [dimensions, bounds]);

    const transposeLayout = useCallback(() => {
        // Reflection over diagonal (α′ = 2(θ_line) - α) = 2(45) - α = 90 - α
        setNorthArrowAngle(prev => (90 - prev) % 360);
        setAxisOrientation(prev => ({
            x: prev.y,
            y: prev.x
        }));
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
    }, []);

    const rotateLayout = useCallback(() => {
        setAxisOrientation(prev => ({
            x: prev.y,
            y: {
                source: prev.x.source,
                reversed: !prev.x.reversed
            }
        }));
        setNorthArrowAngle(prev => (prev + 90) % 360);
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
    }, [bounds]);

    const fetchObservationUnits = useCallback(async () => {
        setLoading(true);
        const headers: Record<string, string> = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const url = `/brapi/v2/observationunits?studyDbIds=${activeTrialIds.join(',')}&observationUnitLevelName=plot&pageSize=10000`;
        try {
            const response = await fetch(url, { headers });
            const body = await response.json();
            const units = body?.result?.data || [];
            if (units.length > 0) {
                const firstInfo = units[0].additionalInfo;
                if (firstInfo) {
                    setTopBorder(firstInfo.top_border_selection);
                    setLeftBorder(firstInfo.left_border_selection);
                    setRightBorder(firstInfo.right_border_selection);
                    setBottomBorder(firstInfo.bottom_border_selection);
                    setInvertRows(firstInfo.invert_row_checkmark);
                    setInvertCols(firstInfo.invert_col_checkmark);

                    if (firstInfo.plot_layout) setPlotLayout(firstInfo.plot_layout);
                    if (firstInfo.plot_color_var) setColorVar(firstInfo.plot_color_var);
                    if (firstInfo.plot_label_var) setLabelVar(firstInfo.plot_label_var);
                    if (firstInfo.plot_label_size) setLabelSize(firstInfo.plot_label_size);
                }
                parsePlotData(units);
            }
        } catch (e) {
            console.error('Error loading plot units:', e);
            alert('Error loading plot units.');
        } finally {
            setLoading(false);
        }
    }, [activeTrialIds, authToken, setTopBorder, setLeftBorder, setRightBorder, setBottomBorder, setInvertRows, setInvertCols, setPlotLayout, setColorVar, setLabelVar, setLabelSize]);

    const mutatePlot = useCallback((plotRef: string | Plot, updatedFields: Partial<Plot>) => {
        setPlotObject(current => {
            const plotId = typeof plotRef === 'string'
                ? plotRef
                : plotRef.observationUnitDbId;
            if (!plotId) {
                return current;
            }

            const existingPlot = current[plotId];
            if (!existingPlot) {
                return current;
            }

            return {
                ...current,
                [plotId]: {
                    ...existingPlot,
                    ...updatedFields
                }
            };
        });
    }, []);

    const applyDimensions = useCallback(async (rowsInput: string, colsInput: string, fillerAccessionInput?: string) => {
        const rows = parseInt(rowsInput) || 0;
        const cols = parseInt(colsInput) || 0;
        const numRealPlots = plotList.length;

        if (cols * rows < numRealPlots) {
            alert('Those are not valid dimensions.\nPlease select dimensions that can accommodate your current plots.');
            return;
        }

        let accessionId: string | undefined;
        if (fillerAccessionInput) {
			const response = await fetch(`/ajax/breeders/trial/${trialId}/accession_exists?accession_name=${encodeURIComponent(fillerAccessionInput)}`);
			const body = await response.json();
            
            if (body.success) {
                accessionId = body.success;
            } else {
                alert(body.error || 'Accession not found.');
            }

			setFillerAccessionName(fillerAccessionInput);
        }

        if (accessionId) {
            setFillerAccessionId(accessionId);
        }

        setDimensions({ rows, cols });
        recalculateLayout(plotLayout, rows, cols);
    }, [trialId, plotList]);

    const transformedSecondaryAxis = useMemo(() => {
        if (!hasSecondaryAxis || !secondaryAxis) {
            return undefined;
        }

        const getAxisDisplay = (
            { source, reversed }: { source: 'x' | 'y'; reversed: boolean },
            length: number
        ) => {
            const [label, configValues] = source === 'x' ?
                [secondaryAxis.xLabel, secondaryAxis.xValues ?? []] :
                [secondaryAxis.yLabel, secondaryAxis.yValues ?? []];

            if (!reversed) {
                return { label, values: configValues };
            }

            const values = Array.from({ length }, (_, i) => {
                return configValues[length - 1 - i] ?? '';
            });

            return { label, values };
        };

        const { cols, rows } = dimensions;
        const dispX = getAxisDisplay(axisOrientation.x, cols || bounds.numCols);
        const dispY = getAxisDisplay(axisOrientation.y, rows || bounds.numRows);

        return {
            xLabel: dispX.label,
            yLabel: dispY.label,
            xValues: dispX.values,
            yValues: dispY.values
        };
    }, [hasSecondaryAxis, secondaryAxis, axisOrientation, dimensions, bounds]);

    useEffect(() => {
        fetchObservationUnits();
    }, [activeTrialIds]);

    return (
        <PlotGridContext.Provider value={{
            plotList,
            overlappingPlots,
            dimensions,
            bounds,
            renderBounds,
            svgDimensions,
            fillerAccessionId,
            setFillerAccessionId,
            fillerAccessionName,
            setFillerAccessionName,
            gridMatrix,
            transposeLayout,
            rotateLayout,
            recalculateLayout,
            axisOrientation,
            plotStructure,
            setPlotStructure,
            plotContentCache,
            setPlotContentCache,
            plotImages,
            setPlotImages,
            fetchObservationUnits,
            mutatePlot,
            applyDimensions,
            transformedSecondaryAxis,
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
