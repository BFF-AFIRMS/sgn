import test from 'tape';

import {
    buildExcelSheet,
    DataTable,
    serializeDelimited,
    type DataTableColumn,
    type DataTableRowAction,
} from '../source/include/datatable';
import { fireEvent, render, screen, within } from '../test_utils/rtl';

interface Person {
    id: number;
    name: string;
    age: number;
    joined?: Date;
}

const COLUMNS: Array<DataTableColumn<Person>> = [
    { key: 'name', label: 'Name' },
    { key: 'age', label: 'Age' },
];

const ROWS: Array<Person> = [
    { id: 1, name: 'Ada', age: 36 },
    { id: 2, name: 'Grace', age: 45 },
    { id: 3, name: 'Boris', age: 41 },
];

const JOINED_ON = new Date('2020-01-15T00:00:00Z');

const COLUMNS_WITH_DATE: Array<DataTableColumn<Person>> = [
    ...COLUMNS,
    { key: 'joined', label: 'Joined' },
];

const CUSTOM_CELL_COLUMNS: Array<DataTableColumn<Person>> = [
    {
        key: 'name',
        label: 'Name',
        cell: ({ row }) => <strong>{row.original.name.toUpperCase()}</strong>,
    },
    { key: 'age', label: 'Age' },
];

const table = () => (
    <DataTable columns={COLUMNS} rows={ROWS} getRowId={row => String(row.id)} />
);

test('DataTable - renders one row per record', t => {
    render(t, table());

    t.ok(screen.getByText('Ada'), 'renders the first record');
    t.ok(screen.getByText('Boris'), 'renders the last record');
    t.equal(
        screen.getAllByLabelText('Select row').length,
        ROWS.length,
        'renders one selection checkbox per record',
    );
    t.end();
});

test('DataTable - column filter hides non matching rows', t => {
    render(t, table());

    fireEvent.change(screen.getByLabelText('Filter Name'), { target: { value: 'Ada' } });

    t.ok(screen.getByText('Ada'), 'keeps the matching record');
    t.notOk(screen.queryByText('Grace'), 'drops the records that do not match');
    t.end();
});

test('DataTable - clicking a header toggles sorting', t => {
    render(t, table());

    // Re-query on each use: the header cell is re-rendered whenever the sort
    // state changes, so a reference captured before the click can go stale.
    const header = () => screen.getByTitle('Sort by Age');
    const rowText = () =>
        screen
            .getAllByLabelText('Select row')
            .map(checkbox => checkbox.closest('tr')!.textContent!);

    // `sortFn: 'auto'` resolves to `alphanumeric` for this numeric column,
    // which sorts descending first.
    fireEvent.click(header());

    t.ok(within(header()).queryByText('▼'), 'shows the descending indicator on the first click');
    t.ok(rowText()[0].includes('Grace'), 'orders the rows by age descending');
    t.ok(rowText()[2].includes('Ada'), 'puts the youngest record last');

    fireEvent.click(header());

    t.ok(within(header()).queryByText('▲'), 'shows the ascending indicator on the second click');
    t.ok(rowText()[0].includes('Ada'), 'orders the rows by age ascending');
    t.ok(rowText()[2].includes('Grace'), 'puts the oldest record last');

    t.end();
});

test('DataTable - renders the empty message when there are no rows', t => {
    const fallback = render(
        t,
        <DataTable columns={COLUMNS} rows={[]} getRowId={row => String(row.id)} />,
    );
    t.ok(
        within(fallback.container).getByText('No rows found.'),
        'shows the default empty message',
    );

    const custom = render(
        t,
        <DataTable
            columns={COLUMNS}
            rows={[]}
            getRowId={row => String(row.id)}
            emptyMessage="No accessions match"
        />,
    );
    t.ok(
        within(custom.container).getByText('No accessions match'),
        'shows the message from the emptyMessage prop',
    );

    t.end();
});

