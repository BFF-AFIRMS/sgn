/**
 * Export helpers for `<DataTable />`.
 *
 * Turns the table's current view (sorted, filtered, and optionally narrowed to
 * the selected rows and the visible columns) into an Excel workbook, a CSV file
 * or a TSV file, and hands the result to the browser as a download.
 */
import type { Row, Table } from '@tanstack/react-table';
import writeXlsxFile from 'write-excel-file';
import type {
    Cell as ExcelCell,
    SheetData as ExcelSheetData
} from 'write-excel-file'

import type { DataTableFeatures } from './features';
import type {
    DataTableColumn,
    DataTableExportFormat,
    DataTableExportOptions,
    DataTableExportValue,
} from './types';

/** Formats offered by the toolbar's Export menu when the caller does not narrow them down. */
export const DEFAULT_EXPORT_FORMATS: DataTableExportFormat[] = ['excel', 'csv', 'tsv'];

/** A table snapshot reduced to the two things every writer below needs. */
export interface ResolvedExportData {
    /** Column labels, in the order they are written. */
    headers: string[];
    /** Row values, each array aligned index-for-index with `headers`. */
    rows: DataTableExportValue[][];
}

/**
 * Resolves the columns to export: the visible ones, minus any column that opted
 * out via `enableExport: false`.
 *
 * @param table - The table instance the data is read from.
 * @param columns - The `columns` prop the table was built with, used to map
 *   TanStack's column ids back to their `DataTableColumn` definitions.
 * @returns The exportable columns in display order.
 */
export function getExportColumns<TData extends Record<string, any>>(
    table: Table<DataTableFeatures, TData>,
    columns: DataTableColumn<TData>[],
): DataTableColumn<TData>[] {
    const byKey = new Map(columns.map(column => [column.key, column]));
    return table
        .getVisibleLeafColumns()
        .map(column => byKey.get(column.id))
        .filter((column): column is DataTableColumn<TData> =>
            Boolean(column && column.enableExport !== false),
        );
}

/**
 * Returns the rows to export in their current sorted and filtered order across
 * all pages. If any rows are selected, only the selected rows (within the
 * current filtered view) are exported; otherwise all filtered rows are exported.
 *
 * @param table - The table instance to read the rows from.
 * @returns The rows to export, in display order.
 */
export function getExportRows<TData extends Record<string, any>>(
    table: Table<DataTableFeatures, TData>,
): Row<DataTableFeatures, TData>[] {
    const allRows = table.getPrePaginatedRowModel().rows;
    const selectedRows = allRows.filter(row => row.getIsSelected());
    return selectedRows.length > 0 ? selectedRows : allRows;
}

/**
 * Builds the header/value matrix that every writer consumes.
 *
 * @param table - The table instance the data is read from.
 * @param columns - The `columns` prop the table was built with.
 * @returns The resolved headers and rows.
 */
export function buildExportData<TData extends Record<string, any>>(
    table: Table<DataTableFeatures, TData>,
    columns: DataTableColumn<TData>[],
): ResolvedExportData {
    const exportColumns = getExportColumns(table, columns);
    const exportRows = getExportRows(table);

    return {
        headers: exportColumns.map(column => column.label),
        rows: exportRows.map(row =>
            exportColumns.map(column =>
                column.exportValue
                    ? column.exportValue(row.original)
                    : (row.getValue(column.key) as DataTableExportValue),
            ),
        ),
    };
}

