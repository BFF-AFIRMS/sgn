import React, { createContext, useContext, useState } from 'react';
import { TrialFormData, ServerProps, DESIGN_TYPE_ALIASES, DesignType } from '../types';
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
        if (serverProps.design_types && serverProps.design_types.length > 0) {
            const configuredLower = serverProps.design_types.map(t => t.trim().toLowerCase());
            const aliasesForDefault = DESIGN_TYPE_ALIASES[initial.designType] || [];
            const hasDefault = aliasesForDefault.some(a => configuredLower.includes(a));
            if (!hasDefault) {
                for (const raw of serverProps.design_types) {
                    const cleanLower = raw.trim().toLowerCase();
                    for (const [val, aliases] of Object.entries(DESIGN_TYPE_ALIASES)) {
                        if (aliases.includes(cleanLower)) {
                            initial.designType = val as DesignType;
                            break;
                        }
                    }
                    if (initial.designType !== defaultFormData.designType) break;
                }
            }
        }
        return initial;
    });

    const { clearDraft, draftId, maxStep, setMaxStep } = useFormDraft(formData, setFormData);

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
