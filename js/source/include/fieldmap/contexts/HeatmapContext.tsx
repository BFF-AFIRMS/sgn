import React, { createContext, useContext, useMemo, useState } from 'react';
import { FieldMapContextProps } from '../context.types';
import { HeatmapValue } from '../model.types';
import { interpolate, pearsonSkewness } from '../utils/functions';
import { useView } from './ViewContext';

export interface HeatmapContextType {
    heatmapData: Record<string, HeatmapValue>;
    setHeatmapData: React.Dispatch<React.SetStateAction<Record<string, HeatmapValue>>>;
    variables: Record<string, string>;
    setVariables: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    spatialAdjustments: Record<string, Record<string, number>>;
    setSpatialAdjustments: React.Dispatch<React.SetStateAction<Record<string, Record<string, number>>>>;
	valueColorScale: {
		min: number;
		max: number;
		scale: (val: number) => string;
		colors?: string[];
	};
}

const HeatmapContext = createContext<HeatmapContextType | undefined>(undefined);

export const HeatmapProvider: React.FC<FieldMapContextProps> = ({ children }) => {
	const {
		selectedView
	} = useView();

    const [heatmapData, setHeatmapData] = useState<Record<string, HeatmapValue>>({});
    const [variables, setVariables] = useState<Record<string, string>>({});
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

    return (
        <HeatmapContext.Provider value={{
            heatmapData,
            setHeatmapData,
            variables,
            setVariables,
            spatialAdjustments,
            setSpatialAdjustments,
			valueColorScale
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