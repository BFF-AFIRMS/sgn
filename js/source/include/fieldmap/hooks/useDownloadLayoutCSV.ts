import { useCallback } from 'react';
import { useLayoutConfig } from '../contexts/LayoutConfigContext';
import { usePlotGrid } from '../contexts/PlotGridContext';
import { useView } from '../contexts/ViewContext';
import { CsvDownloadOpts } from '../types';

export const useDownloadLayoutCSV = () => {
	const {
		trialId
	} = useView();

	const {
		bounds,
		plotList,
		axisOrientation,
	} = usePlotGrid();

	const {
		invertCols,
		invertRows,
		leftBorder,
		rightBorder,
		topBorder,
		bottomBorder,
		borderLabel,
	} = useLayoutConfig();

	const downloadLayoutCSV = useCallback((
		csvDownloadOpts: CsvDownloadOpts
	) => {
		let cols_csv_header = [];

		const effectiveTopBorder = invertRows ? bottomBorder : topBorder;
		const effectiveBottomBorder = invertRows ? topBorder : bottomBorder;
		const effectiveLeftBorder = invertCols ? rightBorder : leftBorder;
		const effectiveRightBorder = invertCols ? leftBorder : rightBorder;

		const forwardCols = invertCols == axisOrientation.x.reversed;
		const startCol = forwardCols ? bounds.minCol - (effectiveLeftBorder ? 1 : 0): bounds.maxCol + (effectiveLeftBorder ? 1 : 0);
		const endCol = forwardCols ? bounds.maxCol + (effectiveRightBorder ? 1 : 0): bounds.minCol - (effectiveRightBorder ? 1 : 0);
		for (let i = startCol; forwardCols ? i <= endCol : i >= endCol; forwardCols ? i++ : i--) {
			// Do not give a headerLabel to border columns, to match the fieldmap display
			const headerVal = (i < bounds.minCol || i > bounds.maxCol) ? '' : `${i}`;
			cols_csv_header.push(headerVal);
		}
		let csv = '';

		let coord_matrix: string[][] = [];
		const sortedPlots = [...plotList].filter(p => p.type !== 'border');
		const borderCell = borderLabel === 'empty' ? `""` : `"${borderLabel}"`;

		sortedPlots.forEach(plot => {
			const r = Number(plot.observationUnitPosition.positionCoordinateY) - bounds.minRow;
			const c = Number(plot.observationUnitPosition.positionCoordinateX) - bounds.minCol;

			if (!coord_matrix[r]) coord_matrix[r] = [];

			let cellVal = '';
			if (csvDownloadOpts.accession) {
				cellVal += plot.germplasmName || plot.crossName || '';
				if (plot.additionalInfo?.intercropGermplasm) {
					plot.additionalInfo.intercropGermplasm.forEach((g: any) => {
						cellVal += `, ${g.germplasmName}`;
					});
				}
			}
			if (csvDownloadOpts.obsUnit && plot.observationUnitName) {
				cellVal += (cellVal ? '\n' : '') + plot.observationUnitName;
			}
			if (csvDownloadOpts.plotId && plot.observationUnitDbId) {
				cellVal += (cellVal ? '\n' : '') + plot.observationUnitDbId;
			}
			if (csvDownloadOpts.plotNum && plot.observationUnitPosition.observationLevel?.levelCode) {
				cellVal += (cellVal ? '\n' : '') + plot.observationUnitPosition.observationLevel.levelCode;
			}
			if (csvDownloadOpts.familyName && plot.additionalInfo?.familyName) {
				cellVal += (cellVal ? '\n' : '') + plot.additionalInfo?.familyName;
			}
			if (csvDownloadOpts.crossName && plot.crossName) {
				cellVal += (cellVal ? '\n' : '') + plot.crossName;
			}

			coord_matrix[r][c] = `"${cellVal}"`;
		});

		if (!invertRows) {
			coord_matrix.reverse();
		}

		coord_matrix.forEach((rowArr, idx) => {
			if (!rowArr) rowArr = Array(bounds.numCols).fill('""');
			for (let i = 0; i < bounds.numCols; i++) {
				if (rowArr[i] === undefined) rowArr[i] = '""';
			}
			if (invertCols) {
				rowArr.reverse();
			}

			// Add left and right borders
			if (effectiveLeftBorder) rowArr.unshift(borderCell);
			if (effectiveRightBorder) rowArr.push(borderCell);
			let rowNumber = invertRows !== axisOrientation.y.reversed ? bounds.minRow + idx : bounds.maxRow - idx;
			csv += [rowNumber, ...rowArr].join(',') + '\n';
		});

		// Add top and bottom borders
		let borderArray = Array.from({length: bounds.numCols}, () => borderCell);
		if (effectiveLeftBorder) borderArray.unshift(borderCell);
		if (effectiveRightBorder) borderArray.push(borderCell);
		// Do not give a rowLabel to border rows, to match the fieldmap display
		borderArray.unshift('');
		if (effectiveTopBorder) csv = borderArray.join(',') + '\n' + csv;
		if (effectiveBottomBorder) csv += borderArray.join(',') + '\n';

		// Write header
		csv = ['Rows/Columns', ...cols_csv_header].join(',') + '\n' + csv;

		const hiddenElement = document.createElement('a');
		hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
		hiddenElement.target = '_blank';
		hiddenElement.download = `Trial_${trialId}_spatial_layout.csv`;
		hiddenElement.click();
	}, [bounds, plotList, invertCols, invertRows, trialId, axisOrientation, leftBorder, rightBorder, topBorder, bottomBorder, borderLabel]);
	return { downloadLayoutCSV };
};