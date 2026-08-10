import React, { createContext, useContext, useState } from 'react';
import { FieldMapContextProps } from '../context.types';

export type PlotLayout = 'serpentine' | 'zigzag';
export type ColorVar = 'parity' | 'germplasm' | 'block' | 'family_name' | 'cross_name';
export type LabelVar = 'plot_number' | 'germplasm' | 'block' | 'family_name' | 'cross_name';

interface LayoutConfigContextType {
    plotLayout: PlotLayout;
    setPlotLayout: (val: PlotLayout) => void;
    invertRows: boolean;
    setInvertRows: (val: boolean) => void;
    invertCols: boolean;
    setInvertCols: (val: boolean) => void;
    colorVar: ColorVar;
    setColorVar: (val: ColorVar) => void;
    labelVar: LabelVar;
    setLabelVar: (val: LabelVar) => void;
    labelSize: number;
    setLabelSize: (val: number) => void;
    topBorder: boolean;
    setTopBorder: (val: boolean) => void;
    bottomBorder: boolean;
    setBottomBorder: (val: boolean) => void;
    leftBorder: boolean;
    setLeftBorder: (val: boolean) => void;
    rightBorder: boolean;
    setRightBorder: (val: boolean) => void;
}

const LayoutConfigContext = createContext<LayoutConfigContextType | undefined>(undefined);

export const LayoutConfigProvider: React.FC<FieldMapContextProps> = ({ children }) => {
    const [plotLayout, setPlotLayout] = useState<PlotLayout>('serpentine');
    const [invertRows, setInvertRows] = useState(false);
    const [invertCols, setInvertCols] = useState(false);
    const [colorVar, setColorVar] = useState<ColorVar>('parity');
    const [labelVar, setLabelVar] = useState<LabelVar>('plot_number');
    const [labelSize, setLabelSize] = useState(10);
    const [topBorder, setTopBorder] = useState(false);
    const [bottomBorder, setBottomBorder] = useState(false);
    const [leftBorder, setLeftBorder] = useState(false);
    const [rightBorder, setRightBorder] = useState(false);

    return (
        <LayoutConfigContext.Provider value={{
            plotLayout, setPlotLayout,
            invertRows, setInvertRows,
            invertCols, setInvertCols,
            colorVar, setColorVar,
            labelVar, setLabelVar,
            labelSize, setLabelSize,
            topBorder, setTopBorder,
            bottomBorder, setBottomBorder,
            leftBorder, setLeftBorder,
            rightBorder, setRightBorder
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
