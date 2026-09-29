import { createRoot } from 'react-dom/client';
import { FieldMapContainer } from '../include/fieldmap';
import { FieldMapProps } from '../include/fieldmap/types';

export { FieldMapContainer };

export const init = (containerId: string, props: FieldMapProps) => {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(<FieldMapContainer {...props} />);
    }
};