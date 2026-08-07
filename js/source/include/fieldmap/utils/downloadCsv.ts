import { Plot } from '../types';

export interface CSVDownloadOpts {
    accession: boolean;
    obsUnit: boolean;
    seedlot: boolean;
    plotId: boolean;
    plotNum: boolean;
    familyName: boolean;
    crossName: boolean;
}

export const downloadLayoutCSV = (
    trialId: string,
    bounds: { minCol: number; maxCol: number; minRow: number; maxRow: number; numCols: number },
    plotList: Plot[],
    invertCols: boolean,
    invertRows: boolean,
    csvDownloadOpts: CSVDownloadOpts
) => {
    let cols_csv_header = [];
    for (let i = bounds.minCol; i <= bounds.maxCol; i++) {
        cols_csv_header.push(i);
    }
    if (invertCols) {
        cols_csv_header.reverse();
    }
    let csv = '';
    csv += ['Rows/Columns', ...cols_csv_header].join(',') + '\n';

    let coord_matrix: string[][] = [];
    const sortedPlots = [...plotList].filter(p => p.type !== 'border');

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

        const rowLabel = invertRows ? bounds.minRow + idx : bounds.maxRow - idx;
        csv += [rowLabel, ...rowArr].join(',') + '\n';
    });

    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = `Trial_${trialId}_spatial_layout.csv`;
    hiddenElement.click();
};
