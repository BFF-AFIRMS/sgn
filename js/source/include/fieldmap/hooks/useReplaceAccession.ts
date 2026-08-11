import { useModals } from '../contexts/ModalsContext';
import { usePlotGrid } from '../contexts/PlotGridContext';
import { useView } from '../contexts/ViewContext';
import { Plot } from '../model.types';

export enum ReplaceAccessionResult {
	Success = 'success',
	Warning = 'warning',
	Error = 'error'
}

export const useReplaceAccession = () => {
	const {
		trialId
	} = useView();

	const {
		setLoading
	} = useModals();

	const {
		fetchObservationUnits
	} = usePlotGrid();

    const replaceAccession = async (override: 'check' | 'override', selectedPlot: Plot | null, newAccession: string, newPlotName: string) => {
        if (!selectedPlot) return ReplaceAccessionResult.Error;
        setLoading(true);
        try {
            const response = await fetch(`/ajax/breeders/trial/${trialId}/replace_plot_accessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    new_accession: newAccession,
                    new_plot_name: newPlotName,
                    old_accession: selectedPlot.germplasmName || '',
                    old_plot_id: selectedPlot.observationUnitDbId || '',
                    old_plot_name: selectedPlot.observationUnitName,
                    override: override
                })
            });
            const body = await response.json();
            if (body.warning) {
				return ReplaceAccessionResult.Warning;
            } else if (body.error) {
                alert(body.error);
            } else {
                alert('Plot Accession Replaced successfully!');
                fetchObservationUnits();
				return ReplaceAccessionResult.Success;
            }
        } catch (e) {
            console.error('Error replacing accession:', e);
        } finally {
            setLoading(false);
        }

		return ReplaceAccessionResult.Error;
    };
    return { replaceAccession };
};