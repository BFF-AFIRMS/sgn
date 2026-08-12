import { useCallback } from 'react';
import { useModals } from '../contexts/ModalsContext';
import { usePlotGrid } from '../contexts/PlotGridContext';

export const useSubmitGeoLayout = () => {
	const {
		setLoading
	} = useModals();

	const {
		fetchObservationUnits
	} = usePlotGrid();

    const submitGeoLayout = useCallback(async () => {
        const fm = (window as any).geoFieldMapInstance;
        if (fm) {
            setLoading(true);
			try {
				const msg = await fm.update();
				alert(msg || 'Geo layout updated successfully!');
				fetchObservationUnits();
			} catch (e) {
				alert(e || 'Failed to update geo layout');
			} finally {
				setLoading(false);
			}
        }
    }, [setLoading, fetchObservationUnits]);

	return { submitGeoLayout };
};