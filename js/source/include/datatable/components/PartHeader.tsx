import { DataTableProps } from '../types';

export const PartHeader = ({ columns }: DataTableProps) => {
    return (
        <thead>
            <tr>
            {
                columns.map(({ key, label }) => (
                    <th key={key}>{label}</th>
                ))
            }
            </tr>
        </thead>
    );
};