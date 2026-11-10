import test from 'tape';

import { DataTable, type DataTableColumn } from '../source/include/datatable';
import { fireEvent, render, screen, within } from '../test_utils/rtl';

interface Person {
    id: number;
    name: string;
    age: number;
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
