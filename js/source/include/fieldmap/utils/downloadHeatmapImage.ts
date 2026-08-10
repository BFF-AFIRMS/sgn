export const downloadHeatmapImage = (selectedViewLabel: string) => {
	const svgEl = document.getElementById('fieldmap_chart_svg');
	if (!svgEl) return;

	const svgString = new XMLSerializer().serializeToString(svgEl);
	const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
	const blobURL = URL.createObjectURL(svgBlob);

	const image = new Image();
	image.onload = () => {
		const canvas = document.createElement('canvas');
		canvas.width = svgEl.clientWidth || 1500;
		canvas.height = svgEl.clientHeight || 1500;
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
};