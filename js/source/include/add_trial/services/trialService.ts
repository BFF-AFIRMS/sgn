import { TrialFormData, DesignResultResponse, StockType } from '../types';
import { getSplitplotTreatments } from '../utils/designAdapters';
import { fetchListItems } from '../hooks/useListItems';
import { normalizeListType } from '../contexts/BreedbaseListsContext';

/**
 * The contents of the lists and the stock-to-seedlot mapping the wizard has
 * collected, used to build a generate-design request.
 */
export interface GenerateDesignLists {
    stockListItems: string[] | null;
    controlListItems: string[] | null;
    crbdControlListItems: string[] | null;
    unrepStockListItems: string[] | null;
    repStockListItems: string[] | null;
    seedlotHash: Record<string, string>;
}

/**
 * The contents of the stock and check lists, used to build a save-design request.
 */
export interface SaveDesignLists {
    stockListItems: string[] | null;
    controlListItems: string[] | null;
}

/**
 * Verifies that a trial name is available, via `GET /ajax/trial/verify_trial_name`.
 * Throws if the name is already in use or the request fails.
 *
 * @param trialName The trial name to check (trimmed before sending).
 */
export const verifyTrialName = async (trialName: string): Promise<void> => {
    const res = await fetch(`/ajax/trial/verify_trial_name?trial_name=${encodeURIComponent(trialName.trim())}`);
    if (!res.ok) {
        throw new Error(`Server returned ${res.status} ${res.statusText} verifying trial name.`);
    }
    const json = await res.json();
    if (json.error) {
        throw new Error(json.error);
    }
};

/**
 * Verifies that every stock in `items` exists, posting to the verify endpoint
 * matching `stockType`. Throws with a `listLabel`-prefixed message on failure.
 * An empty list is a no-op.
 *
 * @param items The stock names to verify.
 * @param stockType The kind of stock the names refer to.
 * @param listLabel Optional label prefixed to the error message.
 */
export const verifyStockItems = async (
    items: string[],
    stockType: StockType,
    listLabel?: string
): Promise<void> => {
    if (items.length === 0) {
        return;
    }

    const endpoints: Record<StockType, { endpoint: string; paramName: string }> = {
        accession: { endpoint: '/ajax/trial/verify_stock_list', paramName: 'stock_list' },
        cross: { endpoint: '/ajax/trial/verify_cross_list', paramName: 'cross_list' },
        family_name: { endpoint: '/ajax/trial/verify_family_name_list', paramName: 'family_name_list' }
    };

    const { endpoint, paramName } = endpoints[stockType];
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ [paramName]: JSON.stringify(items) }).toString()
    });
    if (!res.ok) {
        throw new Error(`Server returned ${res.status} ${res.statusText} verifying stock items.`);
    }
    const json = await res.json();
    if (json.error) {
        throw new Error(listLabel ? `${listLabel}: ${json.error}` : json.error);
    }
};

/**
 * Verifies the contents of a Breedbase list by loading its items and checking
 * them against the stock type the list's `listType` maps to. A falsy id or an
 * unrecognised list type is a no-op.
 *
 * @param listId The ID of the list to verify.
 * @param listType The Breedbase list type (e.g. `accessions`).
 */
export const verifyListById = async (listId: string, listType: string): Promise<void> => {
    if (!listId) {
        return;
    }
    const stockTypeMap: Record<string, StockType> = {
        accessions: 'accession',
        crosses: 'cross',
        family_names: 'family_name',
    };
    const stockType = stockTypeMap[normalizeListType(listType)];
    if (!stockType) {
        return;
    }
    const items = await fetchListItems(listId);
    await verifyStockItems(items, stockType);
};

/**
 * Verifies that the seedlots in `seedlotItems` map onto the stocks in
 * `stockItems`, via `POST /ajax/trial/verify_seedlot_list`. Throws on failure.
 *
 * @param stockItems The stock names to match seedlots against.
 * @param seedlotItems The seedlot names to verify.
 * @returns The stock-to-seedlot mapping returned by the server.
 */
export const verifySeedlotList = async (
    stockItems: string[],
    seedlotItems: string[]
): Promise<Record<string, string>> => {
    const res = await fetch('/ajax/trial/verify_seedlot_list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            stock_list: JSON.stringify(stockItems),
            seedlot_list: JSON.stringify(seedlotItems),
        }).toString(),
    });
    if (!res.ok) {
        throw new Error(`Server returned ${res.status} ${res.statusText} verifying seedlot list.`);
    }
    const json = await res.json();
    if (json.error) {
        throw new Error(json.error);
    }
    return json.seedlot_hash || {};
};

/**
 * Assembles the form body for the generate-design request, including the
 * stock/check lists, the seedlot mapping, and the per-design parameters.
 *
 * @param form The wizard form data.
 * @param lists The list contents and seedlot mapping to send.
 * @returns The request body as `URLSearchParams`.
 */
