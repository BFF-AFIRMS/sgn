import React, { createContext, useContext, useState } from 'react';
import { usePlotGrid } from './PlotGridContext';
import { FieldMapContextProps } from '../context.types';

interface DataFetchContextType {
	applyDimensions: (rowsInput: string, colsInput: string, trialId: string, fillerAccessionInput?: string) => Promise<void>;
}

const DataFetchContext = createContext<DataFetchContextType | undefined>(undefined);

export const DataFetchProvider: React.FC<FieldMapContextProps> = ({ trialId, children }) => {
	const { plotList, setFillerAccessionId, setDimensions } = usePlotGrid();

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
            const response = await fetch(`/ajax/breeders/trial/${trialId}/accession_exists?accession_name=${encodeURIComponent(fillerAccessionInput)}`)
                .then(res => res.json());
            
            if (response.success) {
                accessionId = response.success;
            } else {
                alert(response.error || 'Accession not found.');
            }
        }

        if (accessionId) {
            setFillerAccessionId(accessionId);
        }

        setDimensions({ rows, cols });
    };
    return (
        <DataFetchContext.Provider value={{
			applyDimensions
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
