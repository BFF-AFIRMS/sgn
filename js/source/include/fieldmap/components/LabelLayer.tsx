import React, { useMemo } from 'react';
import { usePlotGrid } from '../contexts/PlotGridContext';
import { useLayoutConfig } from '../contexts/LayoutConfigContext';

interface LabelLayerProps { }

export const LabelLayer: React.FC<LabelLayerProps> = ({ }) => {
    const {
        bounds,
        renderBounds,
        gridMatrix,
        overlappingPlots,
        isTransposed,
        mapRotation
    } = usePlotGrid();
    const {
        invertRows,
        invertCols,
        labelVar,
        labelSize,
        secondaryAxis
    } = useLayoutConfig();

    const displayedSecondaryAxis = useMemo(() => {
        if (!secondaryAxis) return undefined;

        let curX = {
            label: secondaryAxis.xLabel || '',
            values: secondaryAxis.xValues ? [...secondaryAxis.xValues] : []
        };
        let curY = {
            label: secondaryAxis.yLabel || '',
            values: secondaryAxis.yValues ? [...secondaryAxis.yValues] : []
        };

        const getFill = (axis: 'x' | 'y', values: any[]) => {
            const countToFill = axis === 'x' ?
                bounds.numCols - values.length :
                bounds.numRows - values.length;

            return Array(Math.max(countToFill, 0))
                .fill('')
                .concat(values);
        }

        let dispX = curX;
        let dispY = curY;

        if (mapRotation === 90) {
            dispX = curY;
            dispY = { label: curX.label, values: getFill('y', [...curX.values].reverse()) };
        } else if (mapRotation === 180) {
            dispX = { label: curX.label, values: getFill('x', [...curX.values].reverse()) };
            dispY = { label: curY.label, values: getFill('y', [...curY.values].reverse()) };
        } else if (mapRotation === 270) {
            dispX = { label: curY.label, values: getFill('x', [...curY.values].reverse()) };
            dispY = curX;
        }

        if (isTransposed) {
            const temp = dispX;
            dispX = dispY;
            dispY = temp;
        }

        return {
            xLabel: dispX.label,
            yLabel: dispY.label,
            xValues: dispX.values,
            yValues: dispY.values
        };
    }, [secondaryAxis, mapRotation, isTransposed]);

    const hasSecondaryAxis = Boolean(displayedSecondaryAxis && (displayedSecondaryAxis.xLabel || displayedSecondaryAxis.yLabel || (displayedSecondaryAxis.xValues && displayedSecondaryAxis.xValues.length > 0) || (displayedSecondaryAxis.yValues && displayedSecondaryAxis.yValues.length > 0)));

    return (
        <g style={{ pointerEvents: 'none' }}>
            {/* Column Axis Labels (Top and Bottom) */}
            {Array.from({ length: bounds.numCols }).map((_, idx) => {
                const colCoord = bounds.minCol + idx;
                const colIdx = colCoord - renderBounds.minCol;
                const displayX = (invertCols ? renderBounds.numCols - colIdx - 1 : colIdx) * 52 + 25;
                return (
                    <React.Fragment key={`col-lbl-grp-${idx}`}>
                        <text x={displayX} y={-10} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {colCoord}
                        </text>
                        <text x={displayX} y={renderBounds.numRows * 52 + 20} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {colCoord}
                        </text>
                    </React.Fragment>
                );
            })}

            {/* Secondary Column Axis Values (Top and Bottom) */}
            {hasSecondaryAxis && displayedSecondaryAxis?.xValues && displayedSecondaryAxis.xValues.length > 0 && Array.from({ length: bounds.numCols }).map((_, idx) => {
                const colCoord = bounds.minCol + idx;
                const colIdx = colCoord - renderBounds.minCol;
                const displayX = (invertCols ? renderBounds.numCols - colIdx - 1 : colIdx) * 52 + 25;
                const secXVal = displayedSecondaryAxis.xValues[idx];
                if (secXVal === undefined || isNaN(secXVal)) return null;
                return (
                    <React.Fragment key={`sec-col-lbl-grp-${idx}`}>
                        <text x={displayX} y={-26} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {secXVal}
                        </text>
                        <text x={displayX} y={renderBounds.numRows * 52 + 36} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {secXVal}
                        </text>
                    </React.Fragment>
                );
            })}

            {/* Secondary Column Axis Label / Title */}
            {hasSecondaryAxis && displayedSecondaryAxis?.xLabel && (
                <>
                    <text
                        x={(renderBounds.numCols * 52) / 2}
                        y={-42}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#000"
                    >
                        {displayedSecondaryAxis.xLabel}
                    </text>
                    <text
                        x={(renderBounds.numCols * 52) / 2}
                        y={renderBounds.numRows * 52 + 52}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#000"
                    >
                        {displayedSecondaryAxis.xLabel}
                    </text>
                </>
            )}

            {/* Row Axis Labels (Left and Right) */}
            {gridMatrix.map((row, rIdx) => {
                const rCoord = renderBounds.minRow + rIdx;
                const isDataRow = rCoord >= bounds.minRow && rCoord <= bounds.maxRow;
                const displayY = invertRows ? rIdx : renderBounds.numRows - rIdx - 1;
                if (!isDataRow) return null;
                return (
                    <React.Fragment key={`row-lbl-grp-${rIdx}`}>
                        <text x={-20} y={displayY * 52 + 30} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {rCoord}
                        </text>
                        <text x={renderBounds.numCols * 52 + 20} y={displayY * 52 + 30} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {rCoord}
                        </text>
                    </React.Fragment>
                );
            })}

            {/* Secondary Row Axis Values (Left and Right) */}
            {hasSecondaryAxis && displayedSecondaryAxis?.yValues && displayedSecondaryAxis.yValues.length > 0 && gridMatrix.map((row, rIdx) => {
                const rCoord = renderBounds.minRow + rIdx;
                const isDataRow = rCoord >= bounds.minRow && rCoord <= bounds.maxRow;
                const displayY = invertRows ? rIdx : renderBounds.numRows - rIdx - 1;
                if (!isDataRow) return null;
                const rIdxData = rCoord - bounds.minRow;
                const secYVal = displayedSecondaryAxis.yValues[rIdxData];
                if (secYVal === undefined || isNaN(secYVal)) return null;
                return (
                    <React.Fragment key={`sec-row-lbl-grp-${rIdx}`}>
                        <text x={-40} y={displayY * 52 + 30} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {secYVal}
                        </text>
                        <text x={renderBounds.numCols * 52 + 40} y={displayY * 52 + 30} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {secYVal}
                        </text>
                    </React.Fragment>
                );
            })}

            {/* Secondary Row Axis Label / Title */}
            {hasSecondaryAxis && displayedSecondaryAxis?.yLabel && (
                <>
                    <text
                        x={-60}
                        y={(renderBounds.numRows * 52) / 2}
                        transform={`rotate(-90, -60, ${(renderBounds.numRows * 52) / 2})`}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#000"
                    >
                        {displayedSecondaryAxis.yLabel}
                    </text>
                    <text
                        x={renderBounds.numCols * 52 + 60}
                        y={(renderBounds.numRows * 52) / 2}
                        transform={`rotate(90, ${renderBounds.numCols * 52 + 60}, ${(renderBounds.numRows * 52) / 2})`}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#000"
                    >
                        {displayedSecondaryAxis.yLabel}
                    </text>
                </>
            )}

            {/* Individual Plot Labels */}
            {gridMatrix.map((row, rIdx) => {
                const displayY = invertRows ? rIdx : renderBounds.numRows - rIdx - 1;
                return row.map((plot, cIdx) => {
                    if (plot.type !== 'data' || plot.additionalInfo?.isObsolete) return null;

                    const displayXIdx = invertCols ? renderBounds.numCols - cIdx - 1 : cIdx;
                    const plotX = displayXIdx * 52;
                    const plotY = displayY * 52;

                    const coordKey = `${plot.observationUnitPosition?.positionCoordinateX}-${plot.observationUnitPosition?.positionCoordinateY}`;
                    const isOverlapping = !!overlappingPlots[coordKey];
                    if (isOverlapping) return null;

                    let labelText = String(plot.observationUnitPosition?.observationLevel?.levelCode || '');
                    if (labelVar === 'germplasm') {
                        labelText = plot.germplasmName || plot.crossName || plot.additionalInfo?.familyName || '';
                        if (labelText === 'Filler') labelText = '';
                    } else if (labelVar === 'block') {
                        labelText = plot.observationUnitPosition?.observationLevelRelationships?.find(r => r.levelName === 'block')?.levelCode || '';
                    } else if (labelVar === 'family_name') {
                        labelText = plot.additionalInfo?.familyName || '';
                    } else if (labelVar === 'cross_name') {
                        labelText = plot.crossName || '';
                    }

                    if (!labelText) return null;

                    return (
                        <text
                            key={`plot-lbl-${plot.observationUnitDbId}`}
                            x={plotX + 25}
                            y={plotY + (labelVar === 'germplasm' ? (Number(plot.observationUnitPosition.positionCoordinateX) % 2 ? 20 : 40) : 30)}
                            textAnchor="middle"
                            fill="#000"
                            fontSize={labelSize}
                            fontWeight="bold"
                        >
                            {labelText}
                        </text>
                    );
                });
            })}
        </g>
    );
};
