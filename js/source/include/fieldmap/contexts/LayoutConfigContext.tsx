import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { isDefined } from '../../functions';
import { FieldMapContextProps } from '../types';

export type PlotLayout = 'serpentine' | 'zigzag';
export type ColorVar = 'parity' | 'germplasm' | 'block' | 'family_name' | 'cross_name';
export type LabelVar = 'plot_number' | 'germplasm' | 'block' | 'family_name' | 'cross_name';

export interface SecondaryAxis {
    xLabel?: string;
    yLabel?: string;
    xValues?: string[];
    yValues?: string[];
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
    setSecondaryAxis: React.Dispatch<React.SetStateAction<SecondaryAxis | undefined>>;
    loadSecondaryAxis: () => void;
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
    const [secondaryAxis, setSecondaryAxis] = useState<SecondaryAxis | undefined>();

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
                const {
                    secondary_x_axis_label: xLabel,
                    secondary_y_axis_label: yLabel,
                    secondary_x_axis_values: xValues,
                    secondary_y_axis_values: yValues
                } = body;

                if (typeof xValues !== 'string' || typeof yValues !== 'string') {
                    console.error('Secondary axis values are not strings:', { xValues, yValues });
                    return;
                }

                setSecondaryAxis({
                    xLabel,
                    yLabel,
                    xValues: xValues.split(','),
                    yValues: yValues.split(','),
                });
            }
        } catch (e) {
            console.error('Error loading secondary axis labels and values:', e);
        }
    }, [trialId]);

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
            loadSecondaryAxis
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
