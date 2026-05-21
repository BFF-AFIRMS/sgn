import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';

interface ObservationLevel {
    levelCode: string | number;
    levelName: string;
    levelOrder?: number;
}

interface ObservationLevelRelationship {
    levelCode: string;
    levelName: string;
}

interface ObservationUnitPosition {
    positionCoordinateX: string | number;
    positionCoordinateY: string | number;
    observationLevel: ObservationLevel;
    observationLevelRelationships?: ObservationLevelRelationship[];
    entryType?: string;
}

interface Plot {
    type: 'data' | 'filler' | 'border' | 'empty_space';
    observationUnitDbId?: string;
    observationUnitName: string;
    observationUnitPosition: ObservationUnitPosition;
    germplasmDbId?: string;
    germplasmName?: string;
    crossName?: string;
    locationName?: string;
    studyName?: string;
    plotImageDbIds?: string[];
    additionalInfo?: {
        intercropGermplasm?: { germplasmName: string }[];
        familyName?: string;
        [key: string]: any;
    };
}

interface HeatmapValue {
    val: number;
    plot_name: string;
    id: string;
}

interface TrialDetails {
    id: string;
    name: string;
    bg: string;
    fg: string;
}

const trial_colors = [
    "#2f4f4f", "#ff8c00", "#ffff00", "#00ff00", "#9400d3",
    "#00ffff", "#1e90ff", "#ff1493", "#ffdab9", "#228b22",
];
const trial_colors_text = [
    "#ffffff", "#000000", "#000000", "#000000", "#ffffff",
    "#000000", "#ffffff", "#ffffff", "#000000", "#ffffff",
];

const colorNameToHex = (color: string): string => {
    const colors: Record<string, string> = {
        white: "#ffffff",
        darkred: "#8b0000",
        darkblue: "#00008b",
        red: "#ff0000",
        blue: "#0000ff",
        green: "#008000"
    };
    return colors[color.toLowerCase()] || color;
};

const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
};

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const interpolate = (color1: string, color2: string, factor: number) => {
    const rgb1 = hexToRgb(colorNameToHex(color1));
    const rgb2 = hexToRgb(colorNameToHex(color2));
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
    return rgbToHex(r, g, b);
};

