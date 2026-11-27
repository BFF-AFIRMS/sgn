import test from 'tape';
import {
    buildGenerateDesignPayload,
    buildSaveDesignPayload
} from '../../source/include/add_trial/services/trialService';
import { TrialFormData } from '../../source/include/add_trial/types';

const createBaseFormData = (overrides: Partial<TrialFormData> = {}): TrialFormData => ({
    trialName: 'Trial_Alpha',
    breedingProgram: 'Test Program',
    locations: ['LocA', 'LocB'],
    year: '2025',
    plantingDate: '2025-05-10',
    description: 'Design payload test',
    trialType: 'phenotyping',
    plotWidth: '3.0',
    plotLength: '4.0',
    fieldSize: '2.5',
    plantsPerPlot: '12',
    inheritTreatments: true,
    assignRowColToPlants: false,
    rowsPerPlot: '',
    colsPerPlot: '',
    stockType: 'accession',
    designType: 'CRD',
    useSameLayout: true,
    stockListId: '101',
    controlListId: '102',
    crbdControlListId: '',
    unrepStockListId: '',
    repStockListId: '',
    seedlotListId: '',
    numSeedPerPlot: '',
    seedlotHash: {},
    repCount: '3',
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
    treatments: [{ name: '', value: '' }],
    numPlantsPerTreatment: '',
    westcottCheck1: '',
    westcottCheck2: '',
    westcottCol: '',
    westcottColBetweenCheck: '',
    trialSourced: 'yes',
    sourceTrialIds: ['55', '56'],
    willBeGenotyped: 'yes',
    willBeCrossed: 'no',
    showFieldMapOptions: true,
    fieldMapRowNumber: '5',
    plotLayoutFormat: 'serpentine',
    showPlotNamingOptions: true,
    plotNumberingScheme: 'block_based',
    plotPrefix: 'PLT_',
    startNumber: '101',
    increment: '2',
    ...overrides
});

test('Trial Service - buildGenerateDesignPayload: CRD and Lists Serialization', (t) => {
    const form = createBaseFormData();
    const lists = {
        stockListItems: ['Acc_1', 'Acc_2', 'Acc_3'],
        controlListItems: ['Check_1'],
        crbdControlListItems: null,
        unrepStockListItems: null,
        repStockListItems: null,
        seedlotHash: { Acc_1: 'Seedlot_1' }
    };

    const payload = buildGenerateDesignPayload(form, lists);

    t.equal(payload.get('project_name'), 'Trial_Alpha', 'Includes project_name');
    t.equal(payload.get('project_description'), 'Design payload test', 'Includes project_description');
    t.equal(payload.get('year'), '2025', 'Includes year');
    t.equal(payload.get('planting_date'), '2025-05-10', 'Includes planting_date');
    t.equal(payload.get('trial_stock_type'), 'accession', 'Includes stock_type');
    t.equal(payload.get('design_type'), 'CRD', 'Includes design_type');
    t.equal(payload.get('rep_count'), '3', 'Includes rep_count');
    t.equal(payload.get('use_same_layout'), 'same_design', 'Maps useSameLayout true to "same_design"');
    t.equal(payload.get('plot_prefix'), 'PLT_', 'Includes plot_prefix');
    t.equal(payload.get('start_number'), '101', 'Includes start_number');
    t.equal(payload.get('increment'), '2', 'Includes increment');
    t.equal(payload.get('plot_numbering_scheme'), 'block_based', 'Includes plot_numbering_scheme');

    // JSON array parameters
    t.equal(payload.get('trial_location'), JSON.stringify(['LocA', 'LocB']), 'Encodes locations as JSON');
    t.equal(payload.get('stock_list'), JSON.stringify(['Acc_1', 'Acc_2', 'Acc_3']), 'Encodes stock_list as JSON');
    t.equal(payload.get('control_list'), JSON.stringify(['Check_1']), 'Encodes control_list as JSON');
    t.equal(payload.get('seedlot_hash'), JSON.stringify({ Acc_1: 'Seedlot_1' }), 'Encodes seedlot_hash as JSON');

    t.end();
});

