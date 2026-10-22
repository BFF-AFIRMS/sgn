import test from 'tape';
import {
    validateTrialInfoSync,
    validateDesignInfoSync,
    validateFieldMapInfoSync
} from '../../source/include/add_trial/hooks/useTrialValidation';
import { evaluateAccordionSync, AccordionWorkflowStep } from '../../source/include/workflow_accordion';
import { TrialFormData } from '../../source/include/add_trial/types';

const createBaseFormData = (overrides: Partial<TrialFormData> = {}): TrialFormData => ({
    trialName: 'Test Trial 2025',
    breedingProgram: 'Test Program',
    locations: ['Test Location'],
    year: '2025',
    plantingDate: '2025-05-01',
    description: 'A test trial description',
    trialType: 'phenotyping',
    plotWidth: '2.5',
    plotLength: '5.0',
    fieldSize: '1.0',
    plantsPerPlot: '10',
    inheritTreatments: true,
    assignRowColToPlants: false,
    rowsPerPlot: '',
    colsPerPlot: '',
    stockType: 'accession',
    designType: 'CRD',
    useSameLayout: false,
    stockListId: '123',
    controlListId: '',
    crbdControlListId: '',
    unrepStockListId: '',
    repStockListId: '',
    seedlotListId: '',
    numSeedPerPlot: '',
    seedlotHash: {},
    repCount: '2',
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
    showPlotNamingOptions: false,
    plotNumberingScheme: 'block_based',
    plotPrefix: '',
    startNumber: '1',
    increment: '1',
    ...overrides
});

test('Trial Validation - validateTrialInfoSync: Required Fields', (t) => {
    const validForm = createBaseFormData();
    t.ok(validateTrialInfoSync(validForm).valid, 'Valid form passes trial info validation');

    t.notOk(validateTrialInfoSync(createBaseFormData({ trialName: '' })).valid, 'Fails when trialName is empty');
    t.notOk(validateTrialInfoSync(createBaseFormData({ trialName: '   ' })).valid, 'Fails when trialName is whitespace');
    t.notOk(validateTrialInfoSync(createBaseFormData({ breedingProgram: '' })).valid, 'Fails when breedingProgram is empty');
    t.notOk(validateTrialInfoSync(createBaseFormData({ locations: [] })).valid, 'Fails when locations array is empty');
    t.notOk(validateTrialInfoSync(createBaseFormData({ year: '' })).valid, 'Fails when year is empty');
    t.notOk(validateTrialInfoSync(createBaseFormData({ description: '' })).valid, 'Fails when description is empty');
    t.notOk(validateTrialInfoSync(createBaseFormData({ description: '   ' })).valid, 'Fails when description is whitespace');

    t.end();
});

test('Trial Validation - validateTrialInfoSync: Dimensions and Capacity', (t) => {
    t.notOk(validateTrialInfoSync(createBaseFormData({ plotWidth: '-1' })).valid, 'Fails on negative plotWidth');
    t.notOk(validateTrialInfoSync(createBaseFormData({ plotWidth: '13.5' })).valid, 'Fails when plotWidth > 13');
    t.ok(validateTrialInfoSync(createBaseFormData({ plotWidth: '13.0' })).valid, 'Passes when plotWidth is at boundary 13');

    t.notOk(validateTrialInfoSync(createBaseFormData({ plotLength: '-0.5' })).valid, 'Fails on negative plotLength');
    t.notOk(validateTrialInfoSync(createBaseFormData({ plotLength: '14' })).valid, 'Fails when plotLength > 13');
    t.ok(validateTrialInfoSync(createBaseFormData({ plotLength: '13' })).valid, 'Passes when plotLength is at boundary 13');

    t.notOk(validateTrialInfoSync(createBaseFormData({ plantsPerPlot: '-5' })).valid, 'Fails on negative plantsPerPlot');
    t.notOk(validateTrialInfoSync(createBaseFormData({ plantsPerPlot: '501' })).valid, 'Fails when plantsPerPlot > 500');
    t.ok(validateTrialInfoSync(createBaseFormData({ plantsPerPlot: '500' })).valid, 'Passes when plantsPerPlot is at boundary 500');

    // In-plot plant coordinates validation
    const coordNoDimensions = createBaseFormData({
        plantsPerPlot: '10',
        assignRowColToPlants: true,
        rowsPerPlot: '',
        colsPerPlot: ''
    });
    t.notOk(validateTrialInfoSync(coordNoDimensions).valid, 'Fails when plant coordinates enabled without row/col counts');

    const coordCapacityExceeded = createBaseFormData({
        plantsPerPlot: '20',
        assignRowColToPlants: true,
        rowsPerPlot: '3',
        colsPerPlot: '5'
    });
    t.notOk(validateTrialInfoSync(coordCapacityExceeded).valid, 'Fails when plantsPerPlot (20) exceeds row * col capacity (15)');

    const coordCapacityValid = createBaseFormData({
        plantsPerPlot: '15',
        assignRowColToPlants: true,
        rowsPerPlot: '3',
        colsPerPlot: '5'
    });
    t.ok(validateTrialInfoSync(coordCapacityValid).valid, 'Passes when row * col capacity meets or exceeds plantsPerPlot');

    t.end();
});

