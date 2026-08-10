export interface ObservationLevel {
    levelCode: string | number;
    levelName: string;
    levelOrder?: number;
}

export interface ObservationLevelRelationship {
    levelCode: string;
    levelName: string;
}

export interface ObservationUnitPosition {
    positionCoordinateX: string | number;
    positionCoordinateY: string | number;
    observationLevel: ObservationLevel;
    observationLevelRelationships?: ObservationLevelRelationship[];
    entryType?: string;
}

export interface Plot {
    type: 'data' | 'filler' | 'border' | 'empty_space';
    observationUnitDbId?: string;
    observationUnitName: string;
    observationUnitPosition: ObservationUnitPosition;
    germplasmDbId?: string;
    germplasmName?: string;
    crossName?: string;
    locationName?: string;
    studyName?: string;
    plotImageDbIds?: string[];
    additionalInfo?: {
        intercropGermplasm?: { germplasmName: string }[];
        familyName?: string;
        is_a_control?: boolean;
        isObsolete?: boolean;
        invert_row_checkmark?: boolean;
        invert_col_checkmark?: boolean;
        top_border_selection?: boolean;
        left_border_selection?: boolean;
        right_border_selection?: boolean;
        bottom_border_selection?: boolean;
        plot_layout?: 'serpentine' | 'zigzag';
        plot_color_var?: 'parity' | 'germplasm' | 'block' | 'family_name' | 'cross_name';
        plot_label_var?: 'plot_number' | 'germplasm' | 'block' | 'family_name' | 'cross_name';
        plot_label_size?: number;
        [key: string]: any;
    };
}

export interface HeatmapValue {
    val: number;
    plot_name: string;
    id: string;
}

export interface TrialDetails {
    id: string;
    name: string;
    bg: string;
    fg: string;
}

export interface DownloadOpts {
    type: string;
    order: string;
    start: string;
    borders: boolean;
    gaps: boolean;
    subplots: boolean;
    plants: boolean;
    hmPltid: string;
    hmRange: string;
    hmRow: string;
}

export interface CsvDownloadOpts {
    accession: boolean;
    obsUnit: boolean;
    seedlot: boolean;
    plotId: boolean;
    plotNum: boolean;
    familyName: boolean;
    crossName: boolean;
}

export interface PlotStructureNode {
    type: string;
    stock_id?: number;
    name?: string;
    attributes?: Record<string, { value: any }>;
    has?: Record<string, PlotStructureNode>;
}
