import { createRoot } from 'react-dom/client';
import { DataTable } from '~/datatable';

export const DataTableDemoApp: React.FC = () => {
	const columns = [
		{ label: 'Name', key: 'name' },
		{ label: 'Age', key: 'age' },
		{ label: 'Email', key: 'email' }
	];
	const data = [
		{ name: 'John Doe', age: 30, email: 'john.doe@example.com' },
		{ name: 'Jane Smith', age: 25, email: 'jane.smith@example.com' },
		{ name: 'Alice Johnson', age: 35, email: 'alice.johnson@example.com' },
		{ name: 'Bob Brown', age: 40, email: 'bob.brown@example.com' },
		{ name: 'Charlie Davis', age: 28, email: 'charlie.davis@example.com' },
		{ name: 'Eve Wilson', age: 32, email: 'eve.wilson@example.com' },
		{ name: 'Frank Thomas', age: 45, email: 'frank.thomas@example.com' },
		{ name: 'Grace Lee', age: 29, email: 'grace.lee@example.com' },
		{ name: 'Hannah Martin', age: 31, email: 'hannah.martin@example.com' },
		{ name: 'Ian Clark', age: 27, email: 'ian.clark@example.com' },
		{ name: 'Jack White', age: 33, email: 'jack.white@example.com' },
		{ name: 'Karen Scott', age: 26, email: 'karen.scott@example.com' },
		{ name: 'Leo Turner', age: 34, email: 'leo.turner@example.com' },
		{ name: 'Mia Walker', age: 30, email: 'mia.walker@example.com' },
		{ name: 'Nina Adams', age: 37, email: 'nina.adams@example.com' },
		{ name: 'Oscar Hall', age: 36, email: 'oscar.hall@example.com' },
		{ name: 'Paul Young', age: 38, email: 'paul.young@example.com' },
		{ name: 'Quinn Baker', age: 29, email: 'quinn.baker@example.com' },
		{ name: 'Rachel Green', age: 31, email: 'rachel.green@example.com' },
		{ name: 'Sam Harris', age: 28, email: 'sam.harris@example.com' },
		{ name: 'Tommy King', age: 35, email: 'tommy.king@example.com' },
		{ name: 'Uma Nelson', age: 32, email: 'uma.nelson@example.com' },
		{ name: 'Victor Perez', age: 33, email: 'victor.perez@example.com' },
		{ name: 'Wendy Roberts', age: 34, email: 'wendy.roberts@example.com' },
		{ name: 'Xander Hughes', age: 27, email: 'xander.hughes@example.com' },
		{ name: 'Yara Bell', age: 30, email: 'yara.bell@example.com' },
		{ name: 'Zane Cooper', age: 31, email: 'zane.cooper@example.com' },
		{ name: 'Aaron Smith', age: 28, email: 'aaron.smith@example.com' },
		{ name: 'Betty White', age: 36, email: 'betty.white@example.com' },
		{ name: 'Carl Johnson', age: 29, email: 'carl.johnson@example.com' },
		{ name: 'Diana Prince', age: 27, email: 'diana.prince@example.com' },
		{ name: 'Edward Norton', age: 34, email: 'edward.norton@example.com' },
		{ name: 'Fiona Gallagher', age: 31, email: 'fiona.gallagher@example.com' },
		{ name: 'George Michael', age: 30, email: 'george.michael@example.com' },
		{ name: 'Holly Hunter', age: 32, email: 'holly.hunter@example.com' },
		{ name: 'Ian McKellen', age: 34, email: 'ian.mckellen@example.com' },
		{ name: 'Jessica Alba', age: 29, email: 'jessica.alba@example.com' },
		{ name: 'Kevin Bacon', age: 31, email: 'kevin.bacon@example.com' },
		{ name: 'Liam Neeson', age: 33, email: 'liam.neeson@example.com' },
		{ name: 'Megan Fox', age: 29, email: 'megan.fox@example.com' },
		{ name: 'Nathan Fillion', age: 36, email: 'nathan.fillion@example.com' },
		{ name: 'Olivia Wilde', age: 32, email: 'olivia.wilde@example.com' },
		{ name: 'Patrick Stewart', age: 34, email: 'patrick.stewart@example.com' }
	];
    return (
        <div>
            <h1>Data Table Demo</h1>
            <DataTable columns={columns} rows={data} />
        </div>
    );
};

export const init = (containerId: string) => {
	const container = document.getElementById(containerId);
	if (container) {
		const root = createRoot(container);
		root.render(<DataTableDemoApp />);
	}
}