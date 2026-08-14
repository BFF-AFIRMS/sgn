import { useCallback } from 'react';
import { useHeatmap } from '../contexts/HeatmapContext';
import { useModals } from '../contexts/ModalsContext';
import { useView } from '../contexts/ViewContext';

export const useDeleteTrait = () => {
	const {
		setLoading,
	} = useModals();

	const {
		trialId,
		selectedView, setSelectedView,
	} = useView();

	const {
		setHeatmapData,
		loadVariables
	} = useHeatmap();

	const deleteTrait = useCallback(async () => {
        const currentTraitId = selectedView.replace(' (corrected)', '').replace(' (adjustment)', '');
        setLoading(true);
		try {
			const response = await fetch(`/ajax/breeders/trial/${trialId}/delete_single_trait`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					traits_id: JSON.stringify([currentTraitId])
				})
			});
			const body = await response.json();

			if (body.error) {
				alert(body.error);
			} else {
				alert('Trait deleted successfully!');
				setSelectedView('fieldmap');
				setHeatmapData({});
				loadVariables();
				return true;
			}
		} catch (e) {
			console.error('Error deleting trait:', e);
		} finally {
			setLoading(false);
		}
		return false;
    }, [trialId, selectedView, setSelectedView, setHeatmapData, loadVariables, setLoading]);

	return { deleteTrait };
};