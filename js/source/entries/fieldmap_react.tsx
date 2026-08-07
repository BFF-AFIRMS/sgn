import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useZoomPan } from '../include/fieldmap/hooks/useZoomPan';
import { 
    Plot, 
    HeatmapValue, 
    TrialDetails, 
    PlotStructureNode,
    DownloadOpts
} from '../include/fieldmap/types';
import { 
    palette, 
    trial_colors, 
    trial_colors_text, 
    interpolate, 
    pearsonSkewness 
} from '../include/fieldmap/utils';
import { FieldMapLegend } from '../include/fieldmap/components/FieldMapLegend';
import { FieldMapTooltip } from '../include/fieldmap/components/FieldMapTooltip';
import { PlotTile } from '../include/fieldmap/components/PlotTile';
import { DownloadPlotOrderPanel } from '../include/fieldmap/components/DownloadPlotOrderPanel';
import { PlotDetailsModal } from '../include/fieldmap/modals/PlotDetailsModal';
import { 
    DimensionsModal, 
    DownloadCSVModal, 
    SuppressPhenotypeModal,
    DeleteTraitModal, 
    CuratorWarningModal 
} from '../include/fieldmap/modals/FieldmapModals';

// Declare external legacy global libraries
// We must use 'any' here as Leaflet (L) and Turf are loaded globally as script includes 
// via Mason templates and do not have type declarations within this bundler.
declare const L: any;
declare const turf: any;
declare const BrAPIFieldmap: any;
declare const jQuery: any;

interface FieldMapContainerProps {
    trialId: string;
    trialStockType: string;
    hasColAndRowNumbers: boolean;
    hasSubplotEntries: boolean;
    hasPlantEntries: boolean;
    authToken?: string;
}

