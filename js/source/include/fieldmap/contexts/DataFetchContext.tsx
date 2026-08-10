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

export enum ReplaceAccessionResult {
	Success = 'success',
	Warning = 'warning',
	Error = 'error'
}

export interface DataFetchContextType {
	fetchObservationUnits: () => void;
	applyDimensions: (rowsInput: string, colsInput: string, fillerAccessionInput?: string) => Promise<void>;
	submitReplaceAccession: (override: 'check' | 'override', selectedPlot: Plot | null, newAccession: string, newPlotName: string) => Promise<ReplaceAccessionResult>;
	submitSuppressPhenotype: () => Promise<boolean>;
	loadNorthArrowAngle: () => void;
	loadVariables: () => void;
	loadSpatialAdjustments: () => void;
    toggleLinkedTrials: (checked: boolean) => Promise<void>;
	submitFieldLayout: () => void;
	fetchHeatmapObservations: (variableId: string) => void;
	submitGeoLayout: () => Promise<void>;
	deleteSingleTrait: () => Promise<boolean>;
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
		setVariables,
		spatialAdjustments, setSpatialAdjustments
	} = useHeatmap();

	const {
		selectedView, setSelectedView,
		selectedPlot,
		setDisplayLinkedTrials,
		setLinkedTrialsList,
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

    const fetchObservationUnits = async () => {
        setLoading(true);
        const headers: Record<string, string> = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const url = `/brapi/v2/observationunits?studyDbIds=${activeTrialIds.join(',')}&observationUnitLevelName=plot&pageSize=10000`;
        try {
            const response = await fetch(url, { headers });
            const body = await response.json();
            const units = body?.result?.data || [];
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
        } catch (e) {
            console.error('Error loading plot units:', e);
            alert('Error loading plot units.');
        } finally {
            setLoading(false);
        }
    };

    const fetchHeatmapObservations = async (variableId: string) => {
        setLoading(true);
        const headers: Record<string, string> = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        try {
            const response = await fetch(`/brapi/v2/observations?observationVariableDbId=${variableId}&studyDbId=${activeTrialIds.join(',')}&pageSize=10000`, { headers });
            const body = await response.json();
            const data = body?.result?.data || [];
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
        } catch (e) {
            console.error('Error loading heatmap observations:', e);
        } finally {
            setLoading(false);
        }
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
			const response = await fetch(`/ajax/breeders/trial/${trialId}/accession_exists?accession_name=${encodeURIComponent(fillerAccessionInput)}`);
			const body = await response.json();
            
            if (body.success) {
                accessionId = body.success;
            } else {
                alert(body.error || 'Accession not found.');
            }

			setFillerAccessionName(fillerAccessionInput);
        }

        if (accessionId) {
            setFillerAccessionId(accessionId);
        }

        setDimensions({ rows, cols });
    };

    const submitReplaceAccession = async (override: 'check' | 'override', selectedPlot: Plot | null, newAccession: string, newPlotName: string) => {
        if (!selectedPlot) return ReplaceAccessionResult.Error;
        setLoading(true);
        try {
            const response = await fetch(`/ajax/breeders/trial/${trialId}/replace_plot_accessions`, {
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
            });
            const body = await response.json();
            if (body.warning) {
				return ReplaceAccessionResult.Warning;
            } else if (body.error) {
                alert(body.error);
            } else {
                alert('Plot Accession Replaced successfully!');
                fetchObservationUnits();
				return ReplaceAccessionResult.Success;
            }
        } catch (e) {
            console.error('Error replacing accession:', e);
        } finally {
            setLoading(false);
        }

		return ReplaceAccessionResult.Error;
    };

    const submitSuppressPhenotype = async () => {
		if (!selectedPlot) {
			return false;
		}
        const currentTraitId = selectedView.replace(' (corrected)', '').replace(' (adjustment)', '');
        const valObj = heatmapData[selectedPlot.observationUnitDbId || ''];
		if (!valObj) {
			return false;
		}

        setLoading(true);
        try {
            const response = await fetch(`/ajax/breeders/trial/${trialId}/suppress_phenotype`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    plot_name: selectedPlot.observationUnitName,
                    phenotype_value: String(valObj.val),
                    trait_id: currentTraitId,
                    phenotype_id: valObj.id
                })
            });
            const body = await response.json();
            if (body.error) {
                alert(body.error);
            } else {
                alert('Phenotype was suppressed successfully!');
                fetchHeatmapObservations(currentTraitId);
				return true;
            }
        } catch (e) {
			console.error('Error suppressing phenotype:', e);
        } finally {
            setLoading(false);
        }

		return false;
    };

    const loadNorthArrowAngle = async () => {
        try {
            const response = await fetch(`/ajax/breeders/trial/${trialId}/north_arrow_angle`);
            const body = await response.json();
            if (body?.north_arrow_angle !== undefined && body.north_arrow_angle !== null) {
                setNorthArrowAngle(Number(body.north_arrow_angle));
            }
        } catch (e) {
			console.error('Error loading north arrow angle:', e);
        }
    };

    const loadVariables = async () => {
        const headers: Record<string, string> = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        try {
            const response = await fetch(`/brapi/v2/variables?studyDbId=${trialId}&pageSize=10000`, { headers });
            const body = await response.json();
            const data = body?.result?.data || [];
            const vars: Record<string, string> = {};
            data.forEach((v: any) => {
                if (v.observationVariableName && v.observationVariableDbId) {
                    vars[v.observationVariableName] = v.observationVariableDbId;
                }
            });
            setVariables(vars);
        } catch (e) {
			console.error('Error loading variables:', e);
        }
    };

    const loadSpatialAdjustments = async () => {
        try {
            const response = await fetch(`/ajax/spatial_model/retrieve_spatial_adjustments/${trialId}`);
            const body = await response.json();
            if (body?.data) {
                setSpatialAdjustments(JSON.parse(body.data));
            }
        } catch (e) {
			console.error('Error loading spatial adjustments:', e);
        }
    };

    const toggleLinkedTrials = async (checked: boolean) => {
        setDisplayLinkedTrials(checked);
        if (checked) {
            try {
                const response = await fetch(`/ajax/breeders/trial/${trialId}/linked_field_trials`);
                const body = await response.json();
                if (body?.trials) {
                    const list = body.trials.map((t: any, i: number) => {
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
                    alert(body?.error || 'Could not load linked trials.');
                    setDisplayLinkedTrials(false);
                }
            } catch {
                setDisplayLinkedTrials(false);
            }
        } else {
            setLinkedTrialsList([]);
            setActiveTrialIds([trialId]);
        }
    };

    const submitFieldLayout = async () => {
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

        const putRequest = fetch('/brapi/v2/observationunits', {
            method: 'PUT',
            headers,
            body: JSON.stringify(brapiPutObject)
        });

        const postRequest = brapiPostObject.length > 0
            ? fetch('/brapi/v2/observationunits', {
                method: 'POST',
                headers,
                body: JSON.stringify(brapiPostObject)
            })
            : Promise.resolve();

        const northArrowRequest = fetch(`/ajax/breeders/trial/${trialId}/north_arrow_angle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                north_arrow_angle: String(northArrowAngle)
            })
        });

		try {
			await Promise.all([putRequest, postRequest, northArrowRequest]);
			await fetch(`/ajax/breeders/trial/${trialId}/refresh_cache`, { method: 'POST' });

			alert('Field Plot layout submitted successfully!');
			fetchObservationUnits();
			loadNorthArrowAngle();
		} catch (e) {
			console.error('Error submitting layout metadata:', e);
			alert('Error submitting layout metadata.');
		} finally {
			setLoading(false);
		}
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
				alert(e || 'Failed to update geo layout');
			} finally {
				setLoading(false);
			}
        }
    };

    const deleteSingleTrait = async () => {
        const currentTraitId = selectedView.replace(' (corrected)', '').replace(' (adjustment)', '');
        setLoading(true);
		try {
			const response = await fetch(`/ajax/breeders/trial/${trialId}/delete_single_trait`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					traits_id: JSON.stringify([currentTraitId])
				})
			});
			const body = await response.json();

			if (body.error) {
				alert(body.error);
			} else {
				alert('Trait deleted successfully!');
				setSelectedView('fieldmap');
				setHeatmapData({});
				loadVariables();
				return true;
			}
		} catch (e) {
			console.error('Error deleting trait:', e);
		} finally {
			setLoading(false);
		}
		return false;
    };

    return (
        <DataFetchContext.Provider value={{
			fetchObservationUnits,
			applyDimensions,
			submitReplaceAccession,
			submitSuppressPhenotype,
			loadNorthArrowAngle,
			loadVariables,
			loadSpatialAdjustments,
			toggleLinkedTrials,
			submitFieldLayout,
			fetchHeatmapObservations,
			submitGeoLayout,
			deleteSingleTrait
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
