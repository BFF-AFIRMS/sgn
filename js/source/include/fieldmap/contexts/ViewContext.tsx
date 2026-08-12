import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { FieldMapContextProps } from '../types';
import { Plot, TrialDetails } from '../types';
import { trial_colors, trial_colors_text } from '../utils/functions';

export type PlotLayout = 'serpentine' | 'zigzag';
export type ColorVar = 'parity' | 'germplasm' | 'block' | 'family_name' | 'cross_name';
export type LabelVar = 'plot_number' | 'germplasm' | 'block' | 'family_name' | 'cross_name';

export interface ViewContextType {
    trialId: string;
    authToken?: string;
    stockLabel: string;
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
    toggleLinkedTrials: (checked: boolean) => Promise<void>;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const ViewProvider: React.FC<FieldMapContextProps> = ({ trialId, authToken, trialStockType, children }) => {
    const [selectedViewLabel, setSelectedViewLabel] = useState<string>('');
    const [selectedView, setSelectedView] = useState<string>('fieldmap');

    const [hoveredPlot, setHoveredPlot] = useState<{ plot: Plot; x: number; y: number } | null>(null);
    const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);

    const [displayLinkedTrials, setDisplayLinkedTrials] = useState(false);
    const [linkedTrialsList, setLinkedTrialsList] = useState<TrialDetails[]>([]);
    const [activeTrialIds, setActiveTrialIds] = useState<string[]>([trialId]);

    const stockLabel = useMemo(() => {
        if (trialStockType === 'cross') return 'Cross';
        if (trialStockType === 'family_name') return 'Family';
        return 'Accession';
    }, [trialStockType]);

    const toggleLinkedTrials = useCallback(async (checked: boolean) => {
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
    }, [trialId, setDisplayLinkedTrials, setLinkedTrialsList, setActiveTrialIds]);

    return (
        <ViewContext.Provider value={{
            trialId,
            authToken,
            stockLabel,
            selectedViewLabel, setSelectedViewLabel,
            selectedView, setSelectedView,
            hoveredPlot, setHoveredPlot,
            selectedPlot, setSelectedPlot,
            displayLinkedTrials, setDisplayLinkedTrials,
            linkedTrialsList, setLinkedTrialsList,
            activeTrialIds, setActiveTrialIds,
            toggleLinkedTrials,
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
