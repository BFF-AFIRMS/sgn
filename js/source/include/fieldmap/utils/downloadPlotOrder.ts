import { LayoutConfigContextType } from '../contexts/LayoutConfigContext';
import { DownloadOpts } from '../model.types';

type BorderConfig = Pick<LayoutConfigContextType, 'topBorder' | 'rightBorder' | 'bottomBorder' | 'leftBorder'>;

export const downloadPlotOrder = (downloadOpts: DownloadOpts, activeTrialIds: string[], { topBorder, rightBorder, bottomBorder, leftBorder }: BorderConfig) => {
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
};