import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Plot } from '../types';
import { usePlotGrid } from './PlotGridContext';

interface ControlContextType {
    showControlsSection: boolean;
    setShowControlsSection: (val: boolean) => void;
    selectedControlPlot: string;
    setSelectedControlPlot: (val: string) => void;
    controlRelationshipText: string;
    setControlRelationshipText: (val: string) => void;
    controlPlots: Plot[];
}

const ControlContext = createContext<ControlContextType | undefined>(undefined);

export const ControlProvider: React.FC<{ trialId: string; children: React.ReactNode }> = ({ trialId, children }) => {
    const { plotList } = usePlotGrid();
    const [showControlsSection, setShowControlsSection] = useState(false);
    const [selectedControlPlot, setSelectedControlPlot] = useState('');
    const [controlRelationshipText, setControlRelationshipText] = useState('');
    const [controlAccessions, setControlAccessions] = useState<string[]>([]);

    useEffect(() => {
        fetch(`/ajax/breeders/trial/${trialId}/controls`)
            .then(res => res.json())
            .then(response => {
                if (response?.accessions) {
                    setControlAccessions(response.accessions.map((a: any) => a.accession_name));
                }
            })
            .catch(() => {});
    }, [trialId]);

    const controlPlots = useMemo(() => {
        return plotList.filter(p => {
            return p.type === 'data' && (p.additionalInfo?.is_a_control || (p.germplasmName && controlAccessions.includes(p.germplasmName)));
        });
    }, [plotList, controlAccessions]);

    return (
        <ControlContext.Provider value={{
            showControlsSection, setShowControlsSection,
            selectedControlPlot, setSelectedControlPlot,
            controlRelationshipText, setControlRelationshipText,
            controlPlots
        }}>
            {children}
        </ControlContext.Provider>
    );
};

export const useControl = () => {
    const context = useContext(ControlContext);
    if (!context) {
        throw new Error('useControl must be used within a ControlProvider');
    }
    return context;
};
