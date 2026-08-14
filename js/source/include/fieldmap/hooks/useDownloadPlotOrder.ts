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
		leftBorder
	} = useLayoutConfig();

	const downloadPlotOrder = useCallback((downloadOpts: DownloadOpts) => {
		const q = new URLSearchParams({
			trial_ids: activeTrialIds.join(','),
			type: downloadOpts.type,
			order: downloadOpts.order,
			start: downloadOpts.start,
			top_border: String(downloadOpts.borders && topBorder),
			right_border: String(downloadOpts.borders && rightBorder),
			bottom_border: String(downloadOpts.borders && bottomBorder),
			left_border: String(downloadOpts.borders && leftBorder),
			gaps: String(downloadOpts.gaps),
			subplots: String(downloadOpts.subplots),
			plants: String(downloadOpts.plants),
			hm_pltid: downloadOpts.hmPltid,
			hm_range: downloadOpts.hmRange,
			hm_row: downloadOpts.hmRow
		}).toString();
		window.open(`/ajax/breeders/trial_plot_order?${q}`, '_blank');
	}, [activeTrialIds, topBorder, rightBorder, bottomBorder, leftBorder]);

	return { downloadPlotOrder };
};