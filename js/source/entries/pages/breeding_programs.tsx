import { createRoot } from 'react-dom/client';
import { DataTable, DataTableColumn } from '~/datatable';

export interface BreedingProgramsProps {
	data: string[][];
}

export const BreedingProgramsApp: React.FC<BreedingProgramsProps> = ({ data }) => {
	const columns: DataTableColumn[] = [
		{ key: 1, label: 'Name' },
		{ key: 2, label: 'Description' }
	];
    return (
		<DataTable columns={columns} rows={data} />
    );
};

export const init = (containerId: string, props: BreedingProgramsProps) => {
	const container = document.getElementById(containerId);
	if (container) {
		const root = createRoot(container);
		root.render(<BreedingProgramsApp {...props} />);
	}
}