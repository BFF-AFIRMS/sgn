import type { DataTableProps } from '../types';
import { PartBody } from './PartBody';
import { PartHeader } from './PartHeader';

export const DataTable = (props: DataTableProps) => {
    return (
        <table>
            <PartHeader {...props} />
            <PartBody {...props} />
        </table>
    );
};
