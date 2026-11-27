import test from 'tape';
import {
    extractDesignPlots,
    getDesignTreatments,
    extractConfirmedTreatments,
    getSplitplotTreatments,
    designPlotsToObservationUnits
} from '../../source/include/add_trial/utils/designAdapters';
import { normalizeListType } from '../../source/include/add_trial/contexts/BreedbaseListsContext';
import { GeneratedDesignPlot, SplitplotTreatment } from '../../source/include/add_trial/types';

test('Design Adapters - extractDesignPlots: Filtering and Sorting', (t) => {
    t.deepEqual(extractDesignPlots(undefined), [], 'Returns empty array for undefined design');
    t.deepEqual(extractDesignPlots({}), [], 'Returns empty array for empty design map');

    const mockDesign: Record<string, unknown> = {
        treatments: {
            Fertilizer: { new_treatment_stocks: ['Plot_1'] }
        },
        random_metadata_key: 'irrelevant string',
        '2': {
            plot_name: 'Trial_Plot_2',
            plot_number: 2,
            stock_name: 'Accession_B'
        },
        '10': {
            plot_name: 'Trial_Plot_10',
            plot_number: 10,
            stock_name: 'Accession_C'
        },
        '1': {
            plot_name: 'Trial_Plot_1',
            plot_number: 1,
            stock_name: 'Accession_A'
        }
    };

    const plots = extractDesignPlots(mockDesign);
    t.equal(plots.length, 3, 'Filters out metadata keys and keeps only plot objects');
    t.equal(plots[0].plot_number, 1, 'Sorts plots numerically ascending: plot 1 first');
    t.equal(plots[1].plot_number, 2, 'Sorts plots numerically ascending: plot 2 second');
    t.equal(plots[2].plot_number, 10, 'Sorts plots numerically ascending: plot 10 third');

    // Fallback sorting by plot_name when plot_number is not a number
    const alphaPlots: Record<string, unknown> = {
        A: { plot_name: 'Plot_Z', stock_name: 'Stock_1' },
        B: { plot_name: 'Plot_A', stock_name: 'Stock_2' }
    };
    const sortedAlpha = extractDesignPlots(alphaPlots);
    t.equal(sortedAlpha[0].plot_name, 'Plot_A', 'Falls back to alphabetical sort on plot_name when non-numeric');
    t.equal(sortedAlpha[1].plot_name, 'Plot_Z', 'Falls back to alphabetical sort on plot_name when non-numeric');

    t.end();
});

test('Design Adapters - getDesignTreatments', (t) => {
    t.deepEqual(getDesignTreatments(undefined), {}, 'Returns empty object for undefined design');
    t.deepEqual(getDesignTreatments({}), {}, 'Returns empty object when treatments key is missing');
    t.deepEqual(getDesignTreatments({ treatments: ['invalid array'] }), {}, 'Returns empty object if treatments is array');

    const validTreatments = {
        Fungicide: {
            new_treatment_stocks: ['Plot_1', 'Plot_2'],
            new_treatment_type: 'Fungicide',
            new_treatment_date: '2025/05/01',
            new_treatment_year: '2025',
            new_treatment_planting_date: '2025/04/01',
            new_treatment_description: 'Sprayed fungicide'
        }
    };
    const res = getDesignTreatments({ treatments: validTreatments });
    t.equal(res.Fungicide.new_treatment_type, 'Fungicide', 'Extracts treatment object matching key');
    t.equal(res.Fungicide.new_treatment_stocks.length, 2, 'Extracts stocks array');

    t.end();
});

test('Design Adapters - extractConfirmedTreatments: Multi-Location Merging', (t) => {
    const designLoc1: Record<string, unknown> = {
        treatments: {
            Fertilizer: {
                new_treatment_type: 'Fertilizer',
                new_treatment_stocks: ['Loc1_Plot_1', 'Loc1_Plot_2']
            },
            Irrigation: {
                new_treatment_type: 'Water',
                new_treatment_stocks: ['Loc1_Plot_1']
            }
        }
    };

    const designLoc2: Record<string, unknown> = {
        treatments: {
            Fertilizer: {
                new_treatment_type: 'Fertilizer',
                new_treatment_stocks: ['Loc2_Plot_1', 'Loc1_Plot_2'] // Loc1_Plot_2 is duplicate
            }
        }
    };

    const confirmed = extractConfirmedTreatments([designLoc1, designLoc2]);
    t.equal(confirmed.length, 2, 'Extracts 2 distinct treatments');

    const fert = confirmed.find(c => c.name === 'Fertilizer');
    t.ok(fert, 'Contains Fertilizer treatment');
    t.equal(fert?.stocks.length, 3, 'De-duplicates and merges plot stocks across both locations (3 distinct plots)');
    t.ok(fert?.stocks.includes('Loc1_Plot_1'), 'Includes plot from location 1');
    t.ok(fert?.stocks.includes('Loc2_Plot_1'), 'Includes plot from location 2');

    const irrig = confirmed.find(c => c.name === 'Irrigation');
    t.ok(irrig, 'Contains Irrigation treatment');
    t.equal(irrig?.stocks.length, 1, 'Includes single plot stock for location 1');

    t.end();
});