const FieldMapContainer: React.FC<FieldMapContainerProps> = ({
    trialId,
    trialStockType,
    hasColAndRowNumbers,
    hasSubplotEntries,
    hasPlantEntries,
    authToken
}) => {
    const [loading, setLoading] = useState(false);
    const [selectedViewLabel, setSelectedViewLabel] = useState<string>('');
    const [plotObject, setPlotObject] = useState<Record<string, Plot>>({});
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [selectedView, setSelectedView] = useState<string>('fieldmap');
    const [displayLinkedTrials, setDisplayLinkedTrials] = useState(false);
    const [linkedTrialsList, setLinkedTrialsList] = useState<TrialDetails[]>([]);
    const [activeTrialIds, setActiveTrialIds] = useState<string[]>([trialId]);

    const [plotLayout, setPlotLayout] = useState<'serpentine' | 'zigzag'>('serpentine');
    const [invertRows, setInvertRows] = useState(false);
    const [colorVar, setColorVar] = useState<'parity' | 'germplasm' | 'block' | 'family_name' | 'cross_name'>('parity');
    const [labelVar, setLabelVar] = useState<'plot_number' | 'germplasm' | 'block' | 'family_name' | 'cross_name'>('plot_number');
    const [labelSize, setLabelSize] = useState(10);

    const [invertCols, setInvertCols] = useState(false);
    const [topBorder, setTopBorder] = useState(false);
    const [leftBorder, setLeftBorder] = useState(false);
    const [rightBorder, setRightBorder] = useState(false);
    const [bottomBorder, setBottomBorder] = useState(false);
    const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

    const [showDimDialog, setShowDimDialog] = useState(false);
    const [dimRowsInput, setDimRowsInput] = useState('');
    const [dimColsInput, setDimColsInput] = useState('');
    const [fillerAccessionInput, setFillerAccessionInput] = useState('');
    const [fillerAccessionId, setFillerAccessionId] = useState<string | undefined>(undefined);

    const [heatmapData, setHeatmapData] = useState<Record<string, HeatmapValue>>({});
    const [spatialAdjustments, setSpatialAdjustments] = useState<Record<string, Record<string, number>>>({});
    const [controlAccessions, setControlAccessions] = useState<string[]>([]);
    const [selectedControlPlot, setSelectedControlPlot] = useState<string>('');
    const [controlRelationshipText, setControlRelationshipText] = useState<string>('');
    const [showControlsSection, setShowControlsSection] = useState(false);

    const [hoveredPlot, setHoveredPlot] = useState<{ plot: Plot; x: number; y: number } | null>(null);
    const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
    const [plotStructure, setPlotStructure] = useState<PlotStructureNode | null>(null);
    const [plotImages, setPlotImages] = useState<string>('');
    const [plotContentCache, setPlotContentCache] = useState<Record<string, string[]>>({});
    const [showPlotDetails, setShowPlotDetails] = useState(false);
    const [showEditAccession, setShowEditAccession] = useState(false);
    const [newAccession, setNewAccession] = useState('');
    const [newPlotName, setNewPlotName] = useState('');

    const [showCuratorWarning, setShowCuratorWarning] = useState(false);
    const [showSuppressModal, setShowSuppressModal] = useState(false);
    const [showDeleteTraitModal, setShowDeleteTraitModal] = useState(false);
    const [showDownloadCSVModal, setShowDownloadCSVModal] = useState(false);

    const [csvDownloadOpts, setCsvDownloadOpts] = useState({
        accession: true,
        obsUnit: false,
        seedlot: false,
        plotId: false,
        plotNum: false,
        familyName: false,
        crossName: false,
    });

    const clickTimer = useRef<NodeJS.Timeout | null>(null);
    const geoMapRef = useRef<HTMLDivElement | null>(null);
    const leafletMapInstance = useRef<any>(null);

    const [downloadOpts, setDownloadOpts] = useState<DownloadOpts>({
        type: '',
        order: 'by_row_zigzag',
        start: 'bottom_left',
        borders: false,
        gaps: false,
        subplots: false,
        plants: false,
        hmPltid: 'plot_id',
        hmRange: 'row_number',
        hmRow: 'col_number'
    });

    const stockLabel = useMemo(() => {
        if (trialStockType === 'cross') return 'Cross';
        if (trialStockType === 'family_name') return 'Family';
        return 'Accession';
    }, [trialStockType]);

    useEffect(() => {
        if (loading) {
            jQuery("#working_modal").modal("show");
        } else {
            jQuery("#working_modal").modal("hide");
        }
    }, [loading]);

    useEffect(() => {
        fetchObservationUnits();
        loadVariables();
        loadSpatialAdjustments();
    }, [activeTrialIds]);

    const plotList = useMemo(() => {
        return Object.values(plotObject);
    }, [plotObject]);

    const bounds = useMemo(() => {
        if (plotList.length === 0) return { minCol: 1, maxCol: dimensions.cols || 1, minRow: 1, maxRow: dimensions.rows || 1, numRows: dimensions.rows || 1, numCols: dimensions.cols || 1 };
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

        if (dimensions.cols > (maxCol - minCol + 1)) {
            maxCol = minCol + dimensions.cols - 1;
        }
        if (dimensions.rows > (maxRow - minRow + 1)) {
            maxRow = minRow + dimensions.rows - 1;
        }

        return {
            minCol,
            maxCol,
            minRow,
            maxRow,
            numRows: maxRow - minRow + 1,
            numCols: maxCol - minCol + 1
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

    const svgWidth = (renderBounds.numCols + 1) * 55 + 50;
    const svgHeight = (renderBounds.numRows + 1) * 55 + 50;

    // Navigation Engine Hooks
    const { 
        zoom, pan, isDragging, containerRef, hasDragged, 
        handleMouseDown, handleMouseMove, handleMouseUpOrLeave, handleResetZoomPan, updateZoomAndPan 
    } = useZoomPan(svgWidth, svgHeight);

    useEffect(() => {
        const handleExternalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.id === 'trial_fieldmap_download_layout_button' || target.closest('#trial_fieldmap_download_layout_button'))) {
                setShowDownloadCSVModal(true);
            }
        };
        document.addEventListener('click', handleExternalClick);
        return () => {
            document.removeEventListener('click', handleExternalClick);
        };
    }, []);

    useEffect(() => {
        fetch(`/ajax/breeders/trial/${trialId}/controls`)
            .then(res => res.json())
            .then(response => {
                if (response?.accessions) {
                    setControlAccessions(response.accessions.map((a: any) => a.accession_name));
                }
            })
            .catch(() => {});
    }, [trialId]);

    // Handle Leaflet GeoMap rendering
    useEffect(() => {
        if (selectedView === 'geofieldmap' && geoMapRef.current) {
            if (leafletMapInstance.current) {
                leafletMapInstance.current.remove();
            }
            try {
                // Initialize custom Leaflet container mapping
                const mapEl = geoMapRef.current;
                mapEl.innerHTML = "<div id='geoflatmap_leaflet' style='width:100%; height:600px;'></div>";
                
                const fmInstance = new BrAPIFieldmap('#geoflatmap_leaflet', '/brapi/v2', {
                    viewOnly: false,
                    brapi_auth: authToken,
                    defaultPos: [0, 0],
                    defaultZoom: 2,
                    plotScaleFactor: 1,
                    style: { weight: 1, color: '#41b6c4', fillOpacity: 0.4 }
                });
                fmInstance.load(trialId).then((success: boolean) => {
                    if (!success) {
                        alert("No geo reference data in this trial!");
                    }
                });
                leafletMapInstance.current = fmInstance.map;
                (window as any).geoFieldMapInstance = fmInstance;
            } catch (e) {
                console.error("Leaflet initialization failed", e);
            }
        }
        return () => {
            if (leafletMapInstance.current) {
                leafletMapInstance.current.remove();
                leafletMapInstance.current = null;
            }
            delete (window as any).geoFieldMapInstance;
        };
    }, [selectedView, trialId, authToken]);

    const fetchObservationUnits = () => {
        setLoading(true);
        const headers: Record<string, string> = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const url = `/brapi/v2/observationunits?studyDbIds=${activeTrialIds.join(',')}&observationUnitLevelName=plot&pageSize=10000`;
        fetch(url, { headers })
            .then(res => res.json())
            .then(response => {
                const units = response?.result?.data || [];
                if (units.length > 0) {
                    const firstInfo = units[0].additionalInfo;
                    if (firstInfo) {
                        setTopBorder(firstInfo.top_border_selection);
                        setLeftBorder(firstInfo.left_border_selection);
                        setRightBorder(firstInfo.right_border_selection);
                        setBottomBorder(firstInfo.bottom_border_selection);
                        setInvertRows(firstInfo.invert_row_checkmark);
                        setInvertCols(firstInfo.invert_col_checkmark);
                        if (firstInfo.plot_layout) {
                            setPlotLayout(firstInfo.plot_layout);
                        }
                        if (firstInfo.plot_color_var) setColorVar(firstInfo.plot_color_var);
                        if (firstInfo.plot_label_var) setLabelVar(firstInfo.plot_label_var);
                        if (firstInfo.plot_label_size) setLabelSize(firstInfo.plot_label_size);
                    }
                    parsePlotData(units);
                }
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
                alert('Error loading plot units.');
            });
    };

    const loadVariables = () => {
        const headers: Record<string, string> = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        fetch(`/brapi/v2/variables?studyDbId=${trialId}&pageSize=10000`, { headers })
            .then(res => res.json())
            .then(response => {
                const data = response?.result?.data || [];
                const vars: Record<string, string> = {};
                data.forEach((v: any) => {
                    if (v.observationVariableName && v.observationVariableDbId) {
                        vars[v.observationVariableName] = v.observationVariableDbId;
                    }
                });
                setVariables(vars);
            })
            .catch(() => {});
    };

    const loadSpatialAdjustments = () => {
        fetch(`/ajax/spatial_model/retrieve_spatial_adjustments/${trialId}`)
            .then(res => res.json())
            .then(response => {
                if (response?.data) {
                    setSpatialAdjustments(JSON.parse(response.data));
                }
            })
            .catch(() => {});
    };

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

    const toggleLinkedTrials = (checked: boolean) => {
        setDisplayLinkedTrials(checked);
        if (checked) {
            fetch(`/ajax/breeders/trial/${trialId}/linked_field_trials`)
                .then(res => res.json())
                .then(response => {
                    if (response?.trials) {
                        const list = response.trials.map((t: any, i: number) => {
                            const idx = i % trial_colors.length;
                            return {
                                id: t.trial_id,
                                name: t.trial_name,
                                bg: trial_colors[idx],
                                fg: trial_colors_text[idx]
                            };
                        });
                        setLinkedTrialsList(list);
                        setActiveTrialIds([trialId, ...list.map((l: any) => l.id)]);
                    } else {
                        alert(response?.error || 'Could not load linked trials.');
                        setDisplayLinkedTrials(false);
                    }
                })
                .catch(() => {
                    setDisplayLinkedTrials(false);
                });
        } else {
            setLinkedTrialsList([]);
            setActiveTrialIds([trialId]);
        }
    };

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

    const controlPlots = useMemo(() => {
        return plotList.filter(p => {
            return p.type === 'data' && (p.additionalInfo?.is_a_control || (p.germplasmName && controlAccessions.includes(p.germplasmName)));
        });
    }, [plotList, controlAccessions]);

    const maxLevelCode = useMemo(() => {
        let maxVal = 0;
        plotList.forEach(plot => {
            const code = parseInt(String(plot.observationUnitPosition?.observationLevel?.levelCode));
            if (!isNaN(code) && code > maxVal) {
                maxVal = code;
            }
        });
        return maxVal;
    }, [plotList]);

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

    const recalculateLayout = (currentPlots: Record<string, Plot>, rows: number, cols: number, layout: 'serpentine' | 'zigzag') => {
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
    };

    const fetchHeatmapObservations = (variableId: string) => {
        setLoading(true);
        const headers: Record<string, string> = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        fetch(`/brapi/v2/observations?observationVariableDbId=${variableId}&studyDbId=${activeTrialIds.join(',')}&pageSize=10000`, { headers })
            .then(res => res.json())
            .then(response => {
                const data = response?.result?.data || [];
                const map: Record<string, HeatmapValue> = {};
                data.forEach((obs: any) => {
                    let finalVal = Number(obs.value);
                    const plotName = obs.observationUnitName;

                    // Apply Spatial adjustments if viewing Corrected or Adjustments
                    if (selectedView.includes(' (corrected)') && spatialAdjustments[plotName]?.[variableId] !== undefined) {
                        finalVal += Number(spatialAdjustments[plotName][variableId]);
                    } else if (selectedView.includes(' (adjustment)') && spatialAdjustments[plotName]?.[variableId] !== undefined) {
                        finalVal = Number(spatialAdjustments[plotName][variableId]);
                    }

                    if (!isNaN(finalVal)) {
                        map[obs.observationUnitDbId] = {
                            val: finalVal,
                            plot_name: obs.observationUnitName,
                            id: obs.observationDbId
                        };
                    }
                });
                setHeatmapData(map);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    };

    const handleViewChange = (val: string) => {
        setSelectedView(val);
        if (val === 'fieldmap' || val === 'geofieldmap') {
            setHeatmapData({});
        } else if (val) {
            const variableId = val.replace(' (corrected)', '').replace(' (adjustment)', '');
            fetchHeatmapObservations(variableId);
        }
    };

    const valueColorScale = useMemo(() => {
        const values = Object.values(heatmapData).map(v => v.val);
        if (values.length === 0) return { min: 0, max: 0, scale: (val: number) => '#ffffff' };
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Skewness power transform scaling
        const skew = pearsonSkewness(values);
        const exponent = skew > 0.5 ? 0.5 : 1.0;

        const hasNegatives = values.some(v => v < 0);
        const hasPositives = values.some(v => v > 0);
        const colors = (hasNegatives && !hasPositives) ? ['darkblue', 'white'] : (!hasNegatives && hasPositives) ? ['white', 'darkred'] : ['darkblue', 'white', 'darkred'];

        const scale = (val: number) => {
            if (min === max) return colors[0];
            const factor = Math.pow((val - min) / (max - min), exponent);
            if (colors.length === 3) {
                if (factor < 0.5) {
                    return interpolate(colors[0], colors[1], factor * 2);
                } else {
                    return interpolate(colors[1], colors[2], (factor - 0.5) * 2);
                }
            } else {
                return interpolate(colors[0], colors[1], factor);
            }
        };
        return { min, max, scale, colors };
    }, [heatmapData, selectedView]);

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

    const submitReplaceAccession = (override: 'check' | 'override') => {
        if (!selectedPlot) return;
        setLoading(true);
        fetch(`/ajax/breeders/trial/${trialId}/replace_plot_accessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                new_accession: newAccession,
                new_plot_name: newPlotName,
                old_accession: selectedPlot.germplasmName || '',
                old_plot_id: selectedPlot.observationUnitDbId || '',
                old_plot_name: selectedPlot.observationUnitName,
                override: override
            })
        })
            .then(res => res.json())
            .then(response => {
                if (response.warning) {
                    setLoading(false);
                    setShowCuratorWarning(true);
                } else if (response.error) {
                    setLoading(false);
                    alert(response.error);
                } else {
                    alert('Plot Accession Replaced successfully!');
                    setShowPlotDetails(false);
                    setShowEditAccession(false);
                    setShowCuratorWarning(false);
                    fetchObservationUnits();
                }
            })
            .catch(() => {
                setLoading(false);
            });
    };

    const submitFieldLayout = () => {
        const answer = window.confirm('You are about to save this plot layout to the database. Are you sure you would like to continue?');
        if (!answer) return;
        setLoading(true);

        const allPlots = gridMatrix.flat();
        const plotsToCreate = allPlots.filter(plot => !plot.observationUnitDbId && (plot.type === 'filler' || plot.type === 'border'));

        const brapiPostObject = fillerAccessionId ? plotsToCreate
            .map((plot, i) => ({
                additionalInfo: {
                    invert_row_checkmark: invertRows,
                    invert_col_checkmark: invertCols,
                    top_border_selection: topBorder,
                    left_border_selection: leftBorder,
                    right_border_selection: rightBorder,
                    bottom_border_selection: bottomBorder,
                    plot_layout: plotLayout,
                    plot_color_var: colorVar,
                    plot_label_var: labelVar,
                    plot_label_size: labelSize
                },
                germplasmDbId: fillerAccessionId,
                germplasmName: fillerAccessionInput,
                observationUnitName: `${trialId} filler ${maxLevelCode + i + 1}`,
                observationUnitPosition: {
                    observationLevel: { levelCode: maxLevelCode + i + 1, levelName: 'plot', levelOrder: 2 },
                    positionCoordinateX: plot.observationUnitPosition.positionCoordinateX,
                    positionCoordinateY: plot.observationUnitPosition.positionCoordinateY,
                    entryType: plot.type
                },
                trialDbId: trialId,
                studyDbId: trialId
            })) : [];

        const brapiPutObject: Record<string, any> = {};
        allPlots
            .filter(plot => !!plot.observationUnitDbId)
            .forEach(plot => {
                brapiPutObject[plot.observationUnitDbId!] = {
                    additionalInfo: {
                        invert_row_checkmark: invertRows,
                        invert_col_checkmark: invertCols,
                        top_border_selection: topBorder,
                        left_border_selection: leftBorder,
                        right_border_selection: rightBorder,
                        bottom_border_selection: bottomBorder,
                        plot_layout: plotLayout,
                        plot_color_var: colorVar,
                        plot_label_var: labelVar,
                        plot_label_size: labelSize
                    },
                    germplasmDbId: plot.germplasmDbId,
                    germplasmName: plot.germplasmName,
                    observationUnitName: plot.observationUnitName,
                    observationUnitPosition: {
                        observationLevel: { levelCode: plot.observationUnitPosition.observationLevel.levelCode, levelName: 'plot', levelOrder: 2 },
                        positionCoordinateX: plot.observationUnitPosition.positionCoordinateX,
                        positionCoordinateY: plot.observationUnitPosition.positionCoordinateY,
                        entryType: plot.type === 'data' ? plot.observationUnitPosition.entryType : plot.type
                    },
                    trialDbId: trialId
                };
            });

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        console.log('BRAPI POST OBJECT', brapiPostObject);
        console.log('BRAPI PUT OBJECT', brapiPutObject);

        const putPromise = fetch('/brapi/v2/observationunits', {
            method: 'PUT',
            headers,
            body: JSON.stringify(brapiPutObject)
        });

        const postPromise = brapiPostObject.length > 0
            ? fetch('/brapi/v2/observationunits', {
                method: 'POST',
                headers,
                body: JSON.stringify(brapiPostObject)
            })
            : Promise.resolve();

        Promise.all([putPromise, postPromise])
            .then(() => fetch(`/ajax/breeders/trial/${trialId}/refresh_cache`, { method: 'POST' }))
            .then(() => {
                alert('Field Plot layout submitted successfully!');
                fetchObservationUnits();
            })
            .catch(() => {
                setLoading(false);
                alert('Error submitting layout metadata.');
            });
    };

    const handleDownloadOrder = () => {
        const q = new URLSearchParams({
            trial_ids: activeTrialIds.join(','),
            type: downloadOpts.type,
            order: downloadOpts.order,
            start: downloadOpts.start,
            top_border: String(downloadOpts.borders && topBorder),
            right_border: String(downloadOpts.borders && rightBorder),
            bottom_border: String(downloadOpts.borders && bottomBorder),
            left_border: String(downloadOpts.borders && leftBorder),
            gaps: String(downloadOpts.gaps),
            subplots: String(downloadOpts.subplots),
            plants: String(downloadOpts.plants),
            hm_pltid: downloadOpts.hmPltid,
            hm_range: downloadOpts.hmRange,
            hm_row: downloadOpts.hmRow
        }).toString();
        window.open(`/ajax/breeders/trial_plot_order?${q}`, '_blank');
    };

    const submitGeoLayout = () => {
        const fm = (window as any).geoFieldMapInstance;
        if (fm) {
            setLoading(true);
            fm.update()
                .then((msg: string) => {
                    alert(msg || 'Geo layout updated successfully!');
                    fetchObservationUnits();
                })
                .catch((err: any) => {
                    setLoading(false);
                    alert(err || 'Failed to update geo layout');
                });
        }
    };

    const handleApplyDimensions = () => {
        const cols = parseInt(dimColsInput) || 0;
        const rows = parseInt(dimRowsInput) || 0;
        const numRealPlots = plotList.length;

        if (cols * rows < numRealPlots) {
            alert('Those are not valid dimensions.\nPlease select dimensions that can accommodate your current plots.');
            return;
        }

        const proceed = (accessionId?: string) => {
            if (accessionId) setFillerAccessionId(accessionId);
            setDimensions({ rows, cols });
            setPlotObject(prev => recalculateLayout(prev, rows, cols, plotLayout));
            setShowDimDialog(false);
        };

        if (fillerAccessionInput) {
            fetch(`/ajax/breeders/trial/${trialId}/accession_exists?accession_name=${encodeURIComponent(fillerAccessionInput)}`)
                .then(res => res.json())
                .then(response => {
                    if (response.success) proceed(response.success); else alert(response.error || 'Accession not found.');
                });
        } else {
            proceed();
        }
    };

    const handleTranspose = () => {
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

    const handleRotate = () => {
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
                        // CW 90deg: newX = oldY, newY = maxCol - oldX + minCol
                        positionCoordinateX: oldY,
                        positionCoordinateY: maxCol - oldX + minCol
                    }
                };
            }
            return rotated;
        });
        setDimensions(d => ({ rows: d.cols, cols: d.rows }));
    };

    const handlePrint = () => {
        alert("You may need to change print settings - such as page size, margins, and scaling - to get the fieldmap to display properly in the print preview. Select \"Background graphics\" to ensure the legend includes colors.");
        const title = selectedView === 'fieldmap' ? 'Field Map View' : selectedViewLabel;
        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Print Field Map</title>');
            
            // Copy styles from the main window to ensure Tailwind classes work in the print window
            document.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => {
                printWindow.document.write(style.outerHTML);
            });

            // Extract the dynamic gradient style to override print resets
            const gradientDiv = document.querySelector('#legend_list div[style*="linear-gradient"]');
            const gradientStyle = gradientDiv ? (gradientDiv as HTMLElement).style.background : '';

            printWindow.document.write(`
                <style>
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        flex-direction: column;
                        margin: 0;
                        padding: 20px;
                    }
                    svg {
                        max-width: 100%;
                        height: auto !important;
                        display: block;
                        margin: 0 auto;
                    }
                    #legend_list {
                        width: 100%;
                        margin-bottom: 20px;
                    }
                    @media print {
                        body { padding: 0; }
                        
                        /* Override aggressive print resets (like Bootstrap's) by using higher specificity than '*' */
                        #legend_list span, 
                        #legend_list div {
                            print-color-adjust: exact !important;
                            -webkit-print-color-adjust: exact !important;
                        }

                        /* Re-assert the dynamic heatmap gradient */
                        #legend_list div[style*="linear-gradient"] {
                            background: ${gradientStyle} !important;
                        }

                        /* Explicitly re-assert standard legend colors to fight off 'background: transparent !important' */
                        #legend_list .tw\\:bg-\\[\\#d3d3d3\\] { background-color: #d3d3d3 !important; }
                        #legend_list .tw\\:bg-\\[\\#c7e9b4\\] { background-color: #c7e9b4 !important; }
                        #legend_list .tw\\:bg-\\[\\#41b6c4\\] { background-color: #41b6c4 !important; }
                        #legend_list .tw\\:bg-\\[\\#6a5acd\\] { background-color: #6a5acd !important; }
                        #legend_list .tw\\:bg-\\[\\#008000\\] { background-color: #008000 !important; }
                        #legend_list .tw\\:bg-\\[\\#ff0000\\] { background-color: #ff0000 !important; }
                        #legend_list .tw\\:bg-\\[\\#000000\\] { background-color: #000000 !important; }
                        #legend_list .tw\\:bg-\\[\\#a9afaf\\] { background-color: #a9afaf !important; }
                        #legend_list .tw\\:bg-\\[\\#ffffff\\] { background-color: #ffffff !important; }
                    }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                ${document.getElementById('legend_list')?.outerHTML || ''}
                ${document.getElementById('fieldmap_chart_svg')?.outerHTML || ''}
            </body></html>
            `);
            printWindow.document.close();
            
            setTimeout(() => {
                if (printWindow) printWindow.print();
            }, 500);
        }
    };

    const downloadHeatmapImage = () => {
        const svgEl = document.getElementById('fieldmap_chart_svg');
        if (!svgEl) return;
        
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const blobURL = URL.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = svgEl.clientWidth || 1500;
            canvas.height = svgEl.clientHeight || 1500;
            const context = canvas.getContext('2d');
            if (context) {
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0);
                
                const pngData = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = `${selectedViewLabel || 'fieldmap'}_heatmap.png`;
                downloadLink.href = pngData;
                downloadLink.click();
            }
        };
        image.src = blobURL;
    };

    const handleDownloadCSV = () => {
        let cols_csv_header = [];
        for (let i = bounds.minCol; i <= bounds.maxCol; i++) {
            cols_csv_header.push(i);
        }
        if (invertCols) {
            cols_csv_header.reverse();
        }
        let csv = '';
        csv += ['Rows/Columns', ...cols_csv_header].join(',') + '\n';

        let coord_matrix: string[][] = [];
        const sortedPlots = [...plotList].filter(p => p.type !== 'border');

        sortedPlots.forEach(plot => {
            const r = Number(plot.observationUnitPosition.positionCoordinateY) - bounds.minRow;
            const c = Number(plot.observationUnitPosition.positionCoordinateX) - bounds.minCol;

            if (!coord_matrix[r]) coord_matrix[r] = [];

            let cellVal = '';
            if (csvDownloadOpts.accession) {
                cellVal += plot.germplasmName || plot.crossName || '';
                if (plot.additionalInfo?.intercropGermplasm) {
                    plot.additionalInfo.intercropGermplasm.forEach((g: any) => {
                        cellVal += `, ${g.germplasmName}`;
                    });
                }
            }
            if (csvDownloadOpts.obsUnit && plot.observationUnitName) {
                cellVal += (cellVal ? '\n' : '') + plot.observationUnitName;
            }
            if (csvDownloadOpts.plotId && plot.observationUnitDbId) {
                cellVal += (cellVal ? '\n' : '') + plot.observationUnitDbId;
            }
            if (csvDownloadOpts.plotNum && plot.observationUnitPosition.observationLevel?.levelCode) {
                cellVal += (cellVal ? '\n' : '') + plot.observationUnitPosition.observationLevel.levelCode;
            }
            if (csvDownloadOpts.familyName && plot.additionalInfo?.familyName) {
                cellVal += (cellVal ? '\n' : '') + plot.additionalInfo?.familyName;
            }
            if (csvDownloadOpts.crossName && plot.crossName) {
                cellVal += (cellVal ? '\n' : '') + plot.crossName;
            }

            coord_matrix[r][c] = `"${cellVal}"`;
        });

        if (!invertRows) {
            coord_matrix.reverse();
        }

        coord_matrix.forEach((rowArr, idx) => {
            if (!rowArr) rowArr = Array(bounds.numCols).fill('""');
            for (let i = 0; i < bounds.numCols; i++) {
                if (rowArr[i] === undefined) rowArr[i] = '""';
            }
            if (invertCols) {
                rowArr.reverse();
            }

            const rowLabel = invertRows ? bounds.minRow + idx : bounds.maxRow - idx;
            csv += [rowLabel, ...rowArr].join(',') + '\n';
        });

        const hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = `Trial_${trialId}_spatial_layout.csv`;
        hiddenElement.click();
        setShowDownloadCSVModal(false);
    };

    const handleSuppressPhenotype = () => {
        if (!selectedPlot) return;
        const currentTraitId = selectedView.replace(' (corrected)', '').replace(' (adjustment)', '');
        const valObj = heatmapData[selectedPlot.observationUnitDbId || ''];
        if (!valObj) return;

        setLoading(true);
        fetch(`/ajax/breeders/trial/${trialId}/suppress_phenotype`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                plot_name: selectedPlot.observationUnitName,
                phenotype_value: String(valObj.val),
                trait_id: currentTraitId,
                phenotype_id: valObj.id
            })
        })
            .then(res => res.json())
            .then(response => {
                setLoading(false);
                if (response.error) {
                    alert(response.error);
                } else {
                    alert('Phenotype was suppressed successfully!');
                    setShowSuppressModal(false);
                    setShowPlotDetails(false);
                    fetchHeatmapObservations(currentTraitId);
                }
            })
            .catch(() => {
                setLoading(false);
            });
    };

    const handleDeleteSingleTrait = () => {
        const currentTraitId = selectedView.replace(' (corrected)', '').replace(' (adjustment)', '');
        setLoading(true);
        fetch(`/ajax/breeders/trial/${trialId}/delete_single_trait`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                traits_id: JSON.stringify([currentTraitId])
            })
        })
            .then(res => res.json())
            .then(response => {
                setLoading(false);
                if (response.error) {
                    alert(response.error);
                } else {
                    alert('Trait deleted successfully!');
                    setShowDeleteTraitModal(false);
                    setSelectedView('fieldmap');
                    setHeatmapData({});
                    loadVariables();
                }
            })
            .catch(() => {
                setLoading(false);
            });
    };

    const plotStructureLayoutType = useMemo(() => {
        if (!plotStructure || !plotStructure.has) return 'none';
        const children = Object.values(plotStructure.has) as PlotStructureNode[];
        if (children.length > 0) {
            const firstChild = children[0];
            if (firstChild.type === 'subplot') {
                if (firstChild.has) {
                    const subChildren = Object.values(firstChild.has) as PlotStructureNode[];
                    if (subChildren.length > 0 && subChildren[0].attributes?.row_number?.value > 0) {
                        return 'subplot_grid';
                    }
                }
            } else if (firstChild.type === 'plant' && firstChild.attributes?.row_number?.value > 0) {
                return 'plant_grid';
            }
        }
        return 'tree';
    }, [plotStructure]);

    return (
        <div className="tw:p-3.75">
            <div className="panel panel-default">
                <div className="panel-body">
                    <div className="tw:flex tw:gap-6.25 tw:flex-wrap tw:items-center">
                        <div className="form-group tw:m-0 tw:min-w-50">
                            <label className="tw:mr-2.5">Select Layout View:</label>
                            <select
                                className="form-control"
                                value={selectedView}
                                onChange={e => {
                                    setSelectedViewLabel(e.target.options[e.target.selectedIndex]?.text || '');
                                    handleViewChange(e.target.value);
                                }}
                            >
                                <optgroup label="Field Map">
                                    <option value="fieldmap">View Field Layout</option>
                                    <option value="geofieldmap">View Geo Field Layout</option>
                                </optgroup>
                                <optgroup label="Assayed Traits">
                                    {Object.keys(variables).sort().map(name => (
                                        <option key={variables[name]} value={variables[name]}>{name}</option>
                                    ))}
                                </optgroup>
                                {Object.keys(spatialAdjustments).length > 0 && (
                                    <optgroup label="Spatial Corrections">
                                        {Object.keys(variables).sort().map(name => {
                                            const id = variables[name];
                                            return (
                                                <React.Fragment key={id}>
                                                    <option value={`${id} (corrected)`}>{name} (corrected)</option>
                                                    <option value={`${id} (adjustment)`}>{name} (adjustment)</option>
                                                </React.Fragment>
                                            );
                                        })}
                                    </optgroup>
                                )}
                            </select>
                        </div>

                        <div className="form-check tw:m-0">
                            <label className="form-check-label">
                                <input
                                    type="checkbox"
                                    className="form-check-input tw:mr-1.25"
                                    checked={displayLinkedTrials}
                                    onChange={e => toggleLinkedTrials(e.target.checked)}
                                />
                                Display Trials in Same Field
                            </label>
                        </div>
                    </div>

                    {displayLinkedTrials && linkedTrialsList.length > 0 && (
                        <div className="tw:mt-2.5 tw:p-2.5 tw:bg-[#f9f9f9] tw:rounded-lg">
                            <strong>Trials in Same Field:</strong>
                            <div className="tw:flex tw:gap-2.5 tw:flex-wrap tw:mt-1.25">
                                {linkedTrialsList.map(t => (
                                    <span key={t.id} style={{ background: t.bg, color: t.fg }} className="tw:px-2 tw:py-0.75 tw:rounded-lg tw:text-[12px]">
                                        {t.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && (
                <div className="panel panel-default">
                    <div className="panel-body tw:flex tw:gap-3.75 tw:items-center tw:flex-wrap">
                        {!showControlsSection ? (
                            <button className="btn btn-primary btn-sm" onClick={() => setShowControlsSection(true)}>View Controls</button>
                        ) : (
                            <div className="tw:flex tw:gap-2.5 tw:items-center tw:flex-wrap">
                                <select
                                    className="form-control"
                                    value={selectedControlPlot}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSelectedControlPlot(val);
                                        if (val) {
                                            const p = plotList.find(plot => plot.observationUnitDbId === val);
                                            if (p) {
                                                setControlRelationshipText(`Plot: ${p.observationUnitName} contains Check: ${p.germplasmName || ''}`);
                                            }
                                        } else {
                                            setControlRelationshipText('');
                                        }
                                    }}
                                >
                                    <option value="">checks and plot numbers</option>
                                    {controlPlots.map(cp => (
                                        <option key={cp.observationUnitDbId} value={cp.observationUnitDbId}>
                                            Plot:{cp.observationUnitName} [{cp.germplasmName}]
                                        </option>
                                    ))}
                                </select>
                                {controlRelationshipText && (
                                    <span className="text-sm font-semibold bg-[#fcf8e3] p-1 border rounded">{controlRelationshipText}</span>
                                )}
                                <button className="btn btn-default btn-xs" onClick={() => { setShowControlsSection(false); setSelectedControlPlot(''); setControlRelationshipText(''); }}>Hide</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedView === 'geofieldmap' ? (
                <div key="geofieldmap-panel" className="panel panel-default">
                    <div className="panel-body tw:flex tw:flex-col tw:gap-2.5">
                        <div ref={geoMapRef} style={{ width: '100%', height: '600px' }}></div>
                        <button className="btn btn-success tw:self-start" onClick={submitGeoLayout}>Submit Geo Layout Changes</button>
                    </div>
                </div>
            ) : (
                <div key="standard-fieldmap-panel" className="panel panel-default">
                    <div className="panel-body tw:grid">
                        <div className="tw:flex tw:gap-5 tw:flex-wrap tw:mb-3.75">
                            <div className="form-inline">
                                <label className="tw:mr-1.25">Plot Layout:</label>
                                <select 
                                    className="form-control" 
                                    value={plotLayout} 
                                    onChange={e => {
                                        const nextLayout = e.target.value as 'serpentine' | 'zigzag';
                                        setPlotLayout(nextLayout);
                                        setPlotObject(prev => recalculateLayout(prev, dimensions.rows || bounds.numRows, dimensions.cols || bounds.numCols, nextLayout));
                                    }} 
                                    disabled={displayLinkedTrials}
                                >
                                    <option value="serpentine">Serpentine</option>
                                    <option value="zigzag">Zigzag</option>
                                </select>
                            </div>
                            <div className="form-check tw:flex tw:items-center">
                                <label className="form-check-label">
                                    <input type="checkbox" className="form-check-input tw:mr-1.25" checked={invertRows} onChange={e => setInvertRows(e.target.checked)} />
                                    Invert Rows
                                </label>
                            </div>
                            <div className="form-check tw:flex tw:items-center">
                                <label className="form-check-label">
                                    <input type="checkbox" className="form-check-input tw:mr-1.25" checked={invertCols} onChange={e => setInvertCols(e.target.checked)} />
                                    Invert Columns
                                </label>
                            </div>
                            <div className="form-inline">
                                <label className="tw:mr-1.25">Color By:</label>
                                <select className="form-control" value={colorVar} onChange={e => setColorVar(e.target.value as any)}>
                                    <option value="parity">Default (Parity)</option>
                                    <option value="germplasm">{stockLabel}</option>
                                    <option value="block">Block Number</option>
                                    <option value="family_name">Family</option>
                                    <option value="cross_name">Cross</option>
                                </select>
                            </div>
                            <div className="form-inline">
                                <label className="tw:mr-1.25">Label By:</label>
                                <select className="form-control" value={labelVar} onChange={e => setLabelVar(e.target.value as any)}>
                                    <option value="plot_number">Plot Number</option>
                                    <option value="germplasm">{stockLabel} Name</option>
                                    <option value="block">Block Number</option>
                                    <option value="family_name">Family</option>
                                    <option value="cross_name">Cross</option>
                                </select>
                            </div>
                            <div className="form-inline">
                                <label className="tw:mr-1.25">Label Size:</label>
                                <input type="number" className="form-control tw:w-15" value={labelSize} onChange={e => setLabelSize(parseInt(e.target.value) || 10)} />
                            </div>
                            <div className="tw:flex tw:gap-2.5 tw:items-center">
                                <label className="tw:m-0">Include Borders:</label>
                                <label className="tw:font-normal tw:m-0"><input type="checkbox" checked={topBorder} onChange={e => setTopBorder(e.target.checked)} disabled={displayLinkedTrials} /> Top</label>
                                <label className="tw:font-normal tw:m-0"><input type="checkbox" checked={bottomBorder} onChange={e => setBottomBorder(e.target.checked)} disabled={displayLinkedTrials} /> Bottom</label>
                                <label className="tw:font-normal tw:m-0"><input type="checkbox" checked={leftBorder} onChange={e => setLeftBorder(e.target.checked)} disabled={displayLinkedTrials} /> Left</label>
                                <label className="tw:font-normal tw:m-0"><input type="checkbox" checked={rightBorder} onChange={e => setRightBorder(e.target.checked)} disabled={displayLinkedTrials} /> Right</label>
                            </div>
                        </div>
                        <div className="tw:flex tw:gap-2.5 tw:flex-wrap tw:mb-3.75">
                            <button className="btn btn-default" onClick={handleTranspose} disabled={displayLinkedTrials}>Transpose Display</button>
                            <button className="btn btn-default" onClick={handleRotate} disabled={displayLinkedTrials}>Rotate</button>
                            <button className="btn btn-default" onClick={() => setShowDimDialog(true)} disabled={displayLinkedTrials}>Change Dimensions</button>
                            <button className="btn btn-default" onClick={() => setShowDownloadCSVModal(true)}>Download Spatial Layout (CSV)</button>
                            <button className="btn btn-default" onClick={handlePrint}>Print Fieldmap</button>
                            {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && (
                                <button className="btn btn-default" onClick={downloadHeatmapImage}>Download Heatmap Image</button>
                            )}
                            <button className="btn btn-success" onClick={submitFieldLayout} disabled={displayLinkedTrials}>Submit Layout Changes</button>
                            {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && (
                                <button className="btn btn-danger" onClick={() => setShowDeleteTraitModal(true)}>Delete Selected Trait</button>
                            )}
                        </div>

                        <div 
                            ref={containerRef}
                            className={`tw:relative tw:border tw:border-[#ddd] tw:bg-[#fcfcfc] tw:h-300 tw:flex tw:overflow-hidden tw:select-none ${isDragging ? 'tw:cursor-grabbing' : 'tw:cursor-grab'}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                        >
                            {/* Zoom controls HUD */}
                            <div className="tw:absolute tw:bottom-4 tw:right-4 tw:z-50 tw:flex tw:flex-col tw:gap-1 tw:bg-white/80 tw:p-1.5 tw:rounded-md tw:border tw:border-[#ccc] tw:shadow-sm">
                                <button 
                                    className="btn btn-default btn-xs tw:font-bold" 
                                    onClick={() => updateZoomAndPan(zoom * 1.2)}
                                    title="Zoom In"
                                >+</button>
                                <button 
                                    className="btn btn-default btn-xs tw:font-bold" 
                                    onClick={() => updateZoomAndPan(zoom / 1.2)}
                                    title="Zoom Out"
                                >-</button>
                                <button
                                    className="btn btn-default btn-xs tw:text-[10px]" 
                                    onClick={handleResetZoomPan}
                                    title="Reset View"
                                >Reset</button>
                            </div>

                            <svg
                                id="fieldmap_chart_svg"
                                className="tw:max-w-none tw:shrink-0"
                                width={svgWidth}
                                height={svgHeight}
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
                            >
                                <g transform="translate(50, 25)">
                                    {/* Pass 1: Render Plot Geometry (Backgrounds, Borders, Icons) */}
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

                                    {/* Pass 2: Render Label Layer (Always on top) */}
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
                                </g>
                            </svg>

                            {/* Dynamic Tooltip */}
                            <FieldMapTooltip
                                hoveredPlot={hoveredPlot}
                                overlappingPlots={overlappingPlots}
                                displayLinkedTrials={displayLinkedTrials}
                                linkedTrialsList={linkedTrialsList}
                                plotContentCache={plotContentCache}
                                selectedView={selectedView}
                                selectedViewLabel={selectedViewLabel}
                                heatmapData={heatmapData}
                            />
                        </div>
                    </div>
                </div>
            )}

            <FieldMapLegend
                valueColorScale={valueColorScale}
                selectedView={selectedView}
                selectedViewLabel={selectedViewLabel}
            />

            <DownloadCSVModal 
                show={showDownloadCSVModal}
                onClose={() => setShowDownloadCSVModal(false)}
                csvDownloadOpts={csvDownloadOpts}
                setCsvDownloadOpts={setCsvDownloadOpts}
                onDownload={handleDownloadCSV}
            />

            <SuppressPhenotypeModal 
                show={showSuppressModal}
                onClose={() => setShowSuppressModal(false)}
                plotName={selectedPlot?.observationUnitName || ''}
                phenotypeValue={selectedPlot ? heatmapData[selectedPlot.observationUnitDbId || '']?.val : undefined}
                onSuppress={handleSuppressPhenotype}
            />

            <DeleteTraitModal 
                show={showDeleteTraitModal}
                onClose={() => setShowDeleteTraitModal(false)}
                onDelete={handleDeleteSingleTrait}
            />

            <DimensionsModal 
                show={showDimDialog}
                onClose={() => setShowDimDialog(false)}
                dimRowsInput={dimRowsInput}
                setDimRowsInput={setDimRowsInput}
                dimColsInput={dimColsInput}
                setDimColsInput={setDimColsInput}
                fillerAccessionInput={fillerAccessionInput}
                setFillerAccessionInput={setFillerAccessionInput}
                onApply={handleApplyDimensions}
            />

            <PlotDetailsModal 
                show={showPlotDetails}
                onClose={() => setShowPlotDetails(false)}
                plot={selectedPlot}
                stockLabel={stockLabel}
                showEditAccession={showEditAccession}
                setShowEditAccession={setShowEditAccession}
                plotStructure={plotStructure}
                plotStructureLayoutType={plotStructureLayoutType}
                plotImages={plotImages}
                newAccession={newAccession}
                setNewAccession={setNewAccession}
                newPlotName={newPlotName}
                setNewPlotName={setNewPlotName}
                onSubmitReplaceAccession={submitReplaceAccession}
                selectedView={selectedView}
                hasHeatmapValue={selectedPlot ? !!heatmapData[selectedPlot.observationUnitDbId || ''] : false}
                onSuppressClick={() => setShowSuppressModal(true)}
            />

            <CuratorWarningModal 
                show={showCuratorWarning}
                onClose={() => setShowCuratorWarning(false)}
                onOverride={() => submitReplaceAccession('override')}
            />

            {/* Download Options Panel */}
        <DownloadPlotOrderPanel
            hasColAndRowNumbers={hasColAndRowNumbers}
            hasSubplotEntries={hasSubplotEntries}
            hasPlantEntries={hasPlantEntries}
            downloadOpts={downloadOpts}
            setDownloadOpts={setDownloadOpts}
            onDownload={handleDownloadOrder}
        />
        </div>
    );
};

export const init = (containerId: string, options: any) => {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(<FieldMapContainer {...options} />);
    }
};