const AccessionAutocomplete: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, placeholder, className }) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (value.length < 2) {
            setSuggestions([]);
            return;
        }
        const delayDebounce = setTimeout(() => {
            fetch(`/ajax/stock/accession_autocomplete?term=${encodeURIComponent(value)}`)
                .then(res => res.json())
                .then((data: any) => {
                    if (Array.isArray(data)) {
                        const list = data.map(item => typeof item === 'string' ? item : item.label || item.value);
                        setSuggestions(list);
                    }
                })
                .catch(() => {});
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [value]);

    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                value={value}
                onChange={e => { onChange(e.target.value); setShow(true); }}
                onBlur={() => setTimeout(() => setShow(false), 200)}
                placeholder={placeholder}
                className={className}
            />
            {show && suggestions.length > 0 && (
                <ul className="dropdown-menu" style={{ display: 'block', width: '100%', maxHeight: '200px', overflowY: 'auto', zIndex: 1000 }}>
                    {suggestions.map((s, idx) => (
                        <li key={idx} onMouseDown={() => { onChange(s); setShow(false); }}>
                            <a style={{ cursor: 'pointer' }}>{s}</a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

interface FieldMapContainerProps {
    trialId: string;
    dataLevel: string;
    trialStockType: string;
    hasColAndRowNumbers: boolean;
    hasSubplotEntries: boolean;
    hasPlantEntries: boolean;
    brapiRequireLogin: boolean;
    authToken?: string;
}

const FieldMapContainer: React.FC<FieldMapContainerProps> = ({
    trialId,
    dataLevel,
    trialStockType,
    hasColAndRowNumbers,
    hasSubplotEntries,
    hasPlantEntries,
    brapiRequireLogin,
    authToken
}) => {
    const [loading, setLoading] = useState(false);
    const [plotObject, setPlotObject] = useState<Record<string, Plot>>({});
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [selectedView, setSelectedView] = useState<string>('fieldmap');
    const [displayLinkedTrials, setDisplayLinkedTrials] = useState(false);
    const [linkedTrialsList, setLinkedTrialsList] = useState<TrialDetails[]>([]);
    const [activeTrialIds, setActiveTrialIds] = useState<string[]>([trialId]);

    const [plotLayout, setPlotLayout] = useState<'serpentine' | 'zigzag'>('serpentine');
    const [invertRows, setInvertRows] = useState(false);
    const [topBorder, setTopBorder] = useState(false);
    const [leftBorder, setLeftBorder] = useState(false);
    const [rightBorder, setRightBorder] = useState(false);
    const [bottomBorder, setBottomBorder] = useState(false);
    const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });
    const [transposeActive, setTransposeActive] = useState(false);

    const [showDimDialog, setShowDimDialog] = useState(false);
    const [dimRowsInput, setDimRowsInput] = useState('');
    const [dimColsInput, setDimColsInput] = useState('');
    const [fillerAccessionInput, setFillerAccessionInput] = useState('');
    const [fillerAccessionId, setFillerAccessionId] = useState<string | undefined>(undefined);

    const [heatmapData, setHeatmapData] = useState<Record<string, HeatmapValue>>({});
    const [spatialAdjustments, setSpatialAdjustments] = useState<any>(null);

    const [hoveredPlot, setHoveredPlot] = useState<{ plot: Plot; x: number; y: number } | null>(null);
    const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
    const [plotStructure, setPlotStructure] = useState<any>(null);
    const [plotImages, setPlotImages] = useState<string>('');
    const [showPlotDetails, setShowPlotDetails] = useState(false);
    const [showEditAccession, setShowEditAccession] = useState(false);
    const [newAccession, setNewAccession] = useState('');
    const [newPlotName, setNewPlotName] = useState('');

    const [downloadOpts, setDownloadOpts] = useState({
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

    useEffect(() => {
        loadObservationUnits();
        loadVariables();
        loadSpatialAdjustments();
    }, [activeTrialIds]);

    const loadObservationUnits = () => {
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
                    const first = units[0];
                    if (first.additionalInfo) {
                        setTopBorder(!!first.additionalInfo.top_border_selection);
                        setLeftBorder(!!first.additionalInfo.left_border_selection);
                        setRightBorder(!!first.additionalInfo.right_border_selection);
                        setBottomBorder(!!first.additionalInfo.bottom_border_selection);
                        setInvertRows(!!first.additionalInfo.invert_row_checkmark);
                        if (first.additionalInfo.plot_layout) {
                            setPlotLayout(first.additionalInfo.plot_layout);
                        }
                    }
                    parsePlotData(units);
                }
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
                alert('Error loading plot observation units.');
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

            if (plot.observationUnitPosition?.observationLevel?.levelName === 'plot') {
                mapped[plot.observationUnitDbId] = {
                    type: 'data',
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

    const plotList = useMemo(() => {
        return Object.values(plotObject);
    }, [plotObject]);

    const bounds = useMemo(() => {
        if (plotList.length === 0) return { minCol: 1, maxCol: 1, minRow: 1, maxRow: 1, numRows: 1, numCols: 1 };
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

        return {
            minCol,
            maxCol,
            minRow,
            maxRow,
            numRows: maxRow - minRow + 1,
            numCols: maxCol - minCol + 1
        };
    }, [plotList]);

    const gridMatrix = useMemo(() => {
        const { minCol, maxCol, minRow, maxRow } = bounds;
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
                    rowArr.push({
                        type: 'empty_space',
                        observationUnitName: `Empty Space (${c}_${r})`,
                        observationUnitPosition: {
                            positionCoordinateX: c,
                            positionCoordinateY: r,
                            observationLevel: { levelCode: '', levelName: 'plot' }
                        }
                    });
                }
            }
            matrix.push(rowArr);
        }

        return matrix;
    }, [bounds, plotList]);

    console.log(plotList);
    console.log(bounds);
    console.log(gridMatrix);

    const getHeatmapObservations = (variableId: string) => {
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
                    if (!isNaN(Number(obs.value))) {
                        map[obs.observationUnitDbId] = {
                            val: Number(obs.value),
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
            getHeatmapObservations(variableId);
        }
    };

    const valueColorScale = useMemo(() => {
        const values = Object.values(heatmapData).map(v => v.val);
        if (values.length === 0) return { min: 0, max: 0, scale: (val: number) => '#ffffff' };
        const min = Math.min(...values);
        const max = Math.max(...values);
        const colors = min < 0 ? ['darkblue', 'white', 'darkred'] : ['white', 'darkred'];

        const scale = (val: number) => {
            if (min === max) return colors[0];
            const factor = (val - min) / (max - min);
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
    }, [heatmapData]);

    const handlePlotClick = (plot: Plot) => {
        if (plot.type === 'empty_space') return;
        setSelectedPlot(plot);
        setShowPlotDetails(true);
        setPlotStructure(null);
        setPlotImages('');

        fetch(`/stock/get_child_stocks/${plot.observationUnitDbId}`)
            .then(res => res.json())
            .then(response => {
                if (response?.data) {
                    setPlotStructure(JSON.parse(response.data));
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
    };

    const submitReplaceAccession = () => {
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
                override: 'override'
            })
        })
            .then(res => res.json())
            .then(response => {
                setLoading(false);
                if (response.error) {
                    alert(response.error);
                } else {
                    alert('Plot Accession Replaced successfully!');
                    setShowPlotDetails(false);
                    setShowEditAccession(false);
                    loadObservationUnits();
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

        const brapiPostObject = plotList
            .filter(plot => plot.type === 'filler')
            .map((plot, i) => ({
                additionalInfo: {
                    invert_row_checkmark: invertRows,
                    top_border_selection: topBorder,
                    left_border_selection: leftBorder,
                    right_border_selection: rightBorder,
                    bottom_border_selection: bottomBorder,
                    plot_layout: plotLayout
                },
                germplasmDbId: fillerAccessionId,
                germplasmName: fillerAccessionInput,
                observationUnitName: `${trialId} filler ${1000 + i}`,
                observationUnitPosition: {
                    observationLevel: { levelCode: 1000 + i, levelName: 'plot', levelOrder: 2 },
                    positionCoordinateX: plot.observationUnitPosition.positionCoordinateX,
                    positionCoordinateY: plot.observationUnitPosition.positionCoordinateY
                },
                trialDbId: trialId,
                studyDbId: trialId
            }));

        const brapiPutObject: Record<string, any> = {};
        plotList
            .filter(plot => plot.type === 'data')
            .forEach(plot => {
                brapiPutObject[plot.observationUnitDbId!] = {
                    additionalInfo: {
                        invert_row_checkmark: invertRows,
                        top_border_selection: topBorder,
                        left_border_selection: leftBorder,
                        right_border_selection: rightBorder,
                        bottom_border_selection: bottomBorder,
                        plot_layout: plotLayout
                    },
                    germplasmDbId: plot.germplasmDbId,
                    germplasmName: plot.germplasmName,
                    observationUnitName: plot.observationUnitName,
                    observationUnitPosition: {
                        observationLevel: { levelCode: plot.observationUnitPosition.observationLevel.levelCode, levelName: 'plot', levelOrder: 2 },
                        positionCoordinateX: plot.observationUnitPosition.positionCoordinateX,
                        positionCoordinateY: plot.observationUnitPosition.positionCoordinateY
                    },
                    trialDbId: trialId
                };
            });

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

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
                setLoading(false);
                alert('Field Plot layout submitted successfully!');
                loadObservationUnits();
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

    return (
        <div style={{ padding: '15px' }}>
            {loading && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                    </div>
                </div>
            )}

            <div className="panel panel-default">
                <div className="panel-body">
                    <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
                            <label style={{ marginRight: '10px' }}>Select Layout View:</label>
                            <select
                                className="form-control"
                                value={selectedView}
                                onChange={e => handleViewChange(e.target.value)}
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
                                {spatialAdjustments && (
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

                        <div className="form-check" style={{ margin: 0 }}>
                            <label className="form-check-label">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={displayLinkedTrials}
                                    onChange={e => toggleLinkedTrials(e.target.checked)}
                                    style={{ marginRight: '5px' }}
                                />
                                Display Trials in Same Field
                            </label>
                        </div>
                    </div>

                    {displayLinkedTrials && linkedTrialsList.length > 0 && (
                        <div style={{ marginTop: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                            <strong>Trials in Same Field:</strong>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                {linkedTrialsList.map(t => (
                                    <span key={t.id} style={{ background: t.bg, color: t.fg, padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                        {t.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Map Plot Container */}
            <div className="panel panel-default" style={{ overflow: 'auto' }}>
                <div className="panel-body">
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '15px' }}>
                        <div className="form-inline">
                            <label style={{ marginRight: '5px' }}>Plot Layout:</label>
                            <select className="form-control" value={plotLayout} onChange={e => setPlotLayout(e.target.value as any)}>
                                <option value="serpentine">Serpentine</option>
                                <option value="zigzag">Zigzag</option>
                            </select>
                        </div>
                        <div className="form-check" style={{ display: 'flex', alignItems: 'center' }}>
                            <label className="form-check-label">
                                <input type="checkbox" className="form-check-input" checked={invertRows} onChange={e => setInvertRows(e.target.checked)} style={{ marginRight: '5px' }} />
                                Invert Rows
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <label style={{ margin: 0 }}>Include Borders:</label>
                            <label style={{ fontWeight: 'normal', margin: 0 }}><input type="checkbox" checked={topBorder} onChange={e => setTopBorder(e.target.checked)} /> Top</label>
                            <label style={{ fontWeight: 'normal', margin: 0 }}><input type="checkbox" checked={bottomBorder} onChange={e => setBottomBorder(e.target.checked)} /> Bottom</label>
                            <label style={{ fontWeight: 'normal', margin: 0 }}><input type="checkbox" checked={leftBorder} onChange={e => setLeftBorder(e.target.checked)} /> Left</label>
                            <label style={{ fontWeight: 'normal', margin: 0 }}><input type="checkbox" checked={rightBorder} onChange={e => setRightBorder(e.target.checked)} /> Right</label>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <button className="btn btn-default" onClick={() => setTransposeActive(!transposeActive)}>Transpose Display</button>
                        <button className="btn btn-default" onClick={() => setShowDimDialog(true)}>Change Dimensions</button>
                        <button className="btn btn-success" onClick={submitFieldLayout}>Submit Layout Changes</button>
                    </div>

                    {/* Interactive D3/SVG Representation using Pure React State */}
                    <div style={{ position: 'relative', border: '1px solid #ddd', padding: '10px', background: '#fcfcfc', minHeight: '300px', display: 'flex', justifyContent: 'center' }}>
                        <svg
                            width={(bounds.numCols + (leftBorder ? 1 : 0) + (rightBorder ? 1 : 0)) * 55 + 50}
                            height={(bounds.numRows + (topBorder ? 1 : 0) + (bottomBorder ? 1 : 0)) * 55 + 50}
                        >
                            <g transform="translate(25, 25)">
                                {gridMatrix.map((row, rIdx) => {
                                    const displayY = invertRows ? rIdx : bounds.numRows - rIdx - 1;
                                    return row.map((plot, cIdx) => {
                                        const plotX = cIdx * 52;
                                        const plotY = displayY * 52;
                                        const isOverlapping = false; // Add custom check if multiple plots share coordinates
                                        let fill = '#c7e9b4';
                                        if (plot.type === 'empty_space') fill = '#ecefef';
                                        else if (plot.observationUnitPosition?.entryType === 'check') fill = '#6a5acd';
                                        else if (selectedView !== 'fieldmap' && selectedView !== 'geofieldmap') {
                                            const valObj = heatmapData[plot.observationUnitDbId || ''];
                                            fill = valObj ? valueColorScale.scale(valObj.val) : '#a9afaf';
                                        }

                                        return (
                                            <g
                                                key={plot.observationUnitDbId || `empty-${cIdx}-${rIdx}`}
                                                transform={`translate(${plotX}, ${plotY})`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handlePlotClick(plot)}
                                                onMouseEnter={(e) => setHoveredPlot({ plot, x: e.clientX, y: e.clientY })}
                                                onMouseLeave={() => setHoveredPlot(null)}
                                            >
                                                <rect
                                                    width={50}
                                                    height={50}
                                                    rx={4}
                                                    fill={fill}
                                                    stroke={isOverlapping ? '#ff0000' : '#41b6c4'}
                                                    strokeWidth={isOverlapping ? 3 : 1.5}
                                                />
                                                {plot.type === 'data' && (
                                                    <text x={25} y={30} textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold">
                                                        {plot.observationUnitPosition.observationLevel.levelCode}
                                                    </text>
                                                )}
                                                {plot.plotImageDbIds && plot.plotImageDbIds.length > 0 && (
                                                    <circle cx={42} cy={8} r={4} fill="#ff8c00" />
                                                )}
                                            </g>
                                        );
                                    });
                                })}
                            </g>
                        </svg>

                        {/* Dynamic Tooltip */}
                        {hoveredPlot && (
                            <div
                                style={{
                                    position: 'fixed',
                                    top: hoveredPlot.y + 15,
                                    left: hoveredPlot.x + 15,
                                    background: 'rgba(0, 0, 0, 0.85)',
                                    color: '#fff',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    zIndex: 10000,
                                    fontSize: '11px',
                                    pointerEvents: 'none',
                                    maxWidth: '280px'
                                }}
                            >
                                <div><strong>Plot:</strong> {hoveredPlot.plot.observationUnitName}</div>
                                {hoveredPlot.plot.germplasmName && <div><strong>Accession:</strong> {hoveredPlot.plot.germplasmName}</div>}
                                {hoveredPlot.plot.observationUnitPosition && (
                                    <div>
                                        <strong>Col / Row:</strong> {hoveredPlot.plot.observationUnitPosition.positionCoordinateX} / {hoveredPlot.plot.observationUnitPosition.positionCoordinateY}
                                    </div>
                                )}
                                {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && (
                                    <div style={{ color: '#ffd700', marginTop: '4px' }}>
                                        <strong>Value:</strong> {heatmapData[hoveredPlot.plot.observationUnitDbId || '']?.val ?? 'N/A'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Legend Container */}
            <div className="panel panel-default">
                <div className="panel-body">
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ display: 'inline-block', width: '15px', height: '15px', background: '#ecefef', border: '1px solid #ddd' }}></span> Empty Coordinate
                        <span style={{ display: 'inline-block', width: '15px', height: '15px', background: '#6a5acd', border: '1px solid #ddd' }}></span> Check Plot
                        <span style={{ display: 'inline-block', width: '15px', height: '15px', background: '#c7e9b4', border: '1px solid #ddd' }}></span> Standard Plot
                        {selectedView !== 'fieldmap' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>Low Value</span>
                                <div style={{ width: '120px', height: '15px', background: `linear-gradient(to right, ${valueColorScale.colors?.join(', ') || 'white, darkred'})` }} />
                                <span>High Value</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Dimensions Dialog */}
            {showDimDialog && (
                <div className="modal show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <button type="button" className="close" onClick={() => setShowDimDialog(false)}>&times;</button>
                                <h4 className="modal-title">Change Layout Dimensions</h4>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Rows:</label>
                                    <input type="number" className="form-control" value={dimRowsInput} onChange={e => setDimRowsInput(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Columns:</label>
                                    <input type="number" className="form-control" value={dimColsInput} onChange={e => setDimColsInput(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Filler Accession (Optional):</label>
                                    <AccessionAutocomplete value={fillerAccessionInput} onChange={setFillerAccessionInput} className="form-control" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-default" onClick={() => setShowDimDialog(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={() => {
                                    setDimensions({ rows: parseInt(dimRowsInput) || 0, cols: parseInt(dimColsInput) || 0 });
                                    setShowDimDialog(false);
                                }}>Apply</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Plot Details Modal */}
            {showPlotDetails && selectedPlot && (
                <div className="modal show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <button type="button" className="close" onClick={() => setShowPlotDetails(false)}>&times;</button>
                                <h4 className="modal-title">Plot Details: {selectedPlot.observationUnitName}</h4>
                            </div>
                            <div className="modal-body">
                                <ul className="nav nav-tabs" style={{ marginBottom: '15px' }}>
                                    <li className={!showEditAccession ? 'active' : ''}><a style={{ cursor: 'pointer' }} onClick={() => setShowEditAccession(false)}>Summary</a></li>
                                    <li className={showEditAccession ? 'active' : ''}><a style={{ cursor: 'pointer' }} onClick={() => setShowEditAccession(true)}>Replace Accession</a></li>
                                </ul>

                                {!showEditAccession ? (
                                    <div>
                                        <table className="table table-bordered">
                                            <tbody>
                                                <tr>
                                                    <td style={{ width: '30%', fontWeight: 'bold' }}>Plot Database ID:</td>
                                                    <td>{selectedPlot.observationUnitDbId}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ fontWeight: 'bold' }}>Accession Name:</td>
                                                    <td>{selectedPlot.germplasmName}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ fontWeight: 'bold' }}>Plot Number:</td>
                                                    <td>{selectedPlot.observationUnitPosition?.observationLevel?.levelCode}</td>
                                                </tr>
                                                {selectedPlot.observationUnitPosition?.positionCoordinateX && (
                                                    <tr>
                                                        <td style={{ fontWeight: 'bold' }}>Coordinates (X / Y):</td>
                                                        <td>{selectedPlot.observationUnitPosition.positionCoordinateX} / {selectedPlot.observationUnitPosition.positionCoordinateY}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>

                                        {/* Expandable Plot Structure Section */}
                                        {plotStructure && (
                                            <div style={{ marginTop: '20px' }}>
                                                <h5><strong>Plot Contents & Structure Hierarchy:</strong></h5>
                                                <div style={{ maxHeight: '250px', overflowY: 'auto', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                                                    <pre style={{ margin: 0, fontSize: '11px', border: 'none', background: 'transparent' }}>
                                                        {JSON.stringify(plotStructure, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}

                                        {plotImages && (
                                            <div style={{ marginTop: '20px' }}>
                                                <h5><strong>Plot Images:</strong></h5>
                                                <div dangerouslySetInnerHTML={{ __html: plotImages }} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div className="form-group">
                                            <label>New Accession Name:</label>
                                            <AccessionAutocomplete value={newAccession} onChange={setNewAccession} className="form-control" />
                                        </div>
                                        <div className="form-group">
                                            <label>New Plot Name (Optional):</label>
                                            <input type="text" className="form-control" value={newPlotName} onChange={e => setNewPlotName(e.target.value)} />
                                        </div>
                                        <div className="alert alert-warning">
                                            Replacing this accession will update layout structures and replicates. Ensure changes are correct.
                                        </div>
                                        <button className="btn btn-primary" onClick={submitReplaceAccession}>Update Accession</button>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-default" onClick={() => setShowPlotDetails(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Download Options Panel */}
            {hasColAndRowNumbers && (
                <div className="panel panel-default" style={{ marginTop: '20px' }}>
                    <div className="panel-heading">
                        <h3 className="panel-title" style={{ fontWeight: 'bold' }}>Download Plot Order</h3>
                    </div>
                    <div className="panel-body">
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ minWidth: '180px' }}>
                                <label>File Format:</label>
                                <select
                                    className="form-control"
                                    value={downloadOpts.type}
                                    onChange={e => setDownloadOpts({ ...downloadOpts, type: e.target.value })}
                                >
                                    <option value="">--Select Type--</option>
                                    <option value="planting">Planting Order</option>
                                    <option value="collection">Collection Order</option>
                                    <option value="harvest">Harvest Order</option>
                                    <option value="harvestmaster">HarvestMaster</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ minWidth: '180px' }}>
                                <label>Traversal Order:</label>
                                <select
                                    className="form-control"
                                    value={downloadOpts.order}
                                    onChange={e => setDownloadOpts({ ...downloadOpts, order: e.target.value })}
                                >
                                    <option value="by_col_serpentine">By Column: Serpentine</option>
                                    <option value="by_col_zigzag">By Column: Zigzag</option>
                                    <option value="by_row_serpentine">By Row: Serpentine</option>
                                    <option value="by_row_zigzag">By Row: Zigzag</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ minWidth: '180px' }}>
                                <label>Starting Corner:</label>
                                <select
                                    className="form-control"
                                    value={downloadOpts.start}
                                    onChange={e => setDownloadOpts({ ...downloadOpts, start: e.target.value })}
                                >
                                    <option value="bottom_left">Bottom Left</option>
                                    <option value="top_left">Top Left</option>
                                    <option value="top_right">Top Right</option>
                                    <option value="bottom_right">Bottom Right</option>
                                </select>
                            </div>
                        </div>

                        {downloadOpts.type === 'harvestmaster' && (
                            <div className="well well-sm" style={{ marginTop: '10px' }}>
                                <strong>HarvestMaster Mapping Config:</strong>
                                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                                    <div className="form-group">
                                        <label>PLTID:</label>
                                        <select className="form-control" value={downloadOpts.hmPltid} onChange={e => setDownloadOpts({ ...downloadOpts, hmPltid: e.target.value })}>
                                            <option value="plot_id">Plot Database ID</option>
                                            <option value="plot_name">Plot Name</option>
                                            <option value="plot_number">Plot Number</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Range Mapping:</label>
                                        <select className="form-control" value={downloadOpts.hmRange} onChange={e => setDownloadOpts({ ...downloadOpts, hmRange: e.target.value })}>
                                            <option value="col_number">Breedbase Column</option>
                                            <option value="row_number">Breedbase Row</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Row Mapping:</label>
                                        <select className="form-control" value={downloadOpts.hmRow} onChange={e => setDownloadOpts({ ...downloadOpts, hmRow: e.target.value })}>
                                            <option value="col_number">Breedbase Column</option>
                                            <option value="row_number">Breedbase Row</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '15px', margin: '15px 0' }}>
                            <label><input type="checkbox" checked={downloadOpts.borders} onChange={e => setDownloadOpts({ ...downloadOpts, borders: e.target.checked })} /> Include Borders</label>
                            <label><input type="checkbox" checked={downloadOpts.gaps} onChange={e => setDownloadOpts({ ...downloadOpts, gaps: e.target.checked })} /> Include Gaps</label>
                            {hasSubplotEntries && <label><input type="checkbox" checked={downloadOpts.subplots} onChange={e => setDownloadOpts({ ...downloadOpts, subplots: e.target.checked })} /> Include Subplots</label>}
                            {hasPlantEntries && <label><input type="checkbox" checked={downloadOpts.plants} onChange={e => setDownloadOpts({ ...downloadOpts, plants: e.target.checked })} /> Include Plants</label>}
                        </div>

                        <button className="btn btn-primary" onClick={handleDownloadOrder}>Generate & Download File</button>
                    </div>
                </div>
            )}
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
