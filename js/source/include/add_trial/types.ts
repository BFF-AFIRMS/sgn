export type DesignType =
    | 'CRD'
    | 'RCBD'
    | 'RRC'
    | 'DRRC'
    | 'URDD'
    | 'Alpha'
    | 'Lattice'
    | 'Augmented'
    | 'MAD'
    | 'greenhouse'
    | 'splitplot'
    | 'p-rep'
    | 'Westcott';

export interface DesignTypeOption {
    value: DesignType;
    label: string;
    description: string;
}

export const STANDARD_DESIGN_TYPES: DesignTypeOption[] = [
    { value: 'CRD', label: 'Completely Randomized', description: 'Completely Randomized Design' },
    { value: 'RCBD', label: 'Complete Block', description: 'Randomized Complete Block Design' },
    { value: 'RRC', label: 'Resolvable Row-Column', description: 'Resolvable Row-Column Design' },
    { value: 'DRRC', label: 'Doubly-Resolvable Row-Column', description: 'Doubly-Resolvable Row-Column Design' },
    { value: 'URDD', label: 'Un-Replicated Diagonal Design', description: 'Un-Replicated Diagonal Design' },
    { value: 'Alpha', label: 'Alpha Lattice', description: 'Alpha Lattice Incomplete Block Design' },
    { value: 'Lattice', label: 'Lattice', description: 'Lattice Design' },
    { value: 'Augmented', label: 'Augmented', description: 'Augmented Incomplete Block Design' },
    { value: 'MAD', label: 'Modified Augmented Design', description: 'Modified Augmented Design' },
    { value: 'greenhouse', label: 'Nursery/Greenhouse', description: 'Greenhouse Design' },
    { value: 'splitplot', label: 'Split Plot', description: 'Split Plot Design' },
    { value: 'p-rep', label: 'Partially Replicated', description: 'Partially Replicated Design' },
    { value: 'Westcott', label: 'Westcott', description: 'Westcott Design' }
];

export const getDesignTypeDescription = (designType: DesignType): string => {
    const match = STANDARD_DESIGN_TYPES.find(d => d.value === designType);
    return match ? match.description : designType;
};

export type StockType = 'accession' | 'cross' | 'family_name';
export type PlotNumberingScheme = 'block_based' | 'consecutive';
export type PlotLayoutFormat = 'serpentine' | 'zigzag' | '';

export interface SplitplotTreatment {
    name: string;
    value: string;
}

export interface FieldTrialTreatment {
    new_treatment_stocks: string[];
    new_treatment_type: string;
    new_treatment_date: string;
    new_treatment_year: string;
    new_treatment_planting_date: string;
    new_treatment_description: string;
}

export interface TrialFormData {
    trialName: string;
    breedingProgram: string;
    locations: string[];
    year: string;
    plantingDate: string;
    description: string;
    trialType: string;
    plotWidth: string;
    plotLength: string;
    fieldSize: string;
    plantsPerPlot: string;
    inheritTreatments: boolean;
    assignRowColToPlants: boolean;
    rowsPerPlot: string;
    colsPerPlot: string;
    stockType: StockType;
    designType: DesignType;
    useSameLayout: boolean;
    // Lists
    stockListId: string;
    controlListId: string;
    crbdControlListId: string;
    unrepStockListId: string;
    repStockListId: string;
    seedlotListId: string;
    numSeedPerPlot: string;
    seedlotHash: Record<string, string>;
    // Specific design parameters
    repCount: string;
    blockNumber: string;
    blockSize: string;
    maxBlockSize: string;
    rowNumber: string;
    colNumber: string;
    rowNumberPerBlock: string;
    colNumberPerBlock: string;
    rowInDesignNumber: string;
    colInDesignNumber: string;
    noOfRepTimes: string;
    noOfBlockSequence: string;
    noOfSubBlockSequence: string;
    // Greenhouse
    greenhouseDefaultPlants: string;
    greenhouseCustomPlants: Record<string, string>;
    // Splitplot
    treatments: SplitplotTreatment[];
    numPlantsPerTreatment: string;
    // Westcott
    westcottCheck1: string;
    westcottCheck2: string;
    westcottCol: string;
    westcottColBetweenCheck: string;
    // Linkage
    trialSourced: 'yes' | 'no';
    sourceTrialIds: string[];
    willBeGenotyped: 'yes' | 'no';
    willBeCrossed: 'yes' | 'no';
    // Field Map
    showFieldMapOptions: boolean;
    fieldMapRowNumber: string;
    plotLayoutFormat: PlotLayoutFormat;
    // Plot Naming
    showPlotNamingOptions: boolean;
    plotNumberingScheme: PlotNumberingScheme;
    plotPrefix: string;
    startNumber: string;
    increment: string;
}

export interface GeneratedDesignPlot {
    plot_name: string;
    stock_name: string;
    plot_number: number | string;
    block_number: number | string;
    rep_number: number | string;
    row_number?: number | string;
    col_number?: number | string;
    is_a_control?: number | boolean;
    plant_names?: string[];
    subplots_names?: string[];
    design?: string;
    [key: string]: any;
}

export interface DesignResultResponse {
    success?: string | number;
    error?: string;
    design_json?: string; // JSON array of stringified maps
    design_layout_view_html?: string;
    design_info_view_html?: string;
    design_map_view?: any;
    warning_message?: string;
}

export interface ServerProps {
    locations: Array<{ properties: { Name: string; Program: string } }>;
    breeding_programs: Array<[number, string, string, number]>;
    design_types?: string[];
    management_factor_types?: string[];
}