test('Design Adapters - getSplitplotTreatments: Factor Grouping and Subplots Multiplication', (t) => {
    t.deepEqual(
        getSplitplotTreatments(undefined),
        { treatmentsMap: {}, subplotsPerPlot: 1 },
        'Returns defaults for undefined treatments'
    );

    const rawTreatments: SplitplotTreatment[] = [
        { name: 'Water', value: 'High' },
        { name: 'Water', value: 'Low' },
        { name: 'Nitrogen', value: 'Zero' },
        { name: 'Nitrogen', value: 'Moderate' },
        { name: 'Nitrogen', value: 'High' },
        { name: '   ', value: 'Ignored' }, // whitespace name
        { name: 'Incomplete', value: '' }    // empty value
    ];

    const { treatmentsMap, subplotsPerPlot } = getSplitplotTreatments(rawTreatments);

    t.deepEqual(treatmentsMap.Water, ['High', 'Low'], 'Groups Water factor values');
    t.deepEqual(treatmentsMap.Nitrogen, ['Zero', 'Moderate', 'High'], 'Groups Nitrogen factor values');
    t.notOk(treatmentsMap['Incomplete'], 'Ignores factor with empty value');
    t.equal(subplotsPerPlot, 6, 'Multiplies number of levels (2 Water * 3 Nitrogen = 6 subplots per plot)');

    t.end();
});

test('Design Adapters - designPlotsToObservationUnits: BrAPI Mapping', (t) => {
    const mockPlots: GeneratedDesignPlot[] = [
        {
            plot_name: 'Trial_101',
            stock_name: 'Acc_Alpha',
            plot_number: 101,
            block_number: 1,
            rep_number: 1,
            row_number: 2,
            col_number: 3,
            is_a_control: 0
        },
        {
            plot_name: 'Trial_102',
            stock_name: 'Check_Beta',
            plot_number: 102,
            block_number: 1,
            rep_number: 1,
            row_number: 2,
            col_number: 4,
            is_a_control: 1
        }
    ];

    const units = designPlotsToObservationUnits(mockPlots, 'Study 2025');
    t.equal(units.length, 2, 'Maps all design plots to observation units');

    const unit1 = units[0];
    t.equal(unit1.type, 'data', 'Type is data');
    t.equal(unit1.observationUnitName, 'Trial_101', 'Maps observationUnitName');
    t.equal(unit1.germplasmName, 'Acc_Alpha', 'Maps germplasmName');
    t.equal(unit1.studyName, 'Study 2025', 'Sets studyName');
    t.equal(unit1.observationUnitPosition.positionCoordinateX, 3, 'Maps col_number to coordinate X');
    t.equal(unit1.observationUnitPosition.positionCoordinateY, 2, 'Maps row_number to coordinate Y');
    t.equal(unit1.observationUnitPosition.entryType, undefined, 'Non-control has undefined entryType');

    const unit2 = units[1];
    t.equal(unit2.observationUnitPosition.entryType, 'check', 'Control plot has check entryType');
    t.equal(unit2.additionalInfo?.is_a_control, true, 'Flags additionalInfo.is_a_control as true');

    t.end();
});

test('Breedbase Lists - normalizeListType: Pluralization Mapping', (t) => {
    t.equal(normalizeListType('accession'), 'accessions', 'accession -> accessions');
    t.equal(normalizeListType('cross'), 'crosses', 'cross -> crosses');
    t.equal(normalizeListType('family_name'), 'family_names', 'family_name -> family_names');
    t.equal(normalizeListType('seedlot'), 'seedlots', 'seedlot -> seedlots');
    t.equal(normalizeListType('  Accession  '), 'accessions', 'Trims whitespace and lowercases');
    t.equal(normalizeListType('accessions'), 'accessions', 'Keeps already pluralized accessions');
    t.equal(normalizeListType('custom_type'), 'custom_type', 'Passes through unmapped custom type');
    t.equal(normalizeListType(''), '', 'Handles empty string');
    t.equal(normalizeListType(undefined), '', 'Handles undefined');

    t.end();
});
