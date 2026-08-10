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
    trial_colors, 
    trial_colors_text, 
    interpolate, 
    pearsonSkewness 
} from '../include/fieldmap/utils/functions';
import { printFieldMap } from '../include/fieldmap/utils/print';
import { downloadLayoutCSV } from '../include/fieldmap/utils/downloadCsv';
import { FieldMapLegend } from '../include/fieldmap/components/FieldMapLegend';
import { FieldMapTooltip } from '../include/fieldmap/components/FieldMapTooltip';
import { PlotLayer } from '../include/fieldmap/components/PlotLayer';
import { LabelLayer } from '../include/fieldmap/components/LabelLayer';
import { DownloadPlotOrderPanel } from '../include/fieldmap/components/DownloadPlotOrderPanel';
import { PlotDetailsModal } from '../include/fieldmap/modals/PlotDetailsModal';
import { FieldMapHeaderPanel } from '../include/fieldmap/components/FieldMapHeaderPanel';
import { FieldMapControlPanel } from '../include/fieldmap/components/FieldMapControlPanel';
import { FieldMapSettingsPanel } from '../include/fieldmap/components/FieldMapSettingsPanel';
import { 
    DimensionsModal, 
    DownloadCSVModal, 
    SuppressPhenotypeModal,
    DeleteTraitModal, 
    CuratorWarningModal 
} from '../include/fieldmap/modals/FieldmapModals';
import { BorderProvider, useBorder } from '../include/fieldmap/contexts/BorderContext';
import { PlotGridProvider, usePlotGrid } from '../include/fieldmap/contexts/PlotGridContext';
import { ControlProvider } from '../include/fieldmap/contexts/ControlContext';
import { LayoutConfigProvider, useLayoutConfig } from '../include/fieldmap/contexts/LayoutConfigContext';

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

