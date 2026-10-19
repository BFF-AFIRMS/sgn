import { useCallback } from 'react';
import { useLayoutConfig } from '../contexts/LayoutConfigContext';
import { useView } from '../contexts/ViewContext';
import { DownloadOpts } from '../types';

export const useDownloadPlotOrder = () => {
	const {
		activeTrialIds
	} = useView();

	const {
		topBorder,
		rightBorder,
		bottomBorder,
		leftBorder,
		invertRows,
		invertCols,
	} = useLayoutConfig();

	const downloadPlotOrder = useCallback((downloadOpts: DownloadOpts) => {

		const effectiveTopBorder = invertRows ? bottomBorder : topBorder;
		const effectiveBottomBorder = invertRows ? topBorder : bottomBorder;
		const effectiveLeftBorder = invertCols ? rightBorder : leftBorder;
		const effectiveRightBorder = invertCols ? leftBorder : rightBorder;

		let startV = downloadOpts.start.split("_")[0];
		let startH = downloadOpts.start.split("_")[1];
		startV = (startV === 'top') ? (invertRows ? 'bottom' : startV) : (invertRows ? 'top' : startV);
		startH = (startH === 'left') ? (invertCols ? 'right' : startH) : (invertCols ? 'left' : startH);
		const effectiveStart = `${startV}_${startH}`;

		const q = new URLSearchParams({
			trial_ids: activeTrialIds.join(','),
			type: downloadOpts.type,
			order: downloadOpts.order,
			start: effectiveStart,
			top_border: String(downloadOpts.borders && effectiveTopBorder),
			right_border: String(downloadOpts.borders && effectiveRightBorder),
			bottom_border: String(downloadOpts.borders && effectiveBottomBorder),
			left_border: String(downloadOpts.borders && effectiveLeftBorder),
			gaps: String(downloadOpts.gaps),
			subplots: String(downloadOpts.subplots),
			plants: String(downloadOpts.plants),
			hm_pltid: downloadOpts.hmPltid,
			hm_range: downloadOpts.hmRange,
			hm_row: downloadOpts.hmRow
		}).toString();
		window.open(`/ajax/breeders/trial_plot_order?${q}`, '_blank');
	}, [activeTrialIds, topBorder, rightBorder, bottomBorder, leftBorder, invertRows, invertCols]);

	return { downloadPlotOrder };
};