import React, { createContext, useContext, useMemo } from 'react';
import { TrialFormData, ServerProps, STANDARD_DESIGN_TYPES, DesignType } from '../types';
import { useFormDraft } from '../../form_draft';

export interface TrialFormContextType {
    formData: TrialFormData;
    setFormData: React.Dispatch<React.SetStateAction<TrialFormData>>;
    updateField: <K extends keyof TrialFormData>(key: K, val: TrialFormData[K]) => void;
    clearDraft: () => void;
    draftId: string;
    maxStep: number;
    setMaxStep: React.Dispatch<React.SetStateAction<number>>;
    serverProps: ServerProps;
    availableDesignTypes: Array<{ value: DesignType; label: string }>;
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
    const availableDesignTypes = useMemo(() => {
        if (!serverProps.design_types || serverProps.design_types.length === 0) {
            return STANDARD_DESIGN_TYPES;
        }
        const seen = new Set<DesignType>();
        const ordered: Array<{ value: DesignType; label: string }> = [];

        for (const raw of serverProps.design_types) {
            const type = raw.trim();
            const standardItem = STANDARD_DESIGN_TYPES.find(d => d.label === type || d.value === type);
            if (standardItem && !seen.has(standardItem.value)) {
                seen.add(standardItem.value);
                ordered.push(standardItem);
            }
        }
        return ordered.length > 0 ? ordered : STANDARD_DESIGN_TYPES;
    }, [serverProps.design_types]);

    const defaultData = useMemo(() => {
        const initial = { ...defaultFormData };
        if (serverProps.breeding_programs?.length > 0) {
            initial.breedingProgram = serverProps.breeding_programs[0][1];
        }
        if (availableDesignTypes.length > 0 && !availableDesignTypes.some(d => d.value === initial.designType)) {
            initial.designType = availableDesignTypes[0].value;
        }
        return initial;
    }, [serverProps.breeding_programs, availableDesignTypes]);

    const { formData, setFormData, clearDraft, draftId, maxStep, setMaxStep } = useFormDraft<TrialFormData>(defaultData);

    const updateField = <K extends keyof TrialFormData>(key: K, val: TrialFormData[K]) => {
        setFormData(prev => ({ ...prev, [key]: val }));
    };

    return (
        <TrialFormContext.Provider value={{
            formData,
            setFormData,
            updateField,
            clearDraft,
            draftId,
            maxStep,
            setMaxStep,
            serverProps,
            availableDesignTypes
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
