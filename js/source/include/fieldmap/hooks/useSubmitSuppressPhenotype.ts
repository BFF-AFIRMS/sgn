import { useHeatmap } from '../contexts/HeatmapContext';
import { useModals } from '../contexts/ModalsContext';
import { useView } from '../contexts/ViewContext';

export const useSubmitSuppressPhenotype = () => {
	const {
		setLoading
	} = useModals();

	const {
		trialId,
		selectedView,
		selectedPlot,
	} = useView();

	const {
		heatmapData,
		fetchHeatmapObservations,
	} = useHeatmap();

    const submitSuppressPhenotype = async () => {
		if (!selectedPlot) {
			return false;
		}
        const currentTraitId = selectedView.replace(' (corrected)', '').replace(' (adjustment)', '');
        const valObj = heatmapData[selectedPlot.observationUnitDbId || ''];
		if (!valObj) {
			return false;
		}

        setLoading(true);
        try {
            const response = await fetch(`/ajax/breeders/trial/${trialId}/suppress_phenotype`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    plot_name: selectedPlot.observationUnitName,
                    phenotype_value: String(valObj.val),
                    trait_id: currentTraitId,
                    phenotype_id: valObj.id
                })
            });
            const body = await response.json();
            if (body.error) {
                alert(body.error);
            } else {
                alert('Phenotype was suppressed successfully!');
                fetchHeatmapObservations(currentTraitId);
				return true;
            }
        } catch (e) {
			console.error('Error suppressing phenotype:', e);
        } finally {
            setLoading(false);
        }

		return false;
    };
	return { submitSuppressPhenotype };
};