test('Trial Validation - validateDesignInfoSync: Standard & Check Lists', (t) => {
    const missingStockList = createBaseFormData({
        designType: 'CRD',
        stockListId: ''
    });
    t.notOk(validateDesignInfoSync(missingStockList).valid, 'Standard designs require stockListId');

    const augmentedNoChecks = createBaseFormData({
        designType: 'Augmented',
        stockListId: '10',
        controlListId: '',
        maxBlockSize: '15'
    });
    t.notOk(validateDesignInfoSync(augmentedNoChecks).valid, 'Augmented design requires controlListId');

    const madNoChecks = createBaseFormData({
        designType: 'MAD',
        stockListId: '10',
        controlListId: '',
        rowNumber: '5',
        colNumber: '5'
    });
    t.notOk(validateDesignInfoSync(madNoChecks).valid, 'MAD design requires controlListId');

    t.end();
});

test('Trial Validation - validateDesignInfoSync: Replicates and Blocks Requirements', (t) => {
    // Replicates required designs: CRD, Alpha, Lattice, DRRC
    for (const design of ['CRD', 'Alpha', 'Lattice', 'DRRC'] as const) {
        const missingReps = createBaseFormData({
            designType: design,
            stockListId: '10',
            repCount: '',
            blockSize: '4',
            colNumber: '5'
        });
        t.notOk(validateDesignInfoSync(missingReps).valid, `${design} requires repCount`);

        const zeroReps = createBaseFormData({
            designType: design,
            stockListId: '10',
            repCount: '0',
            blockSize: '4',
            colNumber: '5'
        });
        t.notOk(validateDesignInfoSync(zeroReps).valid, `${design} requires repCount >= 1`);
    }

    // Blocks required designs: RCBD, RRC, URDD, splitplot
    for (const design of ['RCBD', 'RRC', 'URDD'] as const) {
        const missingBlocks = createBaseFormData({
            designType: design,
            stockListId: '10',
            blockNumber: '',
            rowInDesignNumber: '4',
            colInDesignNumber: '4'
        });
        t.notOk(validateDesignInfoSync(missingBlocks).valid, `${design} requires blockNumber`);

        const zeroBlocks = createBaseFormData({
            designType: design,
            stockListId: '10',
            blockNumber: '0',
            rowInDesignNumber: '4',
            colInDesignNumber: '4'
        });
        t.notOk(validateDesignInfoSync(zeroBlocks).valid, `${design} requires blockNumber >= 1`);
    }

    t.end();
});

test('Trial Validation - validateDesignInfoSync: Design-Specific Rules', (t) => {
    // Alpha Lattice block size
    const alphaMissingBlockSize = createBaseFormData({
        designType: 'Alpha',
        stockListId: '10',
        repCount: '2',
        blockSize: ''
    });
    t.notOk(validateDesignInfoSync(alphaMissingBlockSize).valid, 'Alpha requires blockSize');

    // Augmented max block size
    const augMissingMaxBlock = createBaseFormData({
        designType: 'Augmented',
        stockListId: '10',
        controlListId: '11',
        maxBlockSize: ''
    });
    t.notOk(validateDesignInfoSync(augMissingMaxBlock).valid, 'Augmented requires maxBlockSize');

    // DRRC columns
    const drrcMissingCols = createBaseFormData({
        designType: 'DRRC',
        stockListId: '10',
        repCount: '2',
        colNumber: ''
    });
    t.notOk(validateDesignInfoSync(drrcMissingCols).valid, 'DRRC requires colNumber');

    // URDD rows and columns
    const urddMissingGrid = createBaseFormData({
        designType: 'URDD',
        stockListId: '10',
        blockNumber: '2',
        rowInDesignNumber: '',
        colInDesignNumber: ''
    });
    t.notOk(validateDesignInfoSync(urddMissingGrid).valid, 'URDD requires rowInDesignNumber and colInDesignNumber');

    // MAD field rows and columns
    const madMissingGrid = createBaseFormData({
        designType: 'MAD',
        stockListId: '10',
        controlListId: '11',
        rowNumber: '',
        colNumber: '4'
    });
    t.notOk(validateDesignInfoSync(madMissingGrid).valid, 'MAD requires rowNumber and colNumber');

    // Westcott checks and columns
    const westcottMissingCheck = createBaseFormData({
        designType: 'Westcott',
        stockListId: '10',
        westcottCheck1: 'Check A',
        westcottCheck2: '',
        westcottCol: '6'
    });
    t.notOk(validateDesignInfoSync(westcottMissingCheck).valid, 'Westcott requires Check 1 and Check 2');

    const westcottMissingCol = createBaseFormData({
        designType: 'Westcott',
        stockListId: '10',
        westcottCheck1: 'Check A',
        westcottCheck2: 'Check B',
        westcottCol: ''
    });
    t.notOk(validateDesignInfoSync(westcottMissingCol).valid, 'Westcott requires westcottCol');

    // Splitplot treatments and plant count
    const splitplotMissingTreatment = createBaseFormData({
        designType: 'splitplot',
        stockListId: '10',
        blockNumber: '2',
        treatments: [{ name: '', value: '' }],
        numPlantsPerTreatment: '5'
    });
    t.notOk(validateDesignInfoSync(splitplotMissingTreatment).valid, 'Splitplot requires at least one complete treatment');

    const splitplotMissingPlantCount = createBaseFormData({
        designType: 'splitplot',
        stockListId: '10',
        blockNumber: '2',
        treatments: [{ name: 'Fertilizer', value: 'High' }],
        numPlantsPerTreatment: '0'
    });
    t.notOk(validateDesignInfoSync(splitplotMissingPlantCount).valid, 'Splitplot requires numPlantsPerTreatment >= 1');

    // p-rep unreplicated and replicated lists
    const prepMissingLists = createBaseFormData({
        designType: 'p-rep',
        unrepStockListId: '',
        repStockListId: '20',
        rowInDesignNumber: '10',
        colInDesignNumber: '10'
    });
    t.notOk(validateDesignInfoSync(prepMissingLists).valid, 'p-rep requires both unrep and rep stock lists');

    const prepMissingGrid = createBaseFormData({
        designType: 'p-rep',
        unrepStockListId: '19',
        repStockListId: '20',
        rowInDesignNumber: '',
        colInDesignNumber: '10'
    });
    t.notOk(validateDesignInfoSync(prepMissingGrid).valid, 'p-rep requires row and column dimensions in design');

    t.end();
});

