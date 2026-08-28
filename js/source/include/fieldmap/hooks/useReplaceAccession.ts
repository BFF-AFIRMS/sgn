import { useCallback } from 'react';
import { useModals } from '../contexts/ModalsContext';
import { usePlotGrid } from '../contexts/PlotGridContext';
import { useView } from '../contexts/ViewContext';
import { Plot } from '../types';
import { isDefined } from '../../functions';

export enum ReplaceAccessionResult {
	Success = 'success',
	Warning = 'warning',
	Error = 'error'
}

type ReplaceAccessionResponseBody =
    { error: string } |
    { warning: string } |
    { success: 1, new_accession_id: string };

export const useReplaceAccession = () => {
	const {
		trialId
	} = useView();

	const {
		setLoading
	} = useModals();

	const {
        mutatePlot
	} = usePlotGrid();

    const replaceAccession = useCallback(async (override: 'check' | 'override', selectedPlot: Plot | null, newAccession: string, newPlotName: string) => {
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
            const body: ReplaceAccessionResponseBody = await response.json();
            if ('warning' in body) {
				return ReplaceAccessionResult.Warning;
            } else if ('error' in body) {
                alert(body.error);
            } else {
                alert('Plot Accession Replaced successfully!');
                mutatePlot(selectedPlot, {
                    germplasmName: newAccession,
                    germplasmDbId: body.new_accession_id,
                    observationUnitName: newPlotName || selectedPlot.observationUnitName,
                });
				return ReplaceAccessionResult.Success;
            }
        } catch (e) {
            console.error('Error replacing accession:', e);
        } finally {
            setLoading(false);
        }

		return ReplaceAccessionResult.Error;
    }, [trialId, setLoading, mutatePlot]);

    return { replaceAccession };
};