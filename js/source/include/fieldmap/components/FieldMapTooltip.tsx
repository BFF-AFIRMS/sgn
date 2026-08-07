import React from 'react';
import { Plot, TrialDetails, HeatmapValue } from '../types';

interface FieldMapTooltipProps {
    hoveredPlot: { plot: Plot; x: number; y: number } | null;
    overlappingPlots: Record<string, Plot[]>;
    displayLinkedTrials: boolean;
    linkedTrialsList: TrialDetails[];
    plotContentCache: Record<string, string[]>;
    selectedView: string;
    selectedViewLabel: string;
    heatmapData: Record<string, HeatmapValue>;
}

export const FieldMapTooltip: React.FC<FieldMapTooltipProps> = ({
    hoveredPlot,
    overlappingPlots,
    displayLinkedTrials,
    linkedTrialsList,
    plotContentCache,
    selectedView,
    selectedViewLabel,
    heatmapData,
}) => {
    if (!hoveredPlot) return null;

    const plot = hoveredPlot.plot;
    const coordKey = `${plot.observationUnitPosition?.positionCoordinateX}-${plot.observationUnitPosition?.positionCoordinateY}`;
    const overlapping = overlappingPlots[coordKey];

    return (
        <div
            className="tw:fixed tw:bg-black/85 tw:text-white tw:px-3 tw:py-2 tw:rounded-md tw:z-10000 tw:text-[11px] tw:pointer-events-none tw:max-w-70"
            style={{
                top: hoveredPlot.y + 15,
                left: hoveredPlot.x + 15,
            }}
        >
            {overlapping ? (
                <div>
                    <strong>Overlapping Plots:</strong>{' '}
                    {overlapping.map(p => {
                        const code = p.observationUnitPosition?.observationLevel?.levelCode || p.observationUnitName;
                        return displayLinkedTrials && p.studyName ? `${code} (${p.studyName})` : code;
                    }).join(', ')}
                </div>
            ) : (
                <>
                    {displayLinkedTrials && plot.studyName && (
                        <div>
                            <strong>Trial Name:</strong>{' '}
                            {(() => {
                                const t = linkedTrialsList.find(lt => lt.name === plot.studyName);
                                if (t) {
                                    return (
                                        <span style={{ backgroundColor: t.bg, color: t.fg, padding: '1px 2px', borderRadius: '4px' }}>
                                            {plot.studyName}
                                        </span>
                                    );
                                }
                                return <span>{plot.studyName}</span>;
                            })()}
                        </div>
                    )}
                    <div><strong>Plot Name:</strong> {plot.observationUnitName}</div>
                    {plot.type === 'data' && (
                        <>
                            <div><strong>Plot Number:</strong> {plot.observationUnitPosition?.observationLevel?.levelCode}</div>
                            {plot.observationUnitPosition?.observationLevelRelationships && plot.observationUnitPosition.observationLevelRelationships.length > 1 && (
                                <>
                                    <div><strong>Block Number:</strong> {plot.observationUnitPosition.observationLevelRelationships[1].levelCode}</div>
                                    <div><strong>Rep Number:</strong> {plot.observationUnitPosition.observationLevelRelationships[0].levelCode}</div>
                                </>
                            )}
                            {plot.germplasmName && <div><strong>Accession Name:</strong> {plot.germplasmName}</div>}
                            {plot.crossName && <div><strong>Cross Unique ID:</strong> {plot.crossName}</div>}
                            {plot.additionalInfo?.familyName && <div><strong>Family Name:</strong> {plot.additionalInfo.familyName}</div>}
                            {plot.additionalInfo?.intercropGermplasm?.map((g, i) => (
                                <div key={i}><strong>Accession Name:</strong> {g.germplasmName}</div>
                            ))}
                            {plot.observationUnitDbId && plotContentCache[plot.observationUnitDbId] && plotContentCache[plot.observationUnitDbId].length > 0 && (
                                <div><strong>Plants:</strong> {plotContentCache[plot.observationUnitDbId].join(', ')}</div>
                            )}
                            {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && (
                                <div className="tw:text-[#ffd700] tw:mt-1">
                                    <strong>Trait Name:</strong> {selectedViewLabel.replace(/ \(corrected\)| \(adjustment\)/, '')}<br />
                                    <strong>Trait Value:</strong> {(() => {
                                        const val = heatmapData[plot.observationUnitDbId || '']?.val;
                                        if (val === undefined) return <em>NA</em>;
                                        const num = parseFloat(String(val));
                                        return isNaN(num) ? val : Math.round((num + Number.EPSILON) * 100) / 100;
                                    })()}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};
