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
    longDescription: string;
}

// TODO: Review and potentially uncomment the URDD, MAD, and p-rep design types once R issues are fixed
export const STANDARD_DESIGN_TYPES: DesignTypeOption[] = [
    { value: 'CRD', label: 'Completely Randomized', description: 'Completely Randomized Design', longDescription: 'Generates a Completely Randomized design (CRD) with equal or different repetition, using the methods of random number generation in R. Creates plot entities in the database.' },
    { value: 'RCBD', label: 'Complete Block', description: 'Randomized Complete Block Design', longDescription: 'Generates a Randomized Complete Block design (RCBD), using the methods of random number generation in R. Creates plot entities in the database.' },
    { value: 'RRC', label: 'Resolvable Row-Column', description: 'Resolvable Row-Column Design', longDescription: 'Generates a Resolvable Row-Column design (RRC), using the blocksdesign package in R. In addition to the one-way blocks it adds a constraint that no treatment may appear more than once in each row (latinization). Each row becomes an incomplete block.' },
    { value: 'DRRC', label: 'Doubly-Resolvable Row-Column', description: 'Doubly-Resolvable Row-Column Design', longDescription: 'Generates a Doubly-Resolvable Row-Column design (DRRC), using the blocksdesign package in R. It creates complete blocks in columns and rows. The number of accessions must be divisible by the number of columns and rows.' },
//    { value: 'URDD', label: 'Un-Replicated Diagonal Design', description: 'Un-Replicated Diagonal Design', longDescription: 'Generates an Un-Replicated Diagonal Design (URDD), using the FieldHub package in R. It is an Un-Replicateddesign with an option to create blocks. All checks are distributed in diagonals.' },
    { value: 'Alpha', label: 'Alpha Lattice', description: 'Alpha Lattice Incomplete Block Design', longDescription: 'Generates an Alpha design starting from design fixing under the 4 series formulated by Patterson and Williams. Creates plot entities in the database.' },
    { value: 'Lattice', label: 'Lattice', description: 'Lattice Design', longDescription: 'Generates SIMPLE and TRIPLE lattice designs using the design.lattice function from the agricolae R package. Randomizes treatments in K x K lattice. Creates plot entities in the database.' },
    { value: 'Augmented', label: 'Augmented', description: 'Augmented Incomplete Block Design', longDescription: 'Generates an Augmented design. Some treatments (checks) are replicated r times and other treatments (new) are replicated once. Creates plot entities in the database.' },
//    { value: 'MAD', label: 'Modified Augmented Design', description: 'Modified Augmented Design', longDescription: 'Adjustments are calculated using data from all checks. Creates plot entities in the database.' },
    { value: 'greenhouse', label: 'Nursery/Greenhouse', description: 'Greenhouse Design', longDescription: 'A greenhouse/nursery houses plants in no particular layout design. The plants can be of named accessions or in the case of seedling nurseries from crosses, the plants can be of named crosses. Creates plot entities with plant entities in the database.' },
    { value: 'splitplot', label: 'Split Plot', description: 'Split Plot Design', longDescription: 'Split plot designs are useful for applying treatments to subplots of a plot. If you give two treatments with two levels each, there will be four subplots with the four treatment combinations distributed randomly among them. Creates plot entities with subplot entities with plant entities in the database.' },
//    { value: 'p-rep', label: 'Partially Replicated', description: 'Partially Replicated Design', longDescription: 'Has some treatments that are unreplicated and relies on replicated treatments to make the trial analysable. It is recommended that at least 20% of the experimental units are occupied by replicated treatments. Creates plot entities in the database.' },
    { value: 'Westcott', label: 'Westcott', description: 'Westcott Design', longDescription: 'Generates a fieldplan for an unreplicated design with genotypes randomly allocated within a field with checks following the method described by Westcott (1981).' }
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

export interface ConfirmedTreatment {
    name: string;
    type?: string;
    stocks: string[];
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
    designResult?: DesignResultResponse | null;
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
