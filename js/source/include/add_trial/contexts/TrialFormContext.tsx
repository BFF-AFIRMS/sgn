import React, { createContext, useContext, useMemo, useCallback } from 'react';

import { useFormDraft } from '~/form_draft';

import { TrialFormData, ServerProps, STANDARD_DESIGN_TYPES, DesignType, DesignTypeOption } from '../types';

/**
 * The Add Trial wizard's form state and the server data it is derived from.
 *
 * This is the persisted draft, so it also carries the generated design result
 * itself (`formData.designResult`); the transient state around generating and
 * saving that result lives in `DesignResultContext`. The form data and step
 * navigation are persisted to localStorage through `useFormDraft`, so an
 * in-progress trial survives a page reload.
 */
export interface TrialFormContextType {
    /** The wizard's form data, including the generated `designResult`. */
    formData: TrialFormData;
    /** Replaces the form data outright (e.g. for partial-object updates). */
    setFormData: React.Dispatch<React.SetStateAction<TrialFormData>>;
    /**
     * Sets a single field. `plantsPerPlot` and `greenhouseDefaultPlants` are
     * kept in sync, so updating either one updates both.
     */
    updateField: <K extends keyof TrialFormData>(key: K, val: TrialFormData[K]) => void;
    /** Identifier of the current draft, used to key the persisted state. */
    draftId: string;
    /** Highest workflow step reached, used to gate forward navigation. */
    maxStep: number;
    /** Records the highest workflow step reached. */
    setMaxStep: React.Dispatch<React.SetStateAction<number>>;
    /** Data provided by the server when the page was rendered. */
    serverProps: ServerProps;
    /** The design types enabled for this deployment, derived from `serverProps`. */
    availableDesignTypes: DesignTypeOption[];
}

/** Base form values, before server-derived defaults and any restored draft. */
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
    plantsPerPlot: '',
    inheritTreatments: true,
    assignRowColToPlants: false,
    rowsPerPlot: '',
    colsPerPlot: '',
    stockType: 'accession',
    designType: 'CRD',
    useSameLayout: false,
    stockListId: '',
    controlListId: '',
    crbdControlListId: '',
    unrepStockListId: '',
    repStockListId: '',
    seedlotListId: '',
    numSeedPerPlot: '',
    seedlotHash: {},
    repCount: '',
    blockNumber: '',
    blockSize: '',
    maxBlockSize: '',
    rowNumber: '',
    colNumber: '',
    rowNumberPerBlock: '',
    colNumberPerBlock: '',
    rowInDesignNumber: '',
    colInDesignNumber: '',
    noOfRepTimes: '',
    noOfBlockSequence: '',
    noOfSubBlockSequence: '',
    greenhouseDefaultPlants: '1',
    greenhouseCustomPlants: {},
    treatments: [{ name: '', value: '' }, { name: '', value: '' }],
    numPlantsPerTreatment: '',
    westcottCheck1: '',
    westcottCheck2: '',
    westcottCol: '',
    westcottColBetweenCheck: '',
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
    increment: '',
    designResult: null
};

const TrialFormContext = createContext<TrialFormContextType | undefined>(undefined);

/**
 * Provides the wizard's form state to its descendants.
 *
 * Derives the available design types and the initial form values from
 * `serverProps`, then wires the form data and step navigation up to
 * `useFormDraft` so they persist across reloads.
 */
export const TrialFormProvider: React.FC<{ serverProps: ServerProps; children: React.ReactNode }> = ({
    serverProps,
    children
}) => {
    const availableDesignTypes = useMemo(() => {
        if (!serverProps.design_types || serverProps.design_types.length === 0) {
            return STANDARD_DESIGN_TYPES;
        }
        const seen = new Set<DesignType>();
        const ordered: DesignTypeOption[] = [];

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
        const preferredProgram = serverProps.breeding_programs?.find(p => Boolean(p[3]));
        if (preferredProgram) {
            initial.breedingProgram = preferredProgram[1];
        } else if (serverProps.breeding_programs?.length > 0) {
            initial.breedingProgram = serverProps.breeding_programs[0][1];
        }
        if (availableDesignTypes.length > 0 && !availableDesignTypes.some(d => d.value === initial.designType)) {
            initial.designType = availableDesignTypes[0].value;
        }
        return initial;
    }, [serverProps.breeding_programs, availableDesignTypes]);

    const { formData, setFormData, draftId, maxStep, setMaxStep } = useFormDraft<TrialFormData>(defaultData);

    const updateField = useCallback(<K extends keyof TrialFormData>(key: K, val: TrialFormData[K]) => {
        setFormData(prev => {
            if (key === 'plantsPerPlot') {
                const strVal = val as string;
                return {
                    ...prev,
                    plantsPerPlot: strVal,
                    greenhouseDefaultPlants: strVal,
                };
            }
            if (key === 'greenhouseDefaultPlants') {
                const strVal = val as string;
                return {
                    ...prev,
                    greenhouseDefaultPlants: strVal,
                    plantsPerPlot: strVal,
                };
            }
            return { ...prev, [key]: val };
        });
    }, [setFormData]);

    return (
        <TrialFormContext.Provider value={{
            formData,
            setFormData,
            updateField,
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

/**
 * Accesses the Add Trial wizard's form state. Throws if used outside a
 * `TrialFormProvider`.
 */
export const useTrialForm = () => {
    const ctx = useContext(TrialFormContext);
    if (!ctx) throw new Error('useTrialForm must be used within TrialFormProvider');
    return ctx;
};
