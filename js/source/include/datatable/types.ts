export interface DataTableProps {
    columns: { key: string; label: string }[];
    rows: Record<string, any>[];

    pageSize?: number;
    sortable?: boolean;

    limitHeight?: number;

    filter: {
        global?: boolean;
        column?: boolean;
    }
}