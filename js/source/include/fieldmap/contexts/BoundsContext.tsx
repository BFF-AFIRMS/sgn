import React, { createContext, useContext, useState, useMemo } from 'react';
import { Plot } from '../types';
import { useBorder } from './BorderContext';

interface Bounds {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
    numRows: number;
    numCols: number;
}

interface BoundsContextType {
    plotObject: Record<string, Plot>;
    setPlotObject: React.Dispatch<React.SetStateAction<Record<string, Plot>>>;
    plotList: Plot[];
    dimensions: { rows: number; cols: number };
    setDimensions: React.Dispatch<React.SetStateAction<{ rows: number; cols: number }>>;
    bounds: Bounds;
    renderBounds: Bounds;
}

const BoundsContext = createContext<BoundsContextType | undefined>(undefined);

export const BoundsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { topBorder, bottomBorder, leftBorder, rightBorder } = useBorder();
    const [plotObject, setPlotObject] = useState<Record<string, Plot>>({});
    const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

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

    return (
        <BoundsContext.Provider value={{
            plotObject,
            setPlotObject,
            plotList,
            dimensions,
            setDimensions,
            bounds,
            renderBounds
        }}>
            {children}
        </BoundsContext.Provider>
    );
};

export const useBounds = () => {
    const context = useContext(BoundsContext);
    if (!context) {
        throw new Error('useBounds must be used within a BoundsProvider');
    }
    return context;
};
