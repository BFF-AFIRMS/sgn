import React, { createContext, useContext, useState } from 'react';
import { TrialFormData, ServerProps } from '../types';
import { useFormDraft } from '../hooks/useFormDraft';

export interface TrialFormContextType {
    formData: TrialFormData;
    setFormData: React.Dispatch<React.SetStateAction<TrialFormData>>;
    updateField: <K extends keyof TrialFormData>(key: K, val: TrialFormData[K]) => void;
    clearDraft: () => void;
    serverProps: ServerProps;
}

const defaultFormData: TrialFormData = {
    trialName: '',
    breedingProgram: '',
    locations: [],
    year: new Date().getFullYear().toString(),
    plantingDate: '',
    description: '',
    trialType: '',
    plotWidth: '',
    plotLength: '',
    fieldSize: '',
    plantsPerPlot: '0',
    inheritTreatments: true,
    assignRowColToPlants: false,
    rowsPerPlot: '',
    colsPerPlot: '',
    stockType: 'accession',
    designType: 'RCBD',
    useSameLayout: false,
    stockListId: '',
    controlListId: '',
    crbdControlListId: '',
    unrepStockListId: '',
    repStockListId: '',
    seedlotListId: '',
    numSeedPerPlot: '',
    seedlotHash: {},
    repCount: '2',
    blockNumber: '2',
    blockSize: '',
    maxBlockSize: '',
    rowNumber: '',
    colNumber: '',
    rowNumberPerBlock: '',
    colNumberPerBlock: '',
    rowInDesignNumber: '',
    colInDesignNumber: '',
    noOfRepTimes: '4',
    noOfBlockSequence: '',
    noOfSubBlockSequence: '',
    greenhouseDefaultPlants: '1',
    greenhouseCustomPlants: {},
    treatments: [{ name: '', value: '' }, { name: '', value: '' }],
    numPlantsPerTreatment: '',
    westcottCheck1: '',
    westcottCheck2: '',
    westcottCol: '',
    westcottColBetweenCheck: '10',
    trialSourced: 'no',
    sourceTrialIds: [],
    willBeGenotyped: 'no',
    willBeCrossed: 'no',
    showFieldMapOptions: true,
    fieldMapRowNumber: '',
    plotLayoutFormat: 'serpentine',
    showPlotNamingOptions: true,
    plotNumberingScheme: 'block_based',
    plotPrefix: '',
    startNumber: '1',
    increment: '1'
};

const TrialFormContext = createContext<TrialFormContextType | undefined>(undefined);

export const TrialFormProvider: React.FC<{ serverProps: ServerProps; children: React.ReactNode }> = ({
    serverProps,
    children
}) => {
    const [formData, setFormData] = useState<TrialFormData>(() => {
        const initial = { ...defaultFormData };
        if (serverProps.breeding_programs?.length > 0) {
            initial.breedingProgram = serverProps.breeding_programs[0][1];
        }
        return initial;
    });

    const { clearDraft } = useFormDraft(formData, setFormData);

    const updateField = <K extends keyof TrialFormData>(key: K, val: TrialFormData[K]) => {
        setFormData(prev => ({ ...prev, [key]: val }));
    };

    return (
        <TrialFormContext.Provider value={{
            formData,
            setFormData,
            updateField,
            clearDraft,
            serverProps
        }}>
            {children}
        </TrialFormContext.Provider>
    );
};

export const useTrialForm = () => {
    const ctx = useContext(TrialFormContext);
    if (!ctx) throw new Error('useTrialForm must be used within TrialFormProvider');
    return ctx;
};