test('DataTable - formats cell values and renders custom cells', t => {
    const dates = render(
        t,
        <DataTable
            columns={COLUMNS_WITH_DATE}
            rows={[{ id: 1, name: 'Ada', age: 36, joined: JOINED_ON }]}
            getRowId={row => String(row.id)}
        />,
    );
    t.ok(
        within(dates.container).getByText(JOINED_ON.toLocaleDateString()),
        'formats dates with toLocaleDateString',
    );

    const custom = render(
        t,
        <DataTable columns={CUSTOM_CELL_COLUMNS} rows={ROWS} getRowId={row => String(row.id)} />,
    );
    t.ok(within(custom.container).getByText('ADA'), 'renders the custom cell content');
    t.notOk(within(custom.container).queryByText('Ada'), 'does not also render the raw value');

    t.end();
});

test('DataTable - global filter searches every column', t => {
    render(
        t,
        <DataTable
            columns={COLUMNS}
            rows={ROWS}
            getRowId={row => String(row.id)}
            filter={{ global: true }}
        />,
    );

    fireEvent.change(screen.getByLabelText('Search all columns'), { target: { value: 'Grace' } });

    t.ok(screen.getByText('Grace'), 'keeps the matching record');
    t.notOk(screen.queryByText('Ada'), 'drops the records that do not match');

    t.end();
});

test('DataTable - per-column filters can be turned off', t => {
    const withoutRow = render(
        t,
        <DataTable
            columns={COLUMNS}
            rows={ROWS}
            getRowId={row => String(row.id)}
            filter={{ column: false }}
        />,
    );
    t.equal(
        within(withoutRow.container).queryAllByLabelText(/^Filter /).length,
        0,
        'renders no filter inputs when filter.column is false',
    );

    const oneColumn = render(
        t,
        <DataTable
            columns={[
                { key: 'name', label: 'Name', enableFiltering: false },
                { key: 'age', label: 'Age' },
            ]}
            rows={ROWS}
            getRowId={row => String(row.id)}
        />,
    );
    t.notOk(
        within(oneColumn.container).queryByLabelText('Filter Name'),
        'skips columns with enableFiltering false',
    );
    t.ok(
        within(oneColumn.container).getByLabelText('Filter Age'),
        'still filters the other columns',
    );

    t.end();
});

test('DataTable - sorting can be turned off', t => {
    const unsorted = render(
        t,
        <DataTable
            columns={COLUMNS}
            rows={ROWS}
            getRowId={row => String(row.id)}
            sortable={false}
        />,
    );
    t.equal(
        within(unsorted.container).queryAllByTitle(/^Sort by /).length,
        0,
        'removes the sort affordance from every header',
    );

    const oneColumn = render(
        t,
        <DataTable
            columns={[
                { key: 'name', label: 'Name', enableSorting: false },
                { key: 'age', label: 'Age' },
            ]}
            rows={ROWS}
            getRowId={row => String(row.id)}
        />,
    );
    t.notOk(
        within(oneColumn.container).queryByTitle('Sort by Name'),
        'skips columns with enableSorting false',
    );
    t.ok(within(oneColumn.container).getByTitle('Sort by Age'), 'still sorts the other columns');

    t.end();
});

test('DataTable - row selection toggles rows and reports the count', t => {
    render(t, table());

    const rowFor = (name: string) => screen.getByText(name).closest('tr')!;
    const checkboxFor = (name: string) =>
        within(rowFor(name)).getByLabelText('Select row') as HTMLInputElement;
    const selectAll = () => screen.getByLabelText('Select all rows') as HTMLInputElement;

    fireEvent.click(checkboxFor('Ada'));

    t.ok(checkboxFor('Ada').checked, 'checks the clicked row');
    t.notOk(checkboxFor('Grace').checked, 'leaves the other rows unchecked');
    t.ok(selectAll().indeterminate, 'marks the header checkbox as indeterminate');
    t.ok(screen.getByText('1 of 3 row(s) selected.'), 'reports one selected row');

    fireEvent.click(selectAll());

    t.ok(checkboxFor('Grace').checked, 'checks every row from the header checkbox');
    t.notOk(selectAll().indeterminate, 'clears the indeterminate state');
    t.ok(screen.getByText('3 of 3 row(s) selected.'), 'reports every row selected');

    t.end();
});

