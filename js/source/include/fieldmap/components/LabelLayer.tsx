import React from 'react';
import { Plot } from '../types';
import { useBounds } from '../contexts/BoundsContext';

interface LabelLayerProps {
    gridMatrix: Plot[][];
    invertRows: boolean;
    invertCols: boolean;
    overlappingPlots: Record<string, Plot[]>;
    labelVar: 'plot_number' | 'germplasm' | 'block' | 'family_name' | 'cross_name';
    labelSize: number;
}

export const LabelLayer: React.FC<LabelLayerProps> = ({
    gridMatrix,
    invertRows,
    invertCols,
    overlappingPlots,
    labelVar,
    labelSize,
}) => {
    const { bounds, renderBounds } = useBounds();
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
