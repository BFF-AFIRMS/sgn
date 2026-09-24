import { useState, useCallback } from 'react';
import { TrialFormData, DesignResultResponse } from '../types';

export const useDesignGenerator = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateDesign = useCallback(async (
        form: TrialFormData,
        getListElements: (listId: string) => string[]
    ): Promise<{ data: DesignResultResponse | null; error: string | null }> => {
        setLoading(true);
        setError(null);
        try {
            const stockList = form.stockListId ? JSON.stringify(getListElements(form.stockListId)) : undefined;
            const controlList = form.controlListId ? JSON.stringify(getListElements(form.controlListId)) : undefined;
            const crbdControlList = form.crbdControlListId ? JSON.stringify(getListElements(form.crbdControlListId)) : undefined;
            const unrepStockList = form.unrepStockListId ? JSON.stringify(getListElements(form.unrepStockListId)) : undefined;
            const repStockList = form.repStockListId ? JSON.stringify(getListElements(form.repStockListId)) : undefined;

            // Format splitplot treatments
            const treatmentsMap: Record<string, string[]> = {};
            let subplotsPerPlot = 1;
            if (form.designType === 'splitplot') {
                form.treatments.forEach(t => {
                    if (t.name.trim() && t.value.trim()) {
                        if (!treatmentsMap[t.name.trim()]) treatmentsMap[t.name.trim()] = [];
                        treatmentsMap[t.name.trim()].push(t.value.trim());
                    }
                });
                Object.values(treatmentsMap).forEach(vals => {
                    if (vals.length > 0) subplotsPerPlot *= vals.length;
                });
            }

            // Greenhouse plants array
            let greenhousePlantsArray: number[] | undefined;
            if (form.designType === 'greenhouse' && form.stockListId) {
                const stocks = getListElements(form.stockListId);
                const defaultPlants = parseInt(form.greenhouseDefaultPlants || '1', 10) || 1;
                greenhousePlantsArray = stocks.map(st => {
                    const custom = form.greenhouseCustomPlants[st];
                    const parsed = parseInt(custom, 10);
                    return !isNaN(parsed) && parsed > 0 ? parsed : defaultPlants;
                });
            }

            const payload = new URLSearchParams({
                project_name: form.trialName.trim(),
                project_description: form.description.trim(),
                year: form.year,
                planting_date: form.plantingDate,
                trial_location: JSON.stringify(form.locations),
                trial_stock_type: form.stockType,
                design_type: form.designType,
                rep_count: form.repCount,
                block_number: form.blockNumber,
                block_size: form.blockSize,
                max_block_size: form.maxBlockSize,
                row_number: form.rowNumber,
                col_number: form.colNumber,
                row_number_per_block: form.rowNumberPerBlock,
                col_number_per_block: form.colNumberPerBlock,
                row_in_design_number: form.rowInDesignNumber,
                col_in_design_number: form.colInDesignNumber,
                no_of_rep_times: form.noOfRepTimes,
                no_of_block_sequence: form.noOfBlockSequence,
                no_of_sub_block_sequence: form.noOfSubBlockSequence,
                fieldmap_col_number: form.colNumber || form.colNumberPerBlock,
                fieldmap_row_number: form.fieldMapRowNumber,
                plot_layout_format: form.plotLayoutFormat,
                plot_prefix: form.plotPrefix,
                start_number: form.startNumber,
                increment: form.increment,
                plot_numbering_scheme: form.plotNumberingScheme,
                use_same_layout: form.useSameLayout ? 'same_design' : '',
                num_rows_per_plot: form.rowsPerPlot,
                num_cols_per_plot: form.colsPerPlot,
                field_size: form.fieldSize,
                plot_width: form.plotWidth,
                plot_length: form.plotLength,
                num_seed_per_plot: form.numSeedPerPlot,
                seedlot_hash: JSON.stringify(form.seedlotHash || {}),
                westcott_check_1: form.westcottCheck1,
                westcott_check_2: form.westcottCheck2,
                westcott_col: form.westcottCol,
                westcott_col_between_check: form.westcottColBetweenCheck,
                treatments: JSON.stringify(treatmentsMap),
                num_plants_per_plot: form.designType === 'splitplot'
                    ? String((parseInt(form.numPlantsPerTreatment || '0', 10) || 0) * subplotsPerPlot)
                    : (form.plantsPerPlot || '0')
            });
            if (greenhousePlantsArray) {
                payload.append('greenhouse_num_plants', JSON.stringify(greenhousePlantsArray));
            }

            if (stockList) payload.append('stock_list', stockList);
            if (controlList) payload.append('control_list', controlList);
            if (crbdControlList) payload.append('control_list_crbd', crbdControlList);
            if (unrepStockList) payload.append('unreplicated_stock_list', unrepStockList);
            if (repStockList) payload.append('replicated_stock_list', repStockList);

            const res = await fetch('/ajax/trial/generate_experimental_design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: payload.toString()
            });
            const data: DesignResultResponse = await res.json();
            if (data.error) {
                setError(data.error);
                return { data: null, error: data.error };
            }
            return { data, error: null };
        } catch (e: any) {
            const msg = e?.message || 'Failed to generate experimental design';
            setError(msg);
            return { data: null, error: msg };
        } finally {
            setLoading(false);
        }
    }, []);

    return { generateDesign, loading, error };
};
