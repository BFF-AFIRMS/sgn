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

    // Compute the displayed secondary axis values and labels based on the layout configuration
    const displayedSecondaryAxis = useMemo(() => {
        if (!secondaryAxis) return undefined;

        const curX = {
            label: secondaryAxis.xLabel || '',
            values: secondaryAxis.xValues ? [...secondaryAxis.xValues] : []
        };
        const curY = {
            label: secondaryAxis.yLabel || '',
            values: secondaryAxis.yValues ? [...secondaryAxis.yValues] : []
        };

        /**
         * Reverse the values for the specified axis, left-padding them to align with the end of the axis.
         * @param axis 'x' or 'y'
         * @param values Array of values to reverse
         * @returns Reversed and left-padded array of values
         */
        const reversed = (axis: 'x' | 'y', values: any[]) => {
            if (isTransposed) {
                axis = axis === 'x' ? 'y' : 'x';
            }

            const countToFill = axis === 'x' ?
                bounds.numCols - values.length :
                bounds.numRows - values.length;

            return Array(Math.max(countToFill, 0))
                .fill('')
                .concat([...values].reverse());
        }

        let dispX = curX;
        let dispY = curY;

        if (mapRotation === 90) {
            dispX = curY;
            dispY = { label: curX.label, values: reversed('y', curX.values) };
        } else if (mapRotation === 180) {
            dispX = { label: curX.label, values: reversed('x', curX.values) };
            dispY = { label: curY.label, values: reversed('y', curY.values) };
        } else if (mapRotation === 270) {
            dispX = { label: curY.label, values: reversed('x', curY.values) };
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

    const hasSecondaryAxis = displayedSecondaryAxis && (
        displayedSecondaryAxis.xLabel ||
        displayedSecondaryAxis.yLabel ||
        (displayedSecondaryAxis.xValues && displayedSecondaryAxis.xValues.length > 0) ||
        (displayedSecondaryAxis.yValues && displayedSecondaryAxis.yValues.length > 0)
    );

    return (
        <g style={{ pointerEvents: 'none' }}>
            {/* Column Axis Values (Top and Bottom) */}
            {Array.from({ length: bounds.numCols }).map((_, axisIdx) => {
                const colCoord = bounds.minCol + axisIdx;
                const colIdx = colCoord - renderBounds.minCol;
                const displayX = (invertCols ? renderBounds.numCols - colIdx - 1 : colIdx) * 52 + 25;
                return (
                    <React.Fragment key={`col-lbl-grp-${colIdx}`}>
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
            {hasSecondaryAxis && displayedSecondaryAxis?.xValues && displayedSecondaryAxis.xValues.length > 0 && Array.from({ length: bounds.numCols }).map((_, axisIdx) => {
                const colCoord = bounds.minCol + axisIdx;
                const colIdx = colCoord - renderBounds.minCol;
                const displayX = (invertCols ? renderBounds.numCols - colIdx - 1 : colIdx) * 52 + 25;

                const axisValue = displayedSecondaryAxis.xValues[axisIdx];
                if (axisValue === undefined) {
                    return null;
                }

                return (
                    <React.Fragment key={`sec-col-lbl-grp-${colIdx}`}>
                        <text x={displayX} y={-26} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {axisValue}
                        </text>
                        <text x={displayX} y={renderBounds.numRows * 52 + 36} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {axisValue}
                        </text>
                    </React.Fragment>
                );
            })}

            {/* Secondary Column Axis Label */}
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

            {/* Row Axis Values (Left and Right) */}
            {gridMatrix.map((_, rowIdx) => {
                const rowCoord = renderBounds.minRow + rowIdx;
                const displayY = invertRows ? rowIdx : renderBounds.numRows - rowIdx - 1;

                const isDataRow = rowCoord >= bounds.minRow && rowCoord <= bounds.maxRow;
                if (!isDataRow) {
                    return null;
                }

                return (
                    <React.Fragment key={`row-lbl-grp-${rowIdx}`}>
                        <text x={-20} y={displayY * 52 + 30} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {rowCoord}
                        </text>
                        <text x={renderBounds.numCols * 52 + 20} y={displayY * 52 + 30} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {rowCoord}
                        </text>
                    </React.Fragment>
                );
            })}

            {/* Secondary Row Axis Values (Left and Right) */}
            {hasSecondaryAxis && displayedSecondaryAxis?.yValues && displayedSecondaryAxis.yValues.length > 0 && gridMatrix.map((_, rowIdx) => {
                const rowCoord = renderBounds.minRow + rowIdx;
                const displayY = invertRows ? rowIdx : renderBounds.numRows - rowIdx - 1;

                const isDataRow = rowCoord >= bounds.minRow && rowCoord <= bounds.maxRow;
                if (!isDataRow) {
                    return null;
                }

                const axisIdx = rowCoord - bounds.minRow;
                const axisValue = displayedSecondaryAxis.yValues[axisIdx];
                if (axisValue === undefined) {
                    return null;
                }

                return (
                    <React.Fragment key={`sec-row-lbl-grp-${rowIdx}`}>
                        <text x={-40} y={displayY * 52 + 30} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {axisValue}
                        </text>
                        <text x={renderBounds.numCols * 52 + 40} y={displayY * 52 + 30} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
                            {axisValue}
                        </text>
                    </React.Fragment>
                );
            })}

            {/* Secondary Row Axis Label */}
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