test('Trial Validation - validateDesignInfoSync: Seedlot List Requirements', (t) => {
    const seedlotMissingQuantity = createBaseFormData({
        designType: 'CRD',
        stockType: 'accession',
        stockListId: '10',
        seedlotListId: '25',
        numSeedPerPlot: ''
    });
    t.notOk(validateDesignInfoSync(seedlotMissingQuantity).valid, 'Seedlot list requires numSeedPerPlot');

    const seedlotZeroQuantity = createBaseFormData({
        designType: 'CRD',
        stockType: 'accession',
        stockListId: '10',
        seedlotListId: '25',
        numSeedPerPlot: '0'
    });
    t.notOk(validateDesignInfoSync(seedlotZeroQuantity).valid, 'Seedlot list requires numSeedPerPlot >= 1');

    const seedlotValid = createBaseFormData({
        designType: 'CRD',
        stockType: 'accession',
        stockListId: '10',
        seedlotListId: '25',
        numSeedPerPlot: '5'
    });
    t.ok(validateDesignInfoSync(seedlotValid).valid, 'Passes when seedlot list has positive integer numSeedPerPlot');

    t.end();
});

test('Trial Validation - validateFieldMapInfoSync', (t) => {
    const rrcMissingRow = createBaseFormData({
        designType: 'RRC',
        fieldMapRowNumber: ''
    });
    t.notOk(validateFieldMapInfoSync(rrcMissingRow).valid, 'RRC requires fieldMapRowNumber');

    const rrcValid = createBaseFormData({
        designType: 'RRC',
        fieldMapRowNumber: '4'
    });
    t.ok(validateFieldMapInfoSync(rrcValid).valid, 'RRC passes with fieldMapRowNumber');

    const crdNoFieldMap = createBaseFormData({
        designType: 'CRD',
        fieldMapRowNumber: ''
    });
    t.ok(validateFieldMapInfoSync(crdNoFieldMap).valid, 'Non-RRC designs do not require fieldMapRowNumber');

    t.end();
});

test('Trial Validation - evaluateAccordionSync', (t) => {
    const steps: AccordionWorkflowStep[] = [
        {
            id: 'step_1',
            title: 'Step 1',
            validate: () => ({ valid: true })
        },
        {
            id: 'step_2',
            title: 'Step 2',
            validate: () => ({ valid: false, error: 'Step 2 has missing data' })
        },
        {
            id: 'step_3',
            title: 'Step 3',
            validate: () => ({ valid: true })
        }
    ];

    const evalResult = evaluateAccordionSync(steps);
    t.notOk(evalResult.valid, 'Accordion evaluation reports failure when any step fails');
    t.equal(evalResult.failingIndex, 1, 'Identifies first failing step index (0-indexed)');
    t.equal(evalResult.maxUnlocked, 1, 'Locks access beyond failing step');
    t.equal(evalResult.message, 'Step 2 has missing data', 'Preserves error message from failing step');

    const allValidSteps: AccordionWorkflowStep[] = [
        { id: 's1', title: 'S1', validate: () => ({ valid: true }) },
        { id: 's2', title: 'S2', validate: () => ({ valid: true }) }
    ];
    const passResult = evaluateAccordionSync(allValidSteps);
    t.ok(passResult.valid, 'Accordion evaluation passes when all steps are valid');
    t.equal(passResult.maxUnlocked, 2, 'Unlocks all steps when valid');

    t.end();
});