export const buildGenerateDesignPayload = (
    form: TrialFormData,
    lists: GenerateDesignLists
): URLSearchParams => {
    const { treatmentsMap, subplotsPerPlot } = form.designType === 'splitplot'
        ? getSplitplotTreatments(form.treatments)
        : { treatmentsMap: {}, subplotsPerPlot: 1 };

    let greenhousePlantsArray: number[] | undefined;
    if (form.designType === 'greenhouse' && lists.stockListItems) {
        const defaultPlants = parseInt(form.greenhouseDefaultPlants || form.plantsPerPlot || '1', 10) || 1;
        greenhousePlantsArray = lists.stockListItems.map(st => {
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
        fieldmap_col_number: form.colNumberPerBlock,
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
        seedlot_hash: JSON.stringify(lists.seedlotHash),
        westcott_check_1: form.westcottCheck1,
        westcott_check_2: form.westcottCheck2,
        westcott_col: form.westcottCol,
        westcott_col_between_check: form.westcottColBetweenCheck,
        treatments: JSON.stringify(treatmentsMap),
        num_plants_per_plot: form.designType === 'splitplot'
            ? String((parseInt(form.numPlantsPerTreatment || '0', 10) || 0) * subplotsPerPlot)
            : form.designType === 'greenhouse'
                ? String(parseInt(form.greenhouseDefaultPlants || form.plantsPerPlot || '1', 10) || 1)
                : (form.plantsPerPlot || '0')
    });

    if (greenhousePlantsArray) payload.append('greenhouse_num_plants', JSON.stringify(greenhousePlantsArray));
    if (lists.stockListItems) payload.append('stock_list', JSON.stringify(lists.stockListItems));
    if (lists.controlListItems) payload.append('control_list', JSON.stringify(lists.controlListItems));
    if (lists.crbdControlListItems) payload.append('control_list_crbd', JSON.stringify(lists.crbdControlListItems));
    if (lists.unrepStockListItems) payload.append('unreplicated_stock_list', JSON.stringify(lists.unrepStockListItems));
    if (lists.repStockListItems) payload.append('replicated_stock_list', JSON.stringify(lists.repStockListItems));

    return payload;
};

/**
 * Generates the experimental design by posting `payload` to
 * `/ajax/trial/generate_experimental_design`. Throws if the request fails or the
 * response reports an error.
 *
 * @param payload The generate-design request body.
 * @returns The generated design result.
 */
export const requestExperimentalDesign = async (payload: URLSearchParams): Promise<DesignResultResponse> => {
    const res = await fetch('/ajax/trial/generate_experimental_design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString()
    });
    if (!res.ok) {
        throw new Error(`Server returned ${res.status} ${res.statusText} generating design layout.`);
    }
    const resData: DesignResultResponse = await res.json();
    if (resData.error) {
        throw new Error(resData.error);
    }
    return resData;
};

/**
 * Assembles the form body for the save-design request, including the serialized
 * design, the stock/check lists, and the trial metadata.
 *
 * @param form The wizard form data.
 * @param designJson The serialized design layout to save.
 * @param lists The list contents to send.
 * @returns The request body as `URLSearchParams`.
 */
export const buildSaveDesignPayload = (
    form: TrialFormData,
    designJson: string,
    lists: SaveDesignLists
): URLSearchParams => {
    const { subplotsPerPlot } = form.designType === 'splitplot'
        ? getSplitplotTreatments(form.treatments)
        : { subplotsPerPlot: 1 };

    let greenhousePlantsArray: number[] | undefined;
    if (form.designType === 'greenhouse' && lists.stockListItems) {
        const defaultPlants = parseInt(form.greenhouseDefaultPlants || form.plantsPerPlot || '1', 10) || 1;
        greenhousePlantsArray = lists.stockListItems.map(st => {
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
            : form.designType === 'greenhouse'
                ? String(parseInt(form.greenhouseDefaultPlants || form.plantsPerPlot || '1', 10) || 1)
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
    if (lists.stockListItems) {
        payload.append('stock_list', JSON.stringify(lists.stockListItems));
    }
    if (lists.controlListItems) {
        payload.append('control_list', JSON.stringify(lists.controlListItems));
    }

    form.sourceTrialIds.forEach(id => payload.append('add_project_trial_source[]', id));

    return payload;
};

/**
 * Persists the designed trial by posting `payload` to
 * `/ajax/trial/save_experimental_design`. Throws if the request fails or the
 * response reports an error.
 *
 * @param payload The save-design request body.
 * @returns The id of the saved trial.
 */
export const requestSaveExperimentalDesign = async (payload: URLSearchParams): Promise<string> => {
    const res = await fetch('/ajax/trial/save_experimental_design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString()
    });
    if (!res.ok) {
        throw new Error(`Server returned ${res.status} ${res.statusText} saving experimental design.`);
    }
    const result: { trial_id?: number | string; error?: string } = await res.json();
    if (result.error) {
        throw new Error(result.error);
    }
    return String(result.trial_id);
};

/**
 * Creates plant entries for a saved trial, via
 * `POST /ajax/breeders/trial/:trialId/create_plant_entries/`. Failures are
 * logged and swallowed, since plant creation is non-fatal to the save flow.
 *
 * @param trialId The id of the trial to add plants to.
 * @param form The wizard form data supplying the plant coordinate options.
 * @param plantCount The number of plants to create per plot.
 */
export const createPlantEntries = async (
    trialId: string,
    form: TrialFormData,
    plantCount: number
): Promise<void> => {
    try {
        const res = await fetch(`/ajax/breeders/trial/${trialId}/create_plant_entries/`, {
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
        if (!res.ok) {
            throw new Error(`Server returned ${res.status} ${res.statusText} creating plant entries.`);
        }
    } catch (err: unknown) {
        console.warn('Non-fatal plant creation issue:', err);
    }
};
