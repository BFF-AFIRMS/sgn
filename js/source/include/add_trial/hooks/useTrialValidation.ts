import { useCallback } from 'react';
import { TrialFormData } from '../types';

export const validateTrialInfoSync = (form: TrialFormData): { valid: boolean; error?: string } => {
    if (!form.trialName.trim()) return { valid: false, error: 'Please supply a trial name.' };
    if (!form.breedingProgram) return { valid: false, error: 'Please select a breeding program.' };
    if (!form.locations || form.locations.length === 0) return { valid: false, error: 'Please select at least one location.' };
    if (!form.year) return { valid: false, error: 'Please select a trial year.' };
    if (!form.description.trim()) return { valid: false, error: 'Please supply a description.' };
    if (!form.stockType) return { valid: false, error: 'Please select a stock type.' };
    if (!form.designType) return { valid: false, error: 'Please select a design type.' };

    const plotWidth = parseFloat(form.plotWidth);
    if (!isNaN(plotWidth) && (plotWidth < 0 || plotWidth > 13)) {
        return { valid: false, error: 'Please check the plot width (must be between 0 and 13).' };
    }
    const plotLength = parseFloat(form.plotLength);
    if (!isNaN(plotLength) && (plotLength < 0 || plotLength > 13)) {
        return { valid: false, error: 'Please check the plot length (must be between 0 and 13).' };
    }

    const plantsPerPlot = parseInt(form.plantsPerPlot || '0', 10);
    if (plantsPerPlot < 0 || plantsPerPlot > 500) {
        return { valid: false, error: 'Plants per plot must be between 0 and 500.' };
    }

    if (form.assignRowColToPlants) {
        const r = parseInt(form.rowsPerPlot || '0', 10);
        const c = parseInt(form.colsPerPlot || '0', 10);
        if (r * c === 0) {
            return { valid: false, error: 'Specify rows and columns per plot when assigning plant coordinates.' };
        }
        if (r * c < plantsPerPlot) {
            return { valid: false, error: 'Plants per plot cannot exceed available in-plot (rows × cols) capacity.' };
        }
    }

    return { valid: true };
};

