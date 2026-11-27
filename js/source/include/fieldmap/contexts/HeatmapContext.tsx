import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FieldMapContextProps } from '../types';
import { HeatmapValue } from '../types';
import { interpolate, pearsonSkewness } from '../utils/functions';
import { useView } from './ViewContext';
import { useModals } from './ModalsContext';

export interface HeatmapContextType {
    heatmapData: Record<string, HeatmapValue>;
    setHeatmapData: React.Dispatch<React.SetStateAction<Record<string, HeatmapValue>>>;
    variables: Record<string, string>;
    setVariables: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    variableOrder: string[];
    setVariableOrder: React.Dispatch<React.SetStateAction<string[]>>;
    spatialAdjustments: Record<string, Record<string, number>>;
    setSpatialAdjustments: React.Dispatch<React.SetStateAction<Record<string, Record<string, number>>>>;
	valueColorScale: {
		min: number;
		max: number;
		scale: (val: number) => string;
		colors?: string[];
	};
	fetchHeatmapObservations: (variableId: string, currentView?: string) => void;
	loadVariables: () => Promise<void>;
	loadSpatialAdjustments: () => Promise<void>;
}

const HeatmapContext = createContext<HeatmapContextType | undefined>(undefined);

export const HeatmapProvider: React.FC<FieldMapContextProps> = ({ trialId, authToken, children }) => {
	const {
		setLoading
	} = useModals();

	const {
		selectedView,
		activeTrialIds
	} = useView();

    const [heatmapData, setHeatmapData] = useState<Record<string, HeatmapValue>>({});
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [variableOrder, setVariableOrder] = useState<string[]>([]);
    const [spatialAdjustments, setSpatialAdjustments] = useState<Record<string, Record<string, number>>>({});

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

	useEffect(() => {
		loadVariables();
		loadSpatialAdjustments();
	}, [activeTrialIds]);

    const fetchHeatmapObservations = useCallback(async (variableId: string, currentView?: string) => {
        setLoading(true);
        const activeView = currentView ?? selectedView;
        const headers: Record<string, string> = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        try {
            const params = new URLSearchParams({
                observationVariableDbId: variableId,
                pageSize: '10000',
            });
            activeTrialIds.forEach(id => params.append('studyDbId', id));
            const response = await fetch(`/brapi/v2/observations?${params.toString()}`, { headers });
            const body = await response.json();
            const data = body?.result?.data || [];
            const map: Record<string, HeatmapValue> = {};
            data.forEach((obs: any) => {
                let finalVal = Number(obs.value);
                const plotName = obs.observationUnitName;

                // Apply Spatial adjustments if viewing Corrected or Adjustments
                if (activeView.includes(' (corrected)') && spatialAdjustments[plotName]?.[variableId] !== undefined) {
                    finalVal += Number(spatialAdjustments[plotName][variableId]);
                } else if (activeView.includes(' (adjustment)') && spatialAdjustments[plotName]?.[variableId] !== undefined) {
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
    }, [activeTrialIds, authToken, selectedView, spatialAdjustments, setLoading]);

    const loadVariables = useCallback(async () => {
        const headers: Record<string, string> = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        try {
            const response = await fetch(`/brapi/v2/variables?studyDbId=${trialId}&pageSize=10000`, { headers });
            const body = await response.json();
            const data = body?.result?.data || [];
            const vars: Record<string, string> = {};
            let variableIds: number[] = [];
            data.forEach((v: any) => {
                if (v.observationVariableName && v.observationVariableDbId) {
                    vars[v.observationVariableName] = v.observationVariableDbId;
                    variableIds.push(parseInt(v.observationVariableDbId));
                }
            });
            setVariables(vars);

            // Sort traits, which returns an array of sorted trait Ids
            const sortParams = JSON.stringify({method: "name", treatment_first: 0});
            const sortItems = JSON.stringify(variableIds);
            console.log("sortUrl: ", `/list/transform/temp?type=trait_ids_2_order&items=${sortItems}&params=${sortParams}`);
            const sortResponse = await fetch(`/list/transform/temp?type=trait_ids_2_order&items=${sortItems}&params=${sortParams}`);
            const sortBody = await sortResponse.json();
            let sortedTraitIds: Number[] = sortBody?.transform || [];

            // Convert sorted trait Ids to names
            const nameItems = JSON.stringify(sortedTraitIds);
            const nameResponse = await fetch(`/list/transform/temp?type=trait_ids_2_trait_names&items=${nameItems}`);
            const nameBody = await nameResponse.json();
            let sortedTraitNames: string[] = nameBody?.transform || [];

            setVariableOrder(sortedTraitNames);

        } catch (e) {
			console.error('Error loading variables:', e);
        }
    }, [authToken, trialId]);

    const loadSpatialAdjustments = useCallback(async () => {
        try {
            const response = await fetch(`/ajax/spatial_model/retrieve_spatial_adjustments/${trialId}`);
            const body = await response.json();
            if (body?.data) {
                setSpatialAdjustments(JSON.parse(body.data));
            }
        } catch (e) {
			console.error('Error loading spatial adjustments:', e);
        }
    }, [trialId]);

    return (
        <HeatmapContext.Provider value={{
            heatmapData,
            setHeatmapData,
            variables,
            setVariables,
            variableOrder,
            setVariableOrder,
            spatialAdjustments,
            setSpatialAdjustments,
			valueColorScale,
			fetchHeatmapObservations,
			loadVariables,
			loadSpatialAdjustments
        }}>
            {children}
        </HeatmapContext.Provider>
    );
};

export const useHeatmap = () => {
    const context = useContext(HeatmapContext);
    if (!context) {
        throw new Error('useHeatmap must be used within a HeatmapProvider');
    }
    return context;
};