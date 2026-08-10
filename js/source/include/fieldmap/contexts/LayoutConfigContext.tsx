import React, { createContext, useContext, useState } from 'react';
import { FieldMapContextProps } from '../context.types';

export type PlotLayout = 'serpentine' | 'zigzag';
export type ColorVar = 'parity' | 'germplasm' | 'block' | 'family_name' | 'cross_name';
export type LabelVar = 'plot_number' | 'germplasm' | 'block' | 'family_name' | 'cross_name';

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
    northArrowAngle: number;
    setNorthArrowAngle: React.Dispatch<React.SetStateAction<number>>;
}

const LayoutConfigContext = createContext<LayoutConfigContextType | undefined>(undefined);

export const LayoutConfigProvider: React.FC<FieldMapContextProps> = ({ children }) => {
    const [plotLayout, setPlotLayout] = useState<PlotLayout>('serpentine');
    const [invertRows, setInvertRows] = useState(false);
    const [invertCols, setInvertCols] = useState(false);
    const [topBorder, setTopBorder] = useState(false);
    const [bottomBorder, setBottomBorder] = useState(false);
    const [leftBorder, setLeftBorder] = useState(false);
    const [rightBorder, setRightBorder] = useState(false);
    const [northArrowAngle, setNorthArrowAngle] = useState<number>(0);

    return (
        <LayoutConfigContext.Provider value={{
            plotLayout, setPlotLayout,
            invertRows, setInvertRows,
            invertCols, setInvertCols,
            topBorder, setTopBorder,
            bottomBorder, setBottomBorder,
            leftBorder, setLeftBorder,
            rightBorder, setRightBorder,
            northArrowAngle, setNorthArrowAngle
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