export const validateDesignInfoSync = (
    form: TrialFormData,
    getListElements: (listId: string) => string[]
): { valid: boolean; error?: string } => {
    if (form.designType === 'p-rep') {
        if (!form.unrepStockListId || !form.repStockListId) {
            return { valid: false, error: 'Please select unreplicated and replicated stock lists for p-rep design.' };
        }
        const rep = getListElements(form.repStockListId);
        const unrep = getListElements(form.unrepStockListId);
        if (rep.length === 0 || unrep.length === 0) {
            return { valid: false, error: 'Selected replicated or unreplicated list has no entries.' };
        }
        const rows = parseInt(form.rowInDesignNumber || '0', 10);
        const cols = parseInt(form.colInDesignNumber || '0', 10);
        const repTimes = parseInt(form.noOfRepTimes || '0', 10);
        if (rows * cols === 0) {
            return { valid: false, error: 'Please provide number of rows and columns in design for p-rep.' };
        }
        if (rows * cols !== (unrep.length + rep.length * repTimes)) {
            return { valid: false, error: 'Treatment repeats do not equal total plots (rows × columns) in design.' };
        }
    } else {
        if (!form.stockListId) {
            return { valid: false, error: 'Please select a list of stocks to include in the trial.' };
        }
        const elements = getListElements(form.stockListId);
        if (elements.length === 0) {
            return { valid: false, error: 'Selected stock list contains no items.' };
        }
    }

    if (form.designType === 'Augmented' || form.designType === 'MAD') {
        if (!form.controlListId) {
            return { valid: false, error: 'Please select a list of checks.' };
        }
        const checks = getListElements(form.controlListId);
        if (checks.length === 0) {
            return { valid: false, error: 'Selected checks list contains no items.' };
        }
    }

    if (form.designType === 'Augmented' && (!form.maxBlockSize || parseInt(form.maxBlockSize, 10) < 1)) {
        return { valid: false, error: 'Please specify maximum block size for Augmented design.' };
    }

    if (form.designType === 'RRC' && (!form.fieldMapRowNumber || parseInt(form.fieldMapRowNumber, 10) < 1)) {
        return { valid: false, error: 'Resolvable Row-Column (RRC) requires specifying Number of Rows in design.' };
    }

    if (form.designType === 'DRRC' && (!form.colNumber || parseInt(form.colNumber, 10) < 1)) {
        return { valid: false, error: 'Doubly-Resolvable Row-Column (DRRC) requires specifying Number of Columns.' };
    }

    if (form.designType === 'URDD') {
        if (!form.rowInDesignNumber || !form.colInDesignNumber) {
            return { valid: false, error: 'Un-Replicated Diagonal Design (URDD) requires Number of Rows and Columns in design.' };
        }
    }

    if (form.designType === 'MAD') {
        if (!form.rowNumber || !form.colNumber) {
            return { valid: false, error: 'Modified Augmented Design (MAD) requires Number of Field Rows and Columns.' };
        }
    }

    if (['CRD', 'Alpha', 'Lattice', 'DRRC'].includes(form.designType)) {
        if (!form.repCount || parseInt(form.repCount, 10) < 1) {
            return { valid: false, error: 'Please specify number of replicates.' };
        }
    }

    if (['RCBD', 'RRC', 'URDD', 'splitplot'].includes(form.designType)) {
        if (!form.blockNumber || parseInt(form.blockNumber, 10) < 1) {
            return { valid: false, error: 'Please specify number of blocks.' };
        }
    }

    if (form.designType === 'Alpha' && (!form.blockSize || parseInt(form.blockSize, 10) < 1)) {
        return { valid: false, error: 'Please specify block size for Alpha Lattice design.' };
    }

    if (form.designType === 'Westcott') {
        if (!form.westcottCheck1.trim() || !form.westcottCheck2.trim()) {
            return { valid: false, error: 'Westcott design requires Check 1 and Check 2.' };
        }
        if (!form.westcottCol || parseInt(form.westcottCol, 10) < 1) {
            return { valid: false, error: 'Please provide number of columns for Westcott design.' };
        }
    }

    if (form.designType === 'splitplot') {
        if (!form.treatments || form.treatments.length === 0 || !form.treatments[0].name.trim() || !form.treatments[0].value.trim()) {
            return { valid: false, error: 'Please provide at least one treatment for splitplot design.' };
        }
        if (!form.numPlantsPerTreatment || parseInt(form.numPlantsPerTreatment, 10) < 1) {
            return { valid: false, error: 'Please provide number of plants per treatment for splitplot design.' };
        }
    }

    if (form.seedlotListId && (!form.numSeedPerPlot || parseInt(form.numSeedPerPlot, 10) < 1)) {
        return { valid: false, error: 'Number of seeds per plot is required when a seedlot list is selected.' };
    }

    return { valid: true };
};

export const useTrialValidation = () => {
    const validateTrialInfo = useCallback(async (form: TrialFormData): Promise<{ valid: boolean; error?: string }> => {
        const syncCheck = validateTrialInfoSync(form);
        if (!syncCheck.valid) return syncCheck;

        // Check uniqueness on server
        try {
            const res = await fetch(`/ajax/trial/verify_trial_name?trial_name=${encodeURIComponent(form.trialName.trim())}`);
            const json = await res.json();
            if (json.error) {
                return { valid: false, error: json.error };
            }
        } catch {
            return { valid: false, error: 'Error connecting to server to verify trial name.' };
        }

        return { valid: true };
    }, []);

    const validateDesignInfo = useCallback(async (
        form: TrialFormData,
        getListElements: (listId: string) => string[]
    ): Promise<{ valid: boolean; error?: string }> => {
        const syncCheck = validateDesignInfoSync(form, getListElements);
        if (!syncCheck.valid) return syncCheck;

        // Validate stock list server-side
        const targetListId = form.designType === 'p-rep' ? form.repStockListId : form.stockListId;
        const elements = getListElements(targetListId);
        if (elements.length > 0) {
            let endpoint = '/ajax/trial/verify_stock_list';
            let paramName = 'stock_list';
            if (form.stockType === 'cross') {
                endpoint = '/ajax/trial/verify_cross_list';
                paramName = 'cross_list';
            } else if (form.stockType === 'family_name') {
                endpoint = '/ajax/trial/verify_family_name_list';
                paramName = 'family_name_list';
            }
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ [paramName]: JSON.stringify(elements) }).toString()
                });
                const json = await res.json();
                if (json.error) {
                    return { valid: false, error: json.error };
                }
            } catch {
                return { valid: false, error: 'Failed to verify stock list with server.' };
            }
        }

        return { valid: true };
    }, []);

    return { validateTrialInfo, validateDesignInfo };
};
