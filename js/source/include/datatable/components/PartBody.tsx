import { DataTableProps } from '../types';

export const PartBody = ({ columns, rows }: DataTableProps) => {
    return (
        <tbody>
        {
            rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                    {
                        columns.map(({ key }) => (
                            <td key={key}>{row[key]}</td>
                        ))
                    }
                </tr>
            ))
        }
        </tbody>
    );
};