test('DataTable - row selection can be turned off', t => {
    render(
        t,
        <DataTable
            columns={COLUMNS}
            rows={ROWS}
            getRowId={row => String(row.id)}
            enableRowSelection={false}
        />,
    );

    t.equal(screen.queryAllByLabelText('Select row').length, 0, 'renders no per-row checkboxes');
    t.notOk(screen.queryByLabelText('Select all rows'), 'renders no header checkbox');
    t.ok(screen.getByText('0 of 3 row(s) selected.'), 'still renders the footer count');

    t.end();
});

test('DataTable - column visibility menu hides and restores a column', t => {
    render(t, table());

    fireEvent.click(screen.getByRole('button', { name: 'Column Visibility' }));

    const nameToggle = () => screen.getByRole('menuitemcheckbox', { name: 'Name' });

    t.equal(nameToggle().getAttribute('aria-checked'), 'true', 'starts checked');

    fireEvent.click(nameToggle());

    t.equal(nameToggle().getAttribute('aria-checked'), 'false', 'unchecks the column');
    t.notOk(screen.queryByText('Ada'), 'removes the column cells');

    fireEvent.click(nameToggle());

    t.equal(nameToggle().getAttribute('aria-checked'), 'true', 'checks the column again');
    t.ok(screen.getByText('Ada'), 'restores the column cells');

    t.end();
});

