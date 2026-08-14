import { useCallback } from 'react';
import { useView } from '../contexts/ViewContext';
import { usePlotGrid } from '../contexts/PlotGridContext';

export const useDownloadHeatmapImage = () => {
	const {
		selectedViewLabel
	} = useView();

	const {
		svgDimensions: { width: svgWidth, height: svgHeight },
	} = usePlotGrid();

	const downloadHeatmapImage = useCallback(() => {
		// Create a clone of the SVG element so we can manipulate it without affecting the original
		const svgEl = document.getElementById('fieldmap_chart_svg')
			?.cloneNode(true) as SVGSVGElement | null;
		if (!svgEl) return;

		svgEl.setAttribute('style', '');

		const svgString = new XMLSerializer().serializeToString(svgEl);
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const blobURL = URL.createObjectURL(svgBlob);

		const image = new Image();
		image.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = svgWidth;
			canvas.height = svgHeight;
			const context = canvas.getContext('2d');
			if (context) {
				context.fillStyle = '#ffffff';
				context.fillRect(0, 0, canvas.width, canvas.height);
				context.drawImage(image, 0, 0);

				const pngData = canvas.toDataURL('image/png');
				const downloadLink = document.createElement('a');
				downloadLink.download = `${selectedViewLabel || 'fieldmap'}_heatmap.png`;
				downloadLink.href = pngData;
				downloadLink.click();
			}
		};
		image.src = blobURL;
	}, [selectedViewLabel]);

	return { downloadHeatmapImage };
};