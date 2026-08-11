import React, { createContext, useContext, useState } from 'react';
import { FieldMapContextProps } from '../context.types';
import { Plot, TrialDetails } from '../model.types';

export type PlotLayout = 'serpentine' | 'zigzag';
export type ColorVar = 'parity' | 'germplasm' | 'block' | 'family_name' | 'cross_name';
export type LabelVar = 'plot_number' | 'germplasm' | 'block' | 'family_name' | 'cross_name';

export interface ViewContextType {
    selectedViewLabel: string;
    setSelectedViewLabel: React.Dispatch<React.SetStateAction<string>>;
    selectedView: string;
    setSelectedView: React.Dispatch<React.SetStateAction<string>>;
    hoveredPlot: { plot: Plot; x: number; y: number } | null;
    setHoveredPlot: React.Dispatch<React.SetStateAction<{ plot: Plot; x: number; y: number } | null>>;
    selectedPlot: Plot | null;
    setSelectedPlot: React.Dispatch<React.SetStateAction<Plot | null>>;
    displayLinkedTrials: boolean;
    setDisplayLinkedTrials: React.Dispatch<React.SetStateAction<boolean>>;
	linkedTrialsList: TrialDetails[];
	setLinkedTrialsList: React.Dispatch<React.SetStateAction<TrialDetails[]>>;
	activeTrialIds: string[];
	setActiveTrialIds: React.Dispatch<React.SetStateAction<string[]>>;
    colorVar: ColorVar;
    setColorVar: React.Dispatch<React.SetStateAction<ColorVar>>;
    labelVar: LabelVar;
    setLabelVar: React.Dispatch<React.SetStateAction<LabelVar>>;
    labelSize: number;
    setLabelSize: React.Dispatch<React.SetStateAction<number>>;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const ViewProvider: React.FC<FieldMapContextProps> = ({ trialId, children }) => {
    const [selectedViewLabel, setSelectedViewLabel] = useState<string>('');
    const [selectedView, setSelectedView] = useState<string>('fieldmap');

    const [hoveredPlot, setHoveredPlot] = useState<{ plot: Plot; x: number; y: number } | null>(null);
    const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);

    const [displayLinkedTrials, setDisplayLinkedTrials] = useState(false);
    const [linkedTrialsList, setLinkedTrialsList] = useState<TrialDetails[]>([]);
    const [activeTrialIds, setActiveTrialIds] = useState<string[]>([trialId]);

    const [colorVar, setColorVar] = useState<ColorVar>('parity');
    const [labelVar, setLabelVar] = useState<LabelVar>('plot_number');
    const [labelSize, setLabelSize] = useState(10);

    return (
        <ViewContext.Provider value={{
            selectedViewLabel, setSelectedViewLabel,
            selectedView, setSelectedView,
            hoveredPlot, setHoveredPlot,
            selectedPlot, setSelectedPlot,
            displayLinkedTrials, setDisplayLinkedTrials,
            linkedTrialsList, setLinkedTrialsList,
            activeTrialIds, setActiveTrialIds,
            colorVar, setColorVar,
            labelVar, setLabelVar,
            labelSize, setLabelSize,
        }}>
            {children}
        </ViewContext.Provider>
    );
};

export const useView = () => {
    const context = useContext(ViewContext);
    if (!context) {
        throw new Error('useView must be used within a ViewProvider');
    }
    return context;
};
