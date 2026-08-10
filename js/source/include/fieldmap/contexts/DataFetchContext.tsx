import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { 
    trial_colors, 
    trial_colors_text, 
} from '../utils/functions';
import { usePlotGrid } from './PlotGridContext';
import { FieldMapContextProps } from '../context.types';
import { useModals } from './ModalsContext';
import { HeatmapValue, Plot } from '../model.types';
import { useLayoutConfig } from './LayoutConfigContext';
import { useHeatmap } from './HeatmapContext';
import { useView } from './ViewContext';

export interface DataFetchContextType {
	fetchObservationUnits: () => void;
	applyDimensions: (rowsInput: string, colsInput: string, fillerAccessionInput?: string) => Promise<void>;
	submitReplaceAccession: (override: 'check' | 'override', selectedPlot: Plot | null, newAccession: string, newPlotName: string) => void;
	handleSuppressPhenotype: () => void;
	loadNorthArrowAngle: () => void;
	loadVariables: () => void;
	loadSpatialAdjustments: () => void;
	toggleLinkedTrials: (checked: boolean) => void;
	submitFieldLayout: () => void;
	fetchHeatmapObservations: (variableId: string) => void;
	submitGeoLayout: () => Promise<void>;
	handleDeleteSingleTrait: () => Promise<void>;
}

const DataFetchContext = createContext<DataFetchContextType | undefined>(undefined);

export const DataFetchProvider: React.FC<FieldMapContextProps> = ({ trialId, authToken, children }) => {
	const {
		plotList,
		parsePlotData,
		fillerAccessionId, setFillerAccessionId,
		fillerAccessionName, setFillerAccessionName,
		setDimensions,
		gridMatrix,
	} = usePlotGrid();

	const {
		setLoading,
		setShowPlotDetails,
		setShowEditAccession,
		setShowCuratorWarning,
		setShowSuppressModal,
		setShowDeleteTraitModal,
	} = useModals();

	const {
		topBorder, setTopBorder,
		leftBorder, setLeftBorder,
		rightBorder, setRightBorder,
		bottomBorder, setBottomBorder,
		invertRows, setInvertRows,
		invertCols, setInvertCols,
		plotLayout, setPlotLayout,
		northArrowAngle, setNorthArrowAngle
	} = useLayoutConfig();

	const {
		heatmapData, setHeatmapData,
		variables, setVariables,
		spatialAdjustments, setSpatialAdjustments
	} = useHeatmap();

	const {
		selectedViewLabel, setSelectedViewLabel,
		selectedView, setSelectedView,
		selectedPlot, setSelectedPlot,
		displayLinkedTrials, setDisplayLinkedTrials,
		linkedTrialsList, setLinkedTrialsList,
		activeTrialIds, setActiveTrialIds,
		colorVar, setColorVar,
		labelVar, setLabelVar,
		labelSize, setLabelSize,
	} = useView();


    useEffect(() => {
        fetchObservationUnits();
        loadVariables();
        loadSpatialAdjustments();
        loadNorthArrowAngle();
    }, [activeTrialIds]);

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

    const applyDimensions = async (rowsInput: string, colsInput: string, fillerAccessionInput?: string) => {
        const rows = parseInt(rowsInput) || 0;
        const cols = parseInt(colsInput) || 0;
        const numRealPlots = plotList.length;

        if (cols * rows < numRealPlots) {
            alert('Those are not valid dimensions.\nPlease select dimensions that can accommodate your current plots.');
            return;
        }

        let accessionId: string | undefined;
        if (fillerAccessionInput) {
            const response = await fetch(`/ajax/breeders/trial/${trialId}/accession_exists?accession_name=${encodeURIComponent(fillerAccessionInput)}`)
                .then(res => res.json());
            
            if (response.success) {
                accessionId = response.success;
            } else {
                alert(response.error || 'Accession not found.');
            }

			setFillerAccessionName(fillerAccessionInput);
        }

        if (accessionId) {
            setFillerAccessionId(accessionId);
        }

        setDimensions({ rows, cols });
    };

    const submitReplaceAccession = (override: 'check' | 'override', selectedPlot: Plot | null, newAccession: string, newPlotName: string) => {
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
                germplasmName: fillerAccessionName,
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

    const submitGeoLayout = async () => {
        const fm = (window as any).geoFieldMapInstance;
        if (fm) {
            setLoading(true);
			try {
				const msg = await fm.update();
				alert(msg || 'Geo layout updated successfully!');
				fetchObservationUnits();
			} catch (e) {
				setLoading(false);
				alert(e || 'Failed to update geo layout');
			}
        }
    };

    const handleDeleteSingleTrait = async () => {
        const currentTraitId = selectedView.replace(' (corrected)', '').replace(' (adjustment)', '');
        setLoading(true);
		try {
			const response = await fetch(`/ajax/breeders/trial/${trialId}/delete_single_trait`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					traits_id: JSON.stringify([currentTraitId])
				})
			}).then(res => res.json());

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
		} catch (e) {
			setLoading(false);
		}
    };

    return (
        <DataFetchContext.Provider value={{
			fetchObservationUnits,
			applyDimensions,
			submitReplaceAccession,
			handleSuppressPhenotype,
			loadNorthArrowAngle,
			loadVariables,
			loadSpatialAdjustments,
			toggleLinkedTrials,
			submitFieldLayout,
			fetchHeatmapObservations,
			submitGeoLayout,
			handleDeleteSingleTrait
        }}>
            {children}
        </DataFetchContext.Provider>
    );
};

export const useDataFetch = () => {
    const context = useContext(DataFetchContext);
    if (!context) {
        throw new Error('useDataFetch must be used within a DataFetchProvider');
    }
    return context;
};
