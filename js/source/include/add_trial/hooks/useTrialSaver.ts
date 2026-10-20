import { useState, useCallback } from 'react';
import { TrialFormData } from '../types';
import { useWorkingModal } from '../../working_modal';
import { fetchListItems } from './useBreedbaseLists';

interface SaveTrialResponse {
    trial_id?: number | string;
    error?: string;
    success?: string | number;
}

export const useTrialSaver = () => {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trialId, setTrialId] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    useWorkingModal(saving);

    const saveTrial = useCallback(async (
        form: TrialFormData,
        designJson: string
    ): Promise<void> => {
        setSaving(true);
        setError(null);
        setTrialId(null);
        setIsSuccess(false);

        try {
            let subplotsPerPlot = 1;
            if (form.designType === 'splitplot') {
                const treatmentCounts: Record<string, number> = {};
                for (const t of form.treatments) {
                    const name = t.name.trim();
                    const value = t.value.trim();

                    if (name && value) {
                        treatmentCounts[name] = (treatmentCounts[name] || 0) + 1;
                    }
                }
                for (const count of Object.values(treatmentCounts)) {
                    subplotsPerPlot *= count;
                }
            }

            const stockListId = form.stockListId || form.repStockListId;
            const controlListId = form.controlListId;

            const [stockListItems, controlListItems] = await Promise.all([
                stockListId ? fetchListItems(stockListId) : Promise.resolve(null),
                controlListId ? fetchListItems(controlListId) : Promise.resolve(null),
            ]);

            let greenhousePlantsArray: number[] | undefined;
            if (form.designType === 'greenhouse' && stockListItems) {
                const defaultPlants = parseInt(form.greenhouseDefaultPlants || '1', 10) || 1;
                greenhousePlantsArray = stockListItems.map(st => {
                    const custom = form.greenhouseCustomPlants[st];
                    return parseInt(custom, 10) || defaultPlants;
                });
            }

            const payload = new URLSearchParams({
                project_name: form.trialName.trim(),
                project_description: form.description.trim(),
                year: form.year,
                planting_date: form.plantingDate,
                trial_type: form.trialType,
                trial_location: JSON.stringify(form.locations),
                trial_stock_type: form.stockType,
                design_type: form.designType,
                breeding_program_name: form.breedingProgram,
                rep_count: form.repCount,
                block_number: form.blockNumber,
                block_size: form.blockSize,
                max_block_size: form.maxBlockSize,
                plot_prefix: form.plotPrefix,
                plot_numbering_scheme: form.plotNumberingScheme,
                start_number: form.startNumber,
                increment: form.increment,
                design_json: designJson,
                field_size: form.fieldSize,
                plot_width: form.plotWidth,
                plot_length: form.plotLength,
                fieldmap_col_number: form.colNumberPerBlock || '',
                fieldmap_row_number: form.fieldMapRowNumber || '',
                plot_layout_format: form.plotLayoutFormat || '',
                use_same_layout: form.useSameLayout ? 'same_design' : '',
                field_trial_is_planned_to_be_genotyped: form.willBeGenotyped,
                field_trial_is_planned_to_cross: form.willBeCrossed,
                has_plant_entries: form.designType === 'splitplot'
                    ? String(subplotsPerPlot * (parseInt(form.numPlantsPerTreatment || '0', 10) || 0))
                    : (form.plantsPerPlot || '0'),
                has_subplot_entries: form.designType === 'splitplot' ? String(subplotsPerPlot) : '0',
                num_seed_per_plot: form.numSeedPerPlot,
                westcott_check_1: form.westcottCheck1,
                westcott_check_2: form.westcottCheck2,
                westcott_col: form.westcottCol,
                westcott_col_between_check: form.westcottColBetweenCheck
            });

            if (greenhousePlantsArray) {
                payload.append('greenhouse_num_plants', JSON.stringify(greenhousePlantsArray));
            }
            if (stockListItems) {
                payload.append('stock_list', JSON.stringify(stockListItems));
            }
            if (controlListItems) {
                payload.append('control_list', JSON.stringify(controlListItems));
            }

            form.sourceTrialIds.forEach(id => payload.append('add_project_trial_source[]', id));

            const res = await fetch('/ajax/trial/save_experimental_design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: payload.toString()
            });
            const result: SaveTrialResponse = await res.json();
            if (result.error) {
                setError(result.error);
                return;
            }

            const trialId = String(result.trial_id);

            // Create plant entities if requested and non-greenhouse/splitplot
            const plantCount = parseInt(form.plantsPerPlot || '0', 10);
            if (plantCount > 0 && form.designType !== 'greenhouse' && form.designType !== 'splitplot') {
                try {
                    await fetch(`/ajax/breeders/trial/${trialId}/create_plant_entries/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            plants_per_plot: String(plantCount),
                            inherits_plot_treatments: form.inheritTreatments ? '1' : '0',
                            include_plant_coordinates: form.assignRowColToPlants ? '1' : '0',
                            rows_per_plot: form.rowsPerPlot,
                            cols_per_plot: form.colsPerPlot
                        }).toString()
                    });
                } catch (e) {
                    console.warn('Non-fatal plant creation issue:', e);
                }
            }

            setTrialId(trialId);
            setIsSuccess(true);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'An error occurred saving the trial.';
            setError(msg);
        } finally {
            setSaving(false);
        }
    }, []);

    return {
        saveTrial,
        saving,
        error,
        setError,
        trialId,
        setTrialId,
        isSuccess,
        success: isSuccess
    };
};