test('DataTable - non hideable columns are left out of the visibility menu', t => {
    render(
        t,
        <DataTable
            columns={[
                { key: 'name', label: 'Name', enableHiding: false },
                { key: 'age', label: 'Age' },
            ]}
            rows={ROWS}
            getRowId={row => String(row.id)}
        />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Column Visibility' }));

    t.notOk(
        screen.queryByRole('menuitemcheckbox', { name: 'Name' }),
        'omits the column from the menu',
    );
    t.ok(screen.getByRole('menuitemcheckbox', { name: 'Age' }), 'lists the hideable column');

    t.end();
});

test('DataTable - row actions menu calls the action with its row', t => {
    const calls: Array<string> = [];
    const actions: Array<DataTableRowAction<Person>> = [
        { label: 'Edit', onClick: person => calls.push(`edit ${person.name}`) },
        {
            label: 'Delete',
            variant: 'danger',
            onClick: person => calls.push(`delete ${person.name}`),
        },
    ];

    render(
        t,
        <DataTable
            columns={COLUMNS}
            rows={ROWS}
            getRowId={row => String(row.id)}
            rowActions={actions}
        />,
    );

    const row = screen.getByText('Grace').closest('tr')!;
    fireEvent.click(within(row).getByLabelText('Row actions'));
    fireEvent.click(within(row).getByRole('menuitem', { name: 'Delete' }));

    t.deepEqual(calls, ['delete Grace'], 'calls only the chosen action, with the row it belongs to');

    t.end();
});

test('DataTable - pagination pages through the rows', t => {
    render(
        t,
        <DataTable columns={COLUMNS} rows={ROWS} getRowId={row => String(row.id)} pageSize={2} />,
    );

    const previous = () => screen.getByRole('button', { name: /Previous/ }) as HTMLButtonElement;
    const next = () => screen.getByRole('button', { name: /Next/ }) as HTMLButtonElement;

    t.ok(screen.getByText('1 / 2'), 'starts on the first of two pages');
    t.ok(screen.getByText('Ada'), 'renders the first page');
    t.notOk(screen.queryByText('Boris'), 'leaves the last record for the next page');
    t.ok(previous().disabled, 'disables Previous on the first page');

    fireEvent.click(next());

    t.ok(screen.getByText('2 / 2'), 'advances the page counter');
    t.ok(screen.getByText('Boris'), 'renders the second page');
    t.notOk(screen.queryByText('Ada'), 'drops the previous page');
    t.ok(next().disabled, 'disables Next on the last page');

    fireEvent.click(previous());

    t.ok(screen.getByText('1 / 2'), 'returns to the first page');

    t.end();
});

test('DataTable - rows per page control changes the page size', t => {
    const paged = render(
        t,
        <DataTable columns={COLUMNS} rows={ROWS} getRowId={row => String(row.id)} pageSize={2} />,
    );

    t.notOk(within(paged.container).queryByText('Boris'), 'starts with the two-row page size');

    fireEvent.change(within(paged.container).getByLabelText('Rows per page'), {
        target: { value: '25' },
    });

    t.ok(
        within(paged.container).getByText('Boris'),
        'renders every row once the page size covers them',
    );
    t.ok(within(paged.container).getByText('1 / 1'), 'collapses to a single page');

    const preset = render(
        t,
        <DataTable
            columns={COLUMNS}
            rows={ROWS}
            getRowId={row => String(row.id)}
            pageSize={7}
            pageSizeOptions={[10, 25]}
        />,
    );
    const select = within(preset.container).getByLabelText('Rows per page') as HTMLSelectElement;
    t.deepEqual(
        Array.from(select.options).map(option => option.value),
        ['7', '10', '25'],
        'keeps a non preset page size selectable',
    );

    t.end();
});

test('DataTable - renders the toolbar and passes it the table', t => {
    const node = render(
        t,
        <DataTable
            columns={COLUMNS}
            rows={ROWS}
            getRowId={row => String(row.id)}
            toolbar={<button type="button">Export</button>}
        />,
    );
    t.ok(within(node.container).getByRole('button', { name: 'Export' }), 'renders a toolbar node');

    const fn = render(
        t,
        <DataTable
            columns={COLUMNS}
            rows={ROWS}
            getRowId={row => String(row.id)}
            toolbar={table => <span>{table.getRowModel().rows.length} visible</span>}
        />,
    );
    t.ok(within(fn.container).getByText('3 visible'), 'hands the table to a toolbar function');

    fireEvent.change(within(fn.container).getByLabelText('Filter Name'), {
        target: { value: 'Ada' },
    });

    t.ok(
        within(fn.container).getByText('1 visible'),
        're-renders the toolbar with the filtered rows',
    );

    t.end();
});

test('DataTable - limitHeight caps the height of the scroll area', t => {
    const { container } = render(
        t,
        <DataTable
            columns={COLUMNS}
            rows={ROWS}
            getRowId={row => String(row.id)}
            limitHeight={240}
        />,
    );

    const scrollArea = container.querySelector<HTMLElement>('div[style*="max-height"]');
    t.equal(scrollArea?.style.maxHeight, '240px', 'sets the max height of the scrolling wrapper');

    t.end();
});

test('serializeDelimited - escapes quotes, delimiters, newlines, and nullish values', t => {
    const result = serializeDelimited(
        {
            headers: ['Name', 'Notes', 'Count', 'Active', 'Date'],
            rows: [
                ['Ada, Lovelace', 'Said "hello"\nworld', 42, true, JOINED_ON],
                ['Grace', null, undefined, false, ''],
            ],
        },
        ',',
    );

    t.equal(
        result,
        [
            'Name,Notes,Count,Active,Date',
            `"Ada, Lovelace","Said ""hello""\nworld",42,true,${JOINED_ON.toISOString()}`,
            'Grace,,,false,',
        ].join('\r\n'),
        'serializes RFC 4180 CSV rows without crashing on numbers, booleans, dates, or nullish values',
    );
    t.end();
});

test('buildExcelSheet - creates bold headers, typed cells, and bounded column widths', t => {
    const sheet = buildExcelSheet({
        headers: ['Name', 'Age', 'Active', 'Joined', 'Notes'],
        rows: [['Ada', 36, true, JOINED_ON, null]],
    });

    t.deepEqual(
        sheet.rows[0],
        [
            { value: 'Name', type: String, fontWeight: 'bold' },
            { value: 'Age', type: String, fontWeight: 'bold' },
            { value: 'Active', type: String, fontWeight: 'bold' },
            { value: 'Joined', type: String, fontWeight: 'bold' },
            { value: 'Notes', type: String, fontWeight: 'bold' },
        ],
        'marks header cells bold',
    );
    t.deepEqual(
        sheet.rows[1],
        [
            { type: String, value: 'Ada' },
            { type: Number, value: 36 },
            { type: Boolean, value: true },
            { type: Date, value: JOINED_ON, format: 'yyyy-mm-dd' },
            {},
        ],
        'assigns cell types and formats appropriately',
    );
    t.ok(
        sheet.columns.every(col => col.width > 0 && col.width <= 50),
        'computes positive bounded column widths',
    );
    t.end();
});

test('DataTable - export menu respects selection, sorting, filtering, and column visibility', async t => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalAnchorClick = HTMLAnchorElement.prototype.click;

    let capturedBlob: Blob | null = null;
    let capturedDownload = '';
    URL.createObjectURL = (blob: Blob) => {
        capturedBlob = blob;
        return 'blob:mock-export';
    };
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function () {
        capturedDownload = this.download;
    };

    const assertBom = async (blob: Blob, format: string) => {
        // Blob.text() decodes through TextDecoder, which silently drops a leading
        // BOM, so the byte order mark has to be asserted on the raw bytes.
        const tsvBytes = new Uint8Array(await blob!.arrayBuffer());
        t.deepEqual(
            Array.from(tsvBytes.slice(0, 3)),
            [0xEF, 0xBB, 0xBF],
            `prefixes the ${format} download with a UTF-8 BOM`,
        );
    };

    try {
        const plain = render(t, table());
        t.notOk(
            within(plain.container).queryByRole('button', { name: 'Export' }),
            'does not render the Export button unless export is enabled',
        );

        const exportable = render(
            t,
            <DataTable
                columns={[
                    {
                        key: 'name',
                        label: 'Name',
                        cell: ({ row }) => <strong>{row.original.name}</strong>,
                    },
                    { key: 'age', label: 'Age' },
                    {
                        key: 'secret',
                        label: 'Secret',
                        enableExport: false,
                        exportValue: () => 'hidden',
                    },
                ]}
                rows={[
                    { id: 1, name: 'Ada', age: 36, secret: 'x' },
                    { id: 2, name: 'Grace', age: 45, secret: 'y' },
                    { id: 3, name: 'Boris', age: 41, secret: 'z' },
                ]}
                getRowId={row => String(row.id)}
                pageSize={2}
                export={{ filename: 'people', formats: ['csv', 'tsv'] }}
            />,
        );

        // Sort Age descending (Grace 45, Boris 41, Ada 36) across all pages
        fireEvent.click(within(exportable.container).getByTitle('Sort by Age'));

        // Open Export menu with no rows selected -> exports all 3 sorted rows across pages
        fireEvent.click(within(exportable.container).getByRole('button', { name: 'Export' }));
        t.ok(within(exportable.container).getByText('All 3 row(s)'), 'shows total row count');
        t.notOk(
            within(exportable.container).queryByRole('menuitem', { name: 'Excel' }),
            'omits formats excluded by export.formats',
        );

        fireEvent.click(within(exportable.container).getByRole('menuitem', { name: 'CSV' }));
        t.equal(capturedDownload, 'people.csv', 'downloads using configured filename and .csv extension');

        await assertBom(capturedBlob!, 'CSV');

        const csvText = await capturedBlob!.text();
        t.equal(
            csvText,
            'Name,Age\r\nGrace,45\r\nBoris,41\r\nAda,36',
            'exports all sorted rows across pages and excludes enableExport:false columns',
        );

        // Hide Age column and select only Grace -> exports only Grace's Name as TSV
        fireEvent.click(within(exportable.container).getByRole('button', { name: 'Column Visibility' }));
        fireEvent.click(within(exportable.container).getByRole('menuitemcheckbox', { name: 'Age' }));
        const graceRow = within(exportable.container).getByText('Grace').closest('tr')!;
        fireEvent.click(within(graceRow).getByLabelText('Select row'));

        fireEvent.click(within(exportable.container).getByRole('button', { name: 'Export' }));
        t.ok(within(exportable.container).getByText('1 selected row(s)'), 'shows selected row count');
        fireEvent.click(within(exportable.container).getByRole('menuitem', { name: 'TSV' }));
        t.equal(capturedDownload, 'people.tsv', 'downloads using .tsv extension');

        await assertBom(capturedBlob!, 'TSV');

        const tsvText = await capturedBlob!.text();
        t.equal(tsvText, 'Name\r\nGrace', 'exports only selected rows and visible columns');
    } finally {
        URL.createObjectURL = originalCreateObjectURL;
        HTMLAnchorElement.prototype.click = originalAnchorClick;
    }

    t.end();
});