test('Trial Service - buildGenerateDesignPayload: Splitplot Treatments Calculation', (t) => {
    const form = createBaseFormData({
        designType: 'splitplot',
        blockNumber: '3',
        numPlantsPerTreatment: '4',
        treatments: [
            { name: 'Water', value: 'High' },
            { name: 'Water', value: 'Low' },
            { name: 'Nutrient', value: 'Standard' },
            { name: 'Nutrient', value: 'Double' }
        ]
    });

    const lists = {
        stockListItems: ['Acc_A', 'Acc_B'],
        controlListItems: null,
        crbdControlListItems: null,
        unrepStockListItems: null,
        repStockListItems: null,
        seedlotHash: {}
    };

    const payload = buildGenerateDesignPayload(form, lists);

    t.equal(payload.get('design_type'), 'splitplot', 'Design type is splitplot');
    // 2 Water * 2 Nutrient = 4 subplots; 4 subplots * 4 plantsPerTreatment = 16 plants per plot
    t.equal(payload.get('num_plants_per_plot'), '16', 'Calculates num_plants_per_plot as subplots * plantsPerTreatment');

    const treatmentsJson = JSON.parse(payload.get('treatments') || '{}');
    t.deepEqual(treatmentsJson.Water, ['High', 'Low'], 'Encodes Water factor levels in treatments JSON');
    t.deepEqual(treatmentsJson.Nutrient, ['Standard', 'Double'], 'Encodes Nutrient factor levels in treatments JSON');

    t.end();
});

test('Trial Service - buildGenerateDesignPayload: Greenhouse Custom Plants Allocation', (t) => {
    const form = createBaseFormData({
        designType: 'greenhouse',
        greenhouseDefaultPlants: '2',
        greenhouseCustomPlants: {
            Acc_Custom: '15'
        }
    });

    const lists = {
        stockListItems: ['Acc_Default1', 'Acc_Custom', 'Acc_Default2'],
        controlListItems: null,
        crbdControlListItems: null,
        unrepStockListItems: null,
        repStockListItems: null,
        seedlotHash: {}
    };

    const payload = buildGenerateDesignPayload(form, lists);

    t.equal(payload.get('design_type'), 'greenhouse', 'Design type is greenhouse');
    const plantsArray = JSON.parse(payload.get('greenhouse_num_plants') || '[]');
    t.deepEqual(plantsArray, [2, 15, 2], 'Generates array with customized and default plant counts per accession');

    t.end();
});

test('Trial Service - buildSaveDesignPayload: Linkage and Design JSON Forwarding', (t) => {
    const form = createBaseFormData({
        sourceTrialIds: ['100', '200'],
        willBeGenotyped: 'yes',
        willBeCrossed: 'yes',
        plantsPerPlot: '5'
    });
    const mockDesignJson = JSON.stringify([{ 1: { plot_name: 'P1' } }]);
    const lists = {
        stockListItems: ['Acc_1', 'Acc_2'],
        controlListItems: ['Check_1']
    };

    const payload = buildSaveDesignPayload(form, mockDesignJson, lists);

    t.equal(payload.get('project_name'), 'Trial_Alpha', 'Includes project_name');
    t.equal(payload.get('design_json'), mockDesignJson, 'Forwards design_json unchanged');
    t.equal(payload.get('breeding_program_name'), 'Test Program', 'Includes breeding_program_name');
    t.equal(payload.get('field_trial_is_planned_to_be_genotyped'), 'yes', 'Forwards genotyping intention');
    t.equal(payload.get('field_trial_is_planned_to_cross'), 'yes', 'Forwards crossing intention');
    t.equal(payload.get('has_plant_entries'), '5', 'Sets has_plant_entries count');
    t.equal(payload.get('has_subplot_entries'), '0', 'Standard trial has 0 subplot entries');

    const sourceTrials = [...payload.getAll('add_project_trial_source[]')];
    t.deepEqual(sourceTrials, ['100', '200'], 'Appends all source trial IDs as array parameters');

    t.end();
});