/** Renders a cell value as plain text for the CSV/TSV writers. */
const normalizeTextValue = (value: DataTableExportValue): string => {
    if (value === null || value === undefined) {
        return '';
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return String(value);
};

/**
 * Quotes a single delimited field when it contains the delimiter, a double
 * quote or a line break.
 *
 * @param value - The cell value to escape.
 * @param delimiter - The field separator in use (`,` for CSV, `\t` for TSV).
 * @returns The field, quoted and escaped if necessary.
 */
const escapeDelimited = (value: DataTableExportValue, delimiter: string): string => {
    const text = normalizeTextValue(value);
    return text.includes(delimiter) || text.includes('"') || /[\r\n]/.test(text)
        ? `"${text.replace(/"/g, '""')}"`
        : text;
};

/**
 * Serializes the resolved data as CRLF-delimited text.
 *
 * @param data - The headers and rows to write.
 * @param delimiter - The field separator (`,` for CSV, `\t` for TSV).
 * @returns The full file contents, without a trailing line break.
 */
export function serializeDelimited(data: ResolvedExportData, delimiter: string): string {
    const makeRow = (row: DataTableExportValue[]) => row
        .map(value => escapeDelimited(value, delimiter))
        .join(delimiter);

    return [
        makeRow(data.headers),
        ...data.rows.map(row => makeRow(row)),
    ].join('\r\n');
}

/**
 * Maps a cell value onto the typed cell representation `write-excel-file`
 * expects, so numbers, booleans and dates stay numeric, boolean and date cells
 * instead of being flattened to strings.
 *
 * @param value - The cell value to convert.
 * @returns The matching Excel cell.
 */
const toExcelCell = (value: DataTableExportValue): ExcelCell => {
    if (value === null || value === undefined || value === '') {
        return {};
    }
    if (value instanceof Date) {
        return { type: Date, value, format: 'yyyy-mm-dd' };
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return { type: Number, value };
    }
    if (typeof value === 'boolean') {
        return { type: Boolean, value };
    }
    return { type: String, value: String(value) };
};

/**
 * Lays the resolved data out as an Excel sheet, with a bold header row and
 * column widths derived from the longest value in each column.
 *
 * @param data - The headers and rows to write.
 * @returns The sheet rows plus the computed column widths.
 */
export function buildExcelSheet(data: ResolvedExportData): {
    rows: ExcelSheetData;
    columns: { width: number }[];
} {
    const columns = data.headers.map((header, index) => {
        const maxCellWidth = data.rows.reduce(
            (max, row) => Math.max(max, normalizeTextValue(row[index]).length),
            header.length,
        );
        return { width: Math.min(maxCellWidth + 2, 50) };
    });

    const headerRow: ExcelCell[] = data.headers.map(header => ({
        type: String,
        value: header,
        fontWeight: 'bold' as const,
    }));
    const bodyRows: ExcelCell[][] = data.rows.map(row => row.map(toExcelCell));

    return {
        rows: [headerRow, ...bodyRows],
        columns,
    };
}

/**
 * Triggers a browser download of `blob` under `filename`.
 *
 * The object URL is revoked on the next tick, once the click has been handled.
 *
 * @param filename - The name the browser should save the file as.
 * @param blob - The file contents.
 */
const downloadBlob = (filename: string, blob: Blob): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

/**
 * Exports the table in the requested format and starts the download.
 *
 * Excel is written through `write-excel-file`; CSV and TSV are serialized
 * directly. CSV and TSV are prefixed with a BOM so Excel detects the UTF-8
 * encoding when the file is opened by double-clicking it.
 *
 * @param table - The table instance the data is read from.
 * @param columns - The `columns` prop the table was built with.
 * @param format - The output format to write.
 * @param options - Optional filename override.
 */
export async function exportTableData<TData extends Record<string, any>>(
    table: Table<DataTableFeatures, TData>,
    columns: DataTableColumn<TData>[],
    format: DataTableExportFormat,
    options?: DataTableExportOptions,
): Promise<void> {
    const baseName = options?.filename || 'export';
    const data = buildExportData(table, columns);

    if (format === 'excel') {
        const sheet = buildExcelSheet(data);
        await writeXlsxFile(sheet.rows, {
            columns: sheet.columns,
            fileName: `${baseName}.xlsx`,
        });
        return;
    }

    const delimiter = format === 'csv' ? ',' : '\t';
    const content = '\uFEFF' + serializeDelimited(data, delimiter);
    const mimeType =
        format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'text/tab-separated-values;charset=utf-8';

    downloadBlob(`${baseName}.${format}`, new Blob([content], { type: mimeType }));
}