const FieldMapContainerInner: React.FC<FieldMapContainerProps> = ({
    trialId,
    trialStockType,
    hasColAndRowNumbers,
    hasSubplotEntries,
    hasPlantEntries,
    authToken
}) => {
    const {
        topBorder, setTopBorder,
        leftBorder, setLeftBorder,
        rightBorder, setRightBorder,
        bottomBorder, setBottomBorder
    } = useBorder();

    const {
        plotList,
        bounds, renderBounds,
        parsePlotData,
        fillerAccessionId,
        gridMatrix,
        setDimensions,
        setFillerAccessionId,
        isTransposed,
        mapRotation
    } = usePlotGrid();

    const {
        plotLayout, setPlotLayout,
        invertRows, setInvertRows,
        invertCols, setInvertCols,
        colorVar, setColorVar,
        labelVar, setLabelVar,
        labelSize, setLabelSize
    } = useLayoutConfig();

    const [loading, setLoading] = useState(false);
    const [selectedViewLabel, setSelectedViewLabel] = useState<string>('');
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [selectedView, setSelectedView] = useState<string>('fieldmap');
    const [northArrowAngle, setNorthArrowAngle] = useState<number>(0);
    const [displayLinkedTrials, setDisplayLinkedTrials] = useState(false);
    const [linkedTrialsList, setLinkedTrialsList] = useState<TrialDetails[]>([]);
    const [activeTrialIds, setActiveTrialIds] = useState<string[]>([trialId]);

    const [showDimDialog, setShowDimDialog] = useState(false);
    const [dimRowsInput, setDimRowsInput] = useState('');
    const [dimColsInput, setDimColsInput] = useState('');
    const [fillerAccessionInput, setFillerAccessionInput] = useState('');

    const [heatmapData, setHeatmapData] = useState<Record<string, HeatmapValue>>({});
    const [spatialAdjustments, setSpatialAdjustments] = useState<Record<string, Record<string, number>>>({});

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
        loadNorthArrowAngle();
    }, [activeTrialIds]);

    const loadNorthArrowAngle = () => {
        fetch(`/ajax/breeders/trial/${trialId}/north_arrow_angle`)
            .then(res => res.json())
            .then(data => {
                if (data?.north_arrow_angle !== undefined && data.north_arrow_angle !== null) {
                    setNorthArrowAngle(Number(data.north_arrow_angle));
                }
            })
            .catch(() => {});
    };

    const svgWidth = (renderBounds.numCols + 1) * 55 + 50;
    const svgHeight = (renderBounds.numRows + 1) * 55 + 50;

    // Navigation Engine Hooks
    const { 
        zoom, pan, isDragging, containerRef, hasDragged, 
        handleMouseDown, handleMouseMove, handleMouseUpOrLeave, handleResetZoomPan, updateZoomAndPan 
    } = useZoomPan(svgWidth, svgHeight);

    const northArrowRotation = useMemo(() => {
        let angle = northArrowAngle + mapRotation;
        if (invertCols && invertRows) {
            return angle + 180;
        } else if (invertCols) {
            return -angle;
        } else if (invertRows) {
            return 180 - angle;
        }
        return angle;
    }, [northArrowAngle, mapRotation, invertCols, invertRows]);

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

        const northArrowPromise = fetch(`/ajax/breeders/trial/${trialId}/north_arrow_angle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                north_arrow_angle: String(northArrowAngle)
            })
        });

        Promise.all([putPromise, postPromise, northArrowPromise])
            .then(() => fetch(`/ajax/breeders/trial/${trialId}/refresh_cache`, { method: 'POST' }))
            .then(() => {
                alert('Field Plot layout submitted successfully!');
                fetchObservationUnits();
                loadNorthArrowAngle();
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
            if (accessionId) {
                setFillerAccessionId(accessionId);
            }
            setDimensions({ rows, cols });
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
        downloadLayoutCSV(trialId, bounds, plotList, invertCols, invertRows, csvDownloadOpts);
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
            <FieldMapHeaderPanel
                selectedView={selectedView}
                setSelectedViewLabel={setSelectedViewLabel}
                handleViewChange={handleViewChange}
                variables={variables}
                spatialAdjustments={spatialAdjustments}
                displayLinkedTrials={displayLinkedTrials}
                toggleLinkedTrials={toggleLinkedTrials}
                linkedTrialsList={linkedTrialsList}
            />

            <FieldMapControlPanel
                selectedView={selectedView}
            />

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
                        <FieldMapSettingsPanel
                            displayLinkedTrials={displayLinkedTrials}
                            selectedView={selectedView}
                            selectedViewLabel={selectedViewLabel}
                            stockLabel={stockLabel}
                            setShowDimDialog={setShowDimDialog}
                            setShowDownloadCSVModal={setShowDownloadCSVModal}
                            printFieldMap={printFieldMap}
                            downloadHeatmapImage={downloadHeatmapImage}
                            submitFieldLayout={submitFieldLayout}
                            setShowDeleteTraitModal={setShowDeleteTraitModal}
                            northArrowAngle={northArrowAngle}
                            setNorthArrowAngle={setNorthArrowAngle}
                        />

                        <div
                            ref={containerRef}
                            className={`tw:relative tw:border tw:border-[#ddd] tw:bg-[#fcfcfc] tw:h-300 tw:flex tw:overflow-hidden tw:select-none ${isDragging ? 'tw:cursor-grabbing' : 'tw:cursor-grab'}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                        >
                            {/* North Arrow HUD overlay */}
                            {!isTransposed && (
                                <div
                                    className="tw:absolute tw:top-4 tw:right-4 tw:z-50 tw:flex tw:items-center tw:justify-center tw:pointer-events-none tw:bg-white/85 tw:rounded-full tw:border tw:border-[#ccc] tw:shadow-sm"
                                    style={{ width: '70px', height: '70px' }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 200 200"
                                        width="32"
                                        height="60"
                                        overflow="visible"
                                        style={{
                                            transform: `rotate(${northArrowRotation}deg) translateY(-10px)`,
                                            transformOrigin: 'center center',
                                            transition: 'transform 0.2s ease-out'
                                        }}
                                    >
                                        <path style={{ fill: '#ffffff', stroke: 'rgb(0, 0, 0)', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '7px' }} d="M 99.395 63.781 L 99.395 238.843 L 7.257 292.897 L 99.395 63.781 Z" />
                                        <path style={{ stroke: 'rgb(0, 0, 0)', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '7px', transformBox: 'fill-box', transformOrigin: '50% 50%' }} d="M 191.623 292.345 L 191.623 117.283 L 99.485 63.229 L 191.623 292.345 Z" transform="matrix(-1, 0, 0, -1, -0.000015, 0.000014)" />
                                        <text style={{ fontFamily: 'Roboto, sans-serif', fontSize: '70px', fontWeight: 572, whiteSpace: 'pre', fill: '#000000', transform: `rotate(${-northArrowRotation}deg)`, transformBox: 'fill-box', transformOrigin: 'center' }} x="76.43" y="35">N</text>
                                    </svg>
                                </div>
                            )}

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
                                    <PlotLayer
                                        gridMatrix={gridMatrix}
                                        selectedView={selectedView}
                                        displayLinkedTrials={displayLinkedTrials}
                                        linkedTrialsList={linkedTrialsList}
                                        overlappingPlots={overlappingPlots}
                                        heatmapData={heatmapData}
                                        valueColorScale={valueColorScale}
                                        onSelect={handlePlotSelect}
                                        onHover={(p, clientX, clientY) => setHoveredPlot({ plot: p, x: clientX, y: clientY })}
                                        onLeave={() => setHoveredPlot(null)}
                                    />

                                    <LabelLayer
                                        gridMatrix={gridMatrix}
                                        overlappingPlots={overlappingPlots}
                                    />
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

export const FieldMapContainer: React.FC<FieldMapContainerProps> = (props) => {
    return (
        <BorderProvider>
            <PlotGridProvider>
                <ControlProvider trialId={props.trialId}>
                    <LayoutConfigProvider>
                        <FieldMapContainerInner {...props} />
                    </LayoutConfigProvider>
                </ControlProvider>
            </PlotGridProvider>
        </BorderProvider>
    );
};

export const init = (containerId: string, options: any) => {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(<FieldMapContainer {...options} />);
    }
};