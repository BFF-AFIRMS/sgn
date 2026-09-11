import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { isDefined } from '../../functions';
import { FieldMapContextProps } from '../types';

export type PlotLayout = 'serpentine' | 'zigzag';
export type ColorVar = 'parity' | 'germplasm' | 'block' | 'family_name' | 'cross_name';
export type LabelVar = 'plot_number' | 'germplasm' | 'block' | 'family_name' | 'cross_name';

export interface SecondaryAxis {
    readonly xLabel?: string;
    readonly yLabel?: string;
    readonly xValues?: string[];
    readonly yValues?: string[];
}

export interface SecondaryAxisInput {
    readonly xLabel?: string;
    readonly yLabel?: string;
    readonly xValues?: string | string[];
    readonly yValues?: string | string[];
}

export interface LayoutConfigContextType {
    plotLayout: PlotLayout;
    setPlotLayout: React.Dispatch<React.SetStateAction<PlotLayout>>;
    invertRows: boolean;
    setInvertRows: React.Dispatch<React.SetStateAction<boolean>>;
    invertCols: boolean;
    setInvertCols: React.Dispatch<React.SetStateAction<boolean>>;
    topBorder: boolean;
    setTopBorder: React.Dispatch<React.SetStateAction<boolean>>;
    bottomBorder: boolean;
    setBottomBorder: React.Dispatch<React.SetStateAction<boolean>>;
    leftBorder: boolean;
    setLeftBorder: React.Dispatch<React.SetStateAction<boolean>>;
    rightBorder: boolean;
    setRightBorder: React.Dispatch<React.SetStateAction<boolean>>;
    colorVar: ColorVar;
    setColorVar: React.Dispatch<React.SetStateAction<ColorVar>>;
    labelVar: LabelVar;
    setLabelVar: React.Dispatch<React.SetStateAction<LabelVar>>;
    labelSize: number;
    setLabelSize: React.Dispatch<React.SetStateAction<number>>;
    northArrowAngle: number;
    setNorthArrowAngle: React.Dispatch<React.SetStateAction<number>>;
    loadNorthArrowAngle: () => void;
    secondaryAxis: SecondaryAxis | undefined;
    setSecondaryAxis: (input?: SecondaryAxisInput) => void;
    loadSecondaryAxis: () => void;
    hasSecondaryAxis: boolean;
}

const LayoutConfigContext = createContext<LayoutConfigContextType | undefined>(undefined);

export const LayoutConfigProvider: React.FC<FieldMapContextProps> = ({ trialId, children }) => {
    const [plotLayout, setPlotLayout] = useState<PlotLayout>('serpentine');

    const [invertRows, setInvertRows] = useState(false);
    const [invertCols, setInvertCols] = useState(false);

    const [topBorder, setTopBorder] = useState(false);
    const [bottomBorder, setBottomBorder] = useState(false);
    const [leftBorder, setLeftBorder] = useState(false);
    const [rightBorder, setRightBorder] = useState(false);

    const [colorVar, setColorVar] = useState<ColorVar>('parity');
    const [labelVar, setLabelVar] = useState<LabelVar>('plot_number');
    const [labelSize, setLabelSize] = useState(10);

    const [northArrowAngle, setNorthArrowAngle] = useState<number>(0);
    const [secondaryAxis, setSecondaryAxisState] = useState<SecondaryAxis | undefined>();

    const setSecondaryAxis = useCallback((input?: SecondaryAxisInput) => {
        if (!input) {
            setSecondaryAxisState(undefined);
            return;
        }

        const parseValues = (v?: string | string[]): string[] => {
            if (!v) {
                return [];
            }
            if (Array.isArray(v)) {
                return v.map(s => s.trim());
            }
            if (!v.trim()) {
                return [];
            }
            return v.split(',').map(s => s.trim());
        };

        const xLabel = input.xLabel?.trim();
        const yLabel = input.yLabel?.trim();
        const xValues = parseValues(input.xValues);
        const yValues = parseValues(input.yValues);

        const hasValues = (arr: string[]) => arr.some(v => v.length > 0);

        if (xLabel || yLabel || hasValues(xValues) || hasValues(yValues)) {
            setSecondaryAxisState({
                xLabel,
                yLabel,
                xValues,
                yValues,
            });
        } else {
            setSecondaryAxisState(undefined);
        }
    }, []);

    const loadNorthArrowAngle = useCallback(async () => {
        try {
            const response = await fetch(`/ajax/breeders/trial/${trialId}/north_arrow_angle`);
            const body = await response.json();
            if (body?.north_arrow_angle !== undefined && body.north_arrow_angle !== null) {
                setNorthArrowAngle(Number(body.north_arrow_angle));
            }
        } catch (e) {
			console.error('Error loading north arrow angle:', e);
        }
    }, [trialId]);

    const loadSecondaryAxis = useCallback(async () => {
        try {
            const response = await fetch(`/ajax/breeders/trial/${trialId}/secondary_axis`);
            const body = await response.json();
            if (body) {
                setSecondaryAxis({
                    xLabel: body.secondary_x_axis_label,
                    yLabel: body.secondary_y_axis_label,
                    xValues: body.secondary_x_axis_values,
                    yValues: body.secondary_y_axis_values,
                });
            }
        } catch (e) {
            console.error('Error loading secondary axis labels and values:', e);
        }
    }, [trialId, setSecondaryAxis]);

    const hasSecondaryAxis = useMemo(() => Boolean(
        secondaryAxis && (
            (secondaryAxis.xLabel && secondaryAxis.xLabel.trim().length > 0) ||
            (secondaryAxis.yLabel && secondaryAxis.yLabel.trim().length > 0) ||
            (secondaryAxis.xValues && secondaryAxis.xValues.some(v => v.length > 0)) ||
            (secondaryAxis.yValues && secondaryAxis.yValues.some(v => v.length > 0))
        )
    ), [secondaryAxis]);

    useEffect(() => {
        loadNorthArrowAngle();
        loadSecondaryAxis();
    }, [loadNorthArrowAngle, loadSecondaryAxis]);

    return (
        <LayoutConfigContext.Provider value={{
            plotLayout, setPlotLayout,
            invertRows, setInvertRows,
            invertCols, setInvertCols,
            topBorder, setTopBorder,
            bottomBorder, setBottomBorder,
            leftBorder, setLeftBorder,
            rightBorder, setRightBorder,
            colorVar, setColorVar,
            labelVar, setLabelVar,
            labelSize, setLabelSize,
            northArrowAngle, setNorthArrowAngle,
            loadNorthArrowAngle,
            secondaryAxis, setSecondaryAxis,
            loadSecondaryAxis,
            hasSecondaryAxis,
        }}>
            {children}
        </LayoutConfigContext.Provider>
    );
};

export const useLayoutConfig = () => {
    const context = useContext(LayoutConfigContext);
    if (!context) {
        throw new Error('useLayoutConfig must be used within a LayoutConfigProvider');
    }
    return context;
};
