import React, { useMemo, useRef } from 'react';
import { Plot, TrialDetails, HeatmapValue } from '../types';
import { palette } from '../utils/functions';
import { usePlotGrid } from '../contexts/PlotGridContext';
import { useLayoutConfig } from '../contexts/LayoutConfigContext';
import { useView } from '../contexts/ViewContext';
import { useHeatmap } from '../contexts/HeatmapContext';
import { useZoomPan } from '../contexts/ZoomPanContext';
import { useModals } from '../contexts/ModalsContext';

interface PlotTileProps {
    plot: Plot;
    plotX: number;
    plotY: number;
    colorVar: 'parity' | 'germplasm' | 'block' | 'family_name' | 'cross_name';
    selectedView: string;
    displayLinkedTrials: boolean;
    linkedTrialsList: TrialDetails[];
    overlappingPlots: Record<string, Plot[]>;
    heatmapData: Record<string, HeatmapValue>;
    valueColorScale: {
        min: number;
        max: number;
        colors?: string[];
        scale: (val: number) => string;
    };
    germplasmPalette: Record<string, string>;
    blockPalette: Record<string, string>;
    familyNamePalette: Record<string, string>;
    crossNamePalette: Record<string, string>;
    onSelect: (plot: Plot) => void;
    onHover: (plot: Plot, clientX: number, clientY: number) => void;
    onLeave: () => void;
}

const PlotTile: React.FC<PlotTileProps> = ({
    plot,
    plotX,
    plotY,
    colorVar,
    selectedView,
    displayLinkedTrials,
    linkedTrialsList,
    overlappingPlots,
    heatmapData,
    valueColorScale,
    germplasmPalette,
    blockPalette,
    familyNamePalette,
    crossNamePalette,
    onSelect,
    onHover,
    onLeave
}) => {
    const isObsolete = plot.additionalInfo?.isObsolete;
    if (isObsolete) return null;

    const coordKey = `${plot.observationUnitPosition?.positionCoordinateX}-${plot.observationUnitPosition?.positionCoordinateY}`;
    const isOverlapping = !!overlappingPlots[coordKey];

    let fill = '#c7e9b4'; // Default block parity color (even block placeholder)
    let stroke = '#41b6c4'; // Default replicate parity stroke
    let strokeWidth = 1.5;

    if (colorVar === 'germplasm') {
        const name = plot.germplasmName || plot.crossName || plot.additionalInfo?.familyName || '';
        if (name && name !== 'Filler' && germplasmPalette[name]) {
            fill = germplasmPalette[name];
        }
    } else if (colorVar === 'block') {
        const block = plot.observationUnitPosition?.observationLevelRelationships?.find(r => r.levelName === 'block')?.levelCode || '';
        if (block && blockPalette[block]) {
            fill = blockPalette[block];
        }
    } else if (colorVar === 'family_name') {
        const family_name = plot.additionalInfo?.familyName || '';
        if (family_name && familyNamePalette[family_name]) {
            fill = familyNamePalette[family_name];
        }
    } else if (colorVar === 'cross_name') {
        const cross_name = plot.crossName || '';
        if (cross_name && crossNamePalette[cross_name]) {
            fill = crossNamePalette[cross_name];
        }
    } else {
        // Replicate even/odd stroke coloring
        const repNo = parseInt(String(plot.observationUnitPosition?.observationLevelRelationships?.[0]?.levelCode));
        if (!isNaN(repNo)) {
            stroke = repNo % 2 === 0 ? 'red' : 'green';
        }

        // Block even/odd fill coloring
        const blockNo = parseInt(String(plot.observationUnitPosition?.observationLevelRelationships?.[1]?.levelCode));
        if (!isNaN(blockNo)) {
            fill = blockNo % 2 === 0 ? '#c7e9b4' : '#41b6c4';
        }
    }

    if (plot.observationUnitPosition?.entryType === 'check') fill = '#6a5acd';
    else if (plot.type === 'border' || plot.type === 'filler') fill = '#ecefef';
    else if (plot.type === 'empty_space') fill = 'transparent';

    // Overlapping style override
    if (isOverlapping) {
        fill = '#000000';
        stroke = '#ff0000';
        strokeWidth = 3;
    }

    // Heatmap views logic
    if (selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && plot.observationUnitDbId) {
        const valObj = heatmapData[plot.observationUnitDbId];
        fill = valObj ? valueColorScale.scale(valObj.val) : '#a9afaf';
    }

    return (
        <g
            transform={`translate(${plotX}, ${plotY})`}
            className="tw:cursor-pointer"
            onClick={() => onSelect(plot)}
            onMouseEnter={(e) => onHover(plot, e.clientX, e.clientY)}
            onMouseLeave={onLeave}
        >
            {plot.type !== 'empty_space' && (
                <rect
                    width={50}
                    height={50}
                    rx={4}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                />
            )}

            {/* Multiple trial colored band */}
            {displayLinkedTrials && plot.studyName && (
                <rect
                    x={4}
                    y={43}
                    width={42}
                    height={4}
                    fill={linkedTrialsList.find(t => t.name === plot.studyName)?.bg || '#888'}
                />
            )}

            {/* Camera Image Icon */}
            {plot.plotImageDbIds && plot.plotImageDbIds.length > 0 && (
                <g transform="translate(5, 5) scale(0.6)">
                    <rect width="18" height="14" rx="2" fill="#ff8c00" />
                    <circle cx="9" cy="7" r="3" fill="#ffffff" />
                </g>
            )}
        </g>
    );
};

