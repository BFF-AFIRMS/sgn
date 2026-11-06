export interface DataTableColumn {
    key: string | number;
    label: string;
}

export interface DataTableProps {
    columns: DataTableColumn[];
    rows: Record<string, any>[];

    pageSize?: number;
    sortable?: boolean;

    limitHeight?: number;

    filter?: {
        global?: boolean;
        column?: boolean;
    }
}