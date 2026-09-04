import { useCallback, useMemo } from 'react';
import { useLayoutConfig } from '../contexts/LayoutConfigContext';
import { useModals } from '../contexts/ModalsContext';
import { usePlotGrid } from '../contexts/PlotGridContext';
import { useView } from '../contexts/ViewContext';
import { buildParams } from '../../functions';

export const useSubmitFieldLayout = () => {
	const {
		setLoading,
	} = useModals();

	const {
		plotList,
		gridMatrix,
		fillerAccessionId,
		fillerAccessionName,
		fetchObservationUnits,
		transformedSecondaryAxis: secondaryAxis
	} = usePlotGrid();

	const {
		invertRows,
		invertCols,
		topBorder,
		leftBorder,
		rightBorder,
		bottomBorder,
		plotLayout,
		colorVar,
		labelVar,
		labelSize,
		northArrowAngle,
		loadNorthArrowAngle,
		loadSecondaryAxis
	} = useLayoutConfig();

	const {
		trialId,
		authToken,
	} = useView();

    const maxLevelCode = useMemo(() => {
        let maxVal = 0;
        plotList.forEach(plot => {
            const code = parseInt(String(plot.observationUnitPosition?.observationLevel?.levelCode));
            if (!isNaN(code) && code > maxVal) {
                maxVal = code;
            }
        });
        return maxVal;
    }, [plotList]);

	const submitFieldLayout = useCallback(async () => {
		const answer = window.confirm('You are about to save this plot layout to the database. Are you sure you would like to continue?');
		if (!answer) return;
		setLoading(true);

		const allPlots = gridMatrix.flat();
		const plotsToCreate = allPlots.filter(plot => !plot.observationUnitDbId && (plot.type === 'filler' || plot.type === 'border'));

		const brapiPostObject = fillerAccessionId ? plotsToCreate
			.map((plot, i) => ({
				additionalInfo: {
					invert_row_checkmark: invertRows,
					invert_col_checkmark: invertCols,
					top_border_selection: topBorder,
					left_border_selection: leftBorder,
					right_border_selection: rightBorder,
					bottom_border_selection: bottomBorder,
					plot_layout: plotLayout,
					plot_color_var: colorVar,
					plot_label_var: labelVar,
					plot_label_size: labelSize
				},
				germplasmDbId: fillerAccessionId,
				germplasmName: fillerAccessionName,
				observationUnitName: `${trialId} filler ${maxLevelCode + i + 1}`,
				observationUnitPosition: {
					observationLevel: { levelCode: maxLevelCode + i + 1, levelName: 'plot', levelOrder: 2 },
					positionCoordinateX: plot.observationUnitPosition.positionCoordinateX,
					positionCoordinateY: plot.observationUnitPosition.positionCoordinateY,
					entryType: plot.type
				},
				trialDbId: trialId,
				studyDbId: trialId
			})) : [];

		const brapiPutObject: Record<string, any> = {};
		allPlots
			.filter(plot => !!plot.observationUnitDbId)
			.forEach(plot => {
				brapiPutObject[plot.observationUnitDbId!] = {
					additionalInfo: {
						invert_row_checkmark: invertRows,
						invert_col_checkmark: invertCols,
						top_border_selection: topBorder,
						left_border_selection: leftBorder,
						right_border_selection: rightBorder,
						bottom_border_selection: bottomBorder,
						plot_layout: plotLayout,
						plot_color_var: colorVar,
						plot_label_var: labelVar,
						plot_label_size: labelSize
					},
					germplasmDbId: plot.germplasmDbId,
					germplasmName: plot.germplasmName,
					observationUnitName: plot.observationUnitName,
					observationUnitPosition: {
						observationLevel: { levelCode: plot.observationUnitPosition.observationLevel.levelCode, levelName: 'plot', levelOrder: 2 },
						positionCoordinateX: plot.observationUnitPosition.positionCoordinateX,
						positionCoordinateY: plot.observationUnitPosition.positionCoordinateY,
						entryType: plot.type === 'data' ? plot.observationUnitPosition.entryType : plot.type
					},
					trialDbId: trialId
				};
			});

		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

		console.log('BRAPI POST OBJECT', brapiPostObject);
		console.log('BRAPI PUT OBJECT', brapiPutObject);

		const putRequest = fetch('/brapi/v2/observationunits', {
			method: 'PUT',
			headers,
			body: JSON.stringify(brapiPutObject)
		});

		const postRequest = brapiPostObject.length > 0
			? fetch('/brapi/v2/observationunits', {
				method: 'POST',
				headers,
				body: JSON.stringify(brapiPostObject)
			})
			: Promise.resolve();

		const northArrowRequest = fetch(`/ajax/breeders/trial/${trialId}/north_arrow_angle`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				north_arrow_angle: String(northArrowAngle)
			})
		});

		const secondaryAxisRequest = fetch(`/ajax/breeders/trial/${trialId}/secondary_axis`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: buildParams({
				secondary_x_axis_label: secondaryAxis?.xLabel || '',
				secondary_y_axis_label: secondaryAxis?.yLabel || '',
				secondary_x_axis_values: secondaryAxis?.xValues?.join(',') || '',
				secondary_y_axis_values: secondaryAxis?.yValues?.join(',') || ''
			})
		});

		try {
			await Promise.all([putRequest, postRequest, northArrowRequest, secondaryAxisRequest]);
			await fetch(`/ajax/breeders/trial/${trialId}/refresh_cache`, { method: 'POST' });

			alert('Field Plot layout submitted successfully!');
			fetchObservationUnits();
			loadNorthArrowAngle();
			loadSecondaryAxis();
		} catch (e) {
			console.error('Error submitting layout metadata:', e);
			alert('Error submitting layout metadata.');
		} finally {
			setLoading(false);
		}
	}, [
		trialId, authToken, gridMatrix, invertRows,
		invertCols, topBorder, leftBorder, rightBorder,
		bottomBorder, plotLayout, colorVar, labelVar,
		labelSize, northArrowAngle, secondaryAxis, maxLevelCode,
		fetchObservationUnits, loadNorthArrowAngle, loadSecondaryAxis, setLoading
	]);

	return { submitFieldLayout };
};