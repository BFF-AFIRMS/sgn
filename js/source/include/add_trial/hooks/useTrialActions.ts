import { useCallback } from 'react';
import { TrialFormData, DesignResultResponse } from '../types';
import { useDesignResult } from '../contexts/DesignResultContext';
import { useTrialForm } from '../contexts/TrialFormContext';
import { fetchListItems } from './useBreedbaseLists';
import { showWorkingModal, hideWorkingModal } from '../../working_modal';
import * as trialService from '../services/trialService';

export interface ActionResult<T = void> {
    ok: boolean;
    data?: T;
    error?: string;
}

export const useTrialActions = () => {
    const {
        setResult,
        setSavedTrialId,
        isGenerating,
        setIsGenerating,
        isSaving,
        setIsSaving
    } = useDesignResult();
    const { clearDraft } = useTrialForm();

    const generate = useCallback(async (form: TrialFormData): Promise<ActionResult<DesignResultResponse>> => {
        setIsGenerating(true);
        showWorkingModal();
        try {
            await trialService.verifyTrialName(form.trialName);

            const [
                stockListItems,
                controlListItems,
                crbdControlListItems,
                unrepStockListItems,
                repStockListItems,
                seedlotListItems
            ] = await Promise.all([
                form.stockListId ? fetchListItems(form.stockListId) : Promise.resolve(null),
                form.controlListId ? fetchListItems(form.controlListId) : Promise.resolve(null),
                form.crbdControlListId ? fetchListItems(form.crbdControlListId) : Promise.resolve(null),
                form.unrepStockListId ? fetchListItems(form.unrepStockListId) : Promise.resolve(null),
                form.repStockListId ? fetchListItems(form.repStockListId) : Promise.resolve(null),
                (form.stockType === 'accession' && form.seedlotListId) ? fetchListItems(form.seedlotListId) : Promise.resolve(null),
            ]);

            if (form.designType === 'p-rep') {
                if (!repStockListItems?.length || !unrepStockListItems?.length) {
                    throw new Error('Selected replicated or unreplicated list has no entries.');
                }
                const rows = parseInt(form.rowInDesignNumber || '0', 10);
                const cols = parseInt(form.colInDesignNumber || '0', 10);
                const repTimes = parseInt(form.noOfRepTimes || '0', 10);
                if (rows * cols === 0) {
                    throw new Error('Please provide number of rows and columns in design for p-rep.');
                }
                if (rows * cols !== (unrepStockListItems.length + repStockListItems.length * repTimes)) {
                    throw new Error('Treatment repeats do not equal total plots (rows × columns) in design.');
                }
                await Promise.all([
                    trialService.verifyStockItems(repStockListItems, form.stockType, 'Replicated list'),
                    trialService.verifyStockItems(unrepStockListItems, form.stockType, 'Unreplicated list')
                ]);
            } else {
                if (!stockListItems?.length) {
                    throw new Error('Selected stock list contains no items.');
                }
                await trialService.verifyStockItems(stockListItems, form.stockType);
            }

            if (form.designType === 'Augmented' || form.designType === 'MAD') {
                if (!controlListItems?.length) {
                    throw new Error('Selected checks list contains no items.');
                }
                await trialService.verifyStockItems(controlListItems, 'accession', 'Checks list');
            }

            if (form.crbdControlListId && crbdControlListItems?.length) {
                await trialService.verifyStockItems(crbdControlListItems, 'accession', 'Checks list');
            }

            let seedlotHash: Record<string, string> = { ...(form.seedlotHash || {}) };
            if (form.stockType === 'accession' && form.seedlotListId) {
                if (!seedlotListItems?.length) {
                    throw new Error('Selected seedlot list contains no items.');
                }
                const listsToVerify = [
                    { items: stockListItems, required: true, label: 'Stock list' },
                    { items: repStockListItems, required: true, label: 'Replicated stock list' },
                    { items: unrepStockListItems, required: true, label: 'Unreplicated stock list' },
                    { items: controlListItems, required: false, label: 'Checks list' },
                    { items: crbdControlListItems, required: false, label: 'Checks list' },
                ].filter((e): e is { items: string[]; required: boolean; label: string } => Boolean(e.items && e.items.length > 0));

                for (const entry of listsToVerify) {
                    try {
                        const verified = await trialService.verifySeedlotList(entry.items, seedlotListItems);
                        seedlotHash = { ...seedlotHash, ...verified };
                    } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : String(err);
                        if (entry.required) {
                            throw new Error(`${entry.label}: ${msg}`);
                        } else {
                            alert(`${entry.label}: ${msg}`);
                        }
                    }
                }
            }

            const payload = trialService.buildGenerateDesignPayload(form, {
                stockListItems,
                controlListItems,
                crbdControlListItems,
                unrepStockListItems,
                repStockListItems,
                seedlotHash
            });

            const designResult = await trialService.requestExperimentalDesign(payload);
            setResult(designResult);
            return { ok: true, data: designResult };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to generate experimental design';
            return { ok: false, error: msg };
        } finally {
            hideWorkingModal();
            setIsGenerating(false);
        }
    }, [setIsGenerating, setResult]);

    const save = useCallback(async (form: TrialFormData, designJson: string): Promise<ActionResult<string>> => {
        setIsSaving(true);
        showWorkingModal();
        try {
            const stockListId = form.stockListId || form.repStockListId;
            const controlListId = form.controlListId;

            const [stockListItems, controlListItems] = await Promise.all([
                stockListId ? fetchListItems(stockListId) : Promise.resolve(null),
                controlListId ? fetchListItems(controlListId) : Promise.resolve(null),
            ]);

            const payload = trialService.buildSaveDesignPayload(form, designJson, {
                stockListItems,
                controlListItems
            });

            const trialId = await trialService.requestSaveExperimentalDesign(payload);

            const plantCount = parseInt(form.plantsPerPlot || '0', 10);
            if (plantCount > 0 && form.designType !== 'greenhouse' && form.designType !== 'splitplot') {
                await trialService.createPlantEntries(trialId, form, plantCount);
            }

            clearDraft();
            setSavedTrialId(trialId);
            return { ok: true, data: trialId };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'An error occurred saving the trial.';
            return { ok: false, error: msg };
        } finally {
            hideWorkingModal();
            setIsSaving(false);
        }
    }, [setIsSaving, clearDraft, setSavedTrialId]);

    return {
        generate,
        save,
        isGenerating,
        isSaving
    };
};