interface PlotLayerProps {
}

export const PlotLayer: React.FC<PlotLayerProps> = ({
}) => {
    const {
        renderBounds,
        gridMatrix,
        overlappingPlots,
        setPlotStructure,
        setPlotContentCache,
        setPlotImages
    } = usePlotGrid();

    const {
        invertRows,
        invertCols,
        colorVar
    } = useLayoutConfig();

    const {
        trialId,
        selectedView,
        setSelectedPlot,
        setHoveredPlot,
        displayLinkedTrials,
        linkedTrialsList,
    } = useView();

    const {
        heatmapData,
        valueColorScale
    } = useHeatmap();

    const {
        hasDragged,
    } = useZoomPan();

    const {
        setShowPlotDetails,
    } = useModals();

    const plotList = useMemo(() => {
        const uniquePlots = new Map<string, Plot>();
        gridMatrix.forEach(row => {
            row.forEach(p => {
                if (p.type === 'data' && p.observationUnitDbId) {
                    uniquePlots.set(p.observationUnitDbId, p);
                }
            });
        });
        Object.values(overlappingPlots).forEach(plots => {
            plots.forEach(p => {
                if (p.observationUnitDbId) {
                    uniquePlots.set(p.observationUnitDbId, p);
                }
            });
        });
        return Array.from(uniquePlots.values());
    }, [gridMatrix, overlappingPlots]);

    const germplasmPalette = useMemo(() => {
        const names = Array.from(new Set(plotList.map(p => p.germplasmName || p.crossName || p.additionalInfo?.familyName || '')))
            .filter(n => n && n !== 'Filler');
        const mapping: Record<string, string> = {};
        names.sort().forEach((name, i) => {
            mapping[name] = palette[i % palette.length];
        });
        return mapping;
    }, [plotList]);

    const blockPalette = useMemo(() => {
        const blocks = Array.from(new Set(plotList.map(p => {
            return p.observationUnitPosition?.observationLevelRelationships?.find(r => r.levelName === 'block')?.levelCode || '';
        }))).filter(b => b !== '');
        const mapping: Record<string, string> = {};
        blocks.sort().forEach((block, i) => {
            mapping[block] = palette[i % palette.length];
        });
        return mapping;
    }, [plotList]);

    const familyNamePalette = useMemo(() => {
        const family_names = Array.from(new Set(plotList.map(p => {
            return p.additionalInfo?.familyName || '';
        }))).filter(b => b !== '');
        const mapping: Record<string, string> = {};
        family_names.sort().forEach((family_name, i) => {
            mapping[family_name] = palette[i % palette.length];
        });
        return mapping;
    }, [plotList]);

    const crossNamePalette = useMemo(() => {
        const cross_names = Array.from(new Set(plotList.map(p => {
            return p.crossName || '';
        }))).filter(b => b !== '');
        const mapping: Record<string, string> = {};
        cross_names.sort().forEach((cross_name, i) => {
            mapping[cross_name] = palette[i % palette.length];
        });
        return mapping;
    }, [plotList]);

    const clickTimer = useRef<NodeJS.Timeout | null>(null);

    // Handle click vs double click logic
    const handlePlotSelect = (plot: Plot) => {
        if (hasDragged.current) {
            return;
        }
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            // Double Click behavior
            if (plot.observationUnitDbId) {
                window.open(`/stock/${plot.observationUnitDbId}/view`, '_blank');
            }
        } else {
            clickTimer.current = setTimeout(() => {
                clickTimer.current = null;
                // Single Click behavior
                if (plot.type === 'empty_space') return;
                setSelectedPlot(plot);
                setShowPlotDetails(true);
                setPlotStructure(null);
                setPlotImages('');

                fetch(`/stock/get_child_stocks/${plot.observationUnitDbId}`)
                    .then(res => res.json())
                    .then(response => {
                        if (response?.data) {
                            const struct = JSON.parse(response.data);
                            const plants: string[] = [];
                            if (struct.has) {
                                Object.values(struct.has).forEach((node: any) => {
                                    if (node.type === 'plant') plants.push(node.name || '');
                                });
                            }
                            setPlotContentCache(prev => ({ ...prev, [plot.observationUnitDbId!]: plants }));
                            setPlotStructure(struct);
                        }
                    })
                    .catch(() => {});

                fetch(`/ajax/breeders/trial/${trialId}/retrieve_plot_images`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        image_ids: JSON.stringify(plot.plotImageDbIds || []),
                        plot_name: plot.observationUnitName,
                        plot_id: plot.observationUnitDbId || ''
                    })
                })
                    .then(res => res.json())
                    .then(response => {
                        if (response?.image_html) {
                            setPlotImages(response.image_html);
                        }
                    })
                    .catch(() => {});
            }, 250);
        }
    };

    return (
        <>
            {gridMatrix.map((row, rIdx) => {
                const displayY = invertRows ? rIdx : renderBounds.numRows - rIdx - 1;

                return (
                    <g key={`row-group-${rIdx}`}>
                        {row.map((plot, cIdx) => {
                            const displayXIdx = invertCols ? renderBounds.numCols - cIdx - 1 : cIdx;
                            const plotX = displayXIdx * 52;
                            const plotY = displayY * 52;

                            return (
                                <PlotTile
                                    key={plot.observationUnitDbId || `empty-${cIdx}-${rIdx}`}
                                    plot={plot}
                                    plotX={plotX}
                                    plotY={plotY}
                                    colorVar={colorVar}
                                    selectedView={selectedView}
                                    displayLinkedTrials={displayLinkedTrials}
                                    linkedTrialsList={linkedTrialsList}
                                    overlappingPlots={overlappingPlots}
                                    heatmapData={heatmapData}
                                    valueColorScale={valueColorScale}
                                    germplasmPalette={germplasmPalette}
                                    blockPalette={blockPalette}
                                    familyNamePalette={familyNamePalette}
                                    crossNamePalette={crossNamePalette}
                                    onSelect={handlePlotSelect}
                                    onHover={(p, clientX, clientY) => setHoveredPlot({ plot: p, x: clientX, y: clientY })}
                                    onLeave={() => setHoveredPlot(null)}
                                />
                            );
                        })}
                    </g>
                );
            })}
        </>
    );
};
