import React, { useMemo } from 'react';
import { GeneratedDesignPlot, StockType, DesignType } from '../../types';

interface TrialDesignLayoutTableProps {
    plots: GeneratedDesignPlot[];
    stockType: StockType;
    designType: DesignType;
}

export const TrialDesignLayoutTable: React.FC<TrialDesignLayoutTableProps> = ({
    plots,
    stockType,
    designType
}) => {
    const isGreenhouse = designType === 'greenhouse';
    const isSplitplot = designType === 'splitplot';

    const stockColumnTitle = useMemo(() => {
        if (stockType === 'family_name') return 'Family Name';
        if (stockType === 'cross') return 'Cross Unique ID';
        return 'Accession Name';
    }, [stockType]);

    const sortedPlots = useMemo(() => {
        return [...plots].sort((a, b) => {
            const numA = parseInt(String(a.plot_number || 0), 10);
            const numB = parseInt(String(b.plot_number || 0), 10);
            return isNaN(numA) || isNaN(numB)
                ? String(a.plot_name).localeCompare(String(b.plot_name))
                : numA - numB;
        });
    }, [plots]);

    return (
        <table className="table table-bordered table-hover">
            <thead>
                <tr>
                    {(isGreenhouse || isSplitplot) && <th>Plant Name</th>}
                    {isSplitplot && <th>Subplot Name</th>}
                    <th>Plot Name</th>
                    <th>{stockColumnTitle}</th>
                    <th>Check Name</th>
                    <th>Plot Number</th>
                    <th>Row number</th>
                    <th>Col number</th>
                    <th>Block Number</th>
                    <th>Block Row Number</th>
                    <th>Block Col Number</th>
                    <th>Rep Number</th>
                    <th>Seedlot Name</th>
                    <th>Num Seeds Per Plot</th>
                </tr>
            </thead>
            <tbody>
                {sortedPlots.map(plot => {
                    const plotNum = plot.plot_number ?? '';
                    const plotName = plot.plot_name ?? '';
                    const stockName = plot.stock_name ?? '';
                    const checkName = plot.is_a_control ? 1 : '';
                    const rowNum = plot.row_number ?? '';
                    const colNum = plot.col_number ?? '';
                    const blockNum = plot.block_number ?? '';
                    const blockRowNum = plot.block_row_number ?? '';
                    const blockColNum = plot.block_col_number ?? '';
                    const repNum = plot.rep_number ?? '';
                    const seedlotName = plot.seedlot_name ?? '';
                    const numSeeds = plot.num_seed_per_plot ?? '';

                    if (plot.subplots_plant_names && typeof plot.subplots_plant_names === 'object') {
                        const subplotEntries = Object.entries(plot.subplots_plant_names);
                        return subplotEntries.flatMap(([subplotName, plantNames]) => {
                            const plants = Array.isArray(plantNames) ? plantNames : [];
                            return plants.map(plantName => (
                                <tr key={`${plotNum}-${subplotName}-${plantName}`}>
                                    <td>{plantName}</td>
                                    <td>{subplotName}</td>
                                    <td>{plotName}</td>
                                    <td>{stockName}</td>
                                    <td>{checkName}</td>
                                    <td>{plotNum}</td>
                                    <td>{rowNum}</td>
                                    <td>{colNum}</td>
                                    <td>{blockNum}</td>
                                    <td>{blockRowNum}</td>
                                    <td>{blockColNum}</td>
                                    <td>{repNum}</td>
                                    <td>{seedlotName}</td>
                                    <td>{numSeeds}</td>
                                </tr>
                            ));
                        });
                    }

                    return (
                        <tr key={String(plotNum || plotName)}>
                            {(isGreenhouse || isSplitplot) && <td></td>}
                            {isSplitplot && <td></td>}
                            <td>{plotName}</td>
                            <td>{stockName}</td>
                            <td>{checkName}</td>
                            <td>{plotNum}</td>
                            <td>{rowNum}</td>
                            <td>{colNum}</td>
                            <td>{blockNum}</td>
                            <td>{blockRowNum}</td>
                            <td>{blockColNum}</td>
                            <td>{repNum}</td>
                            <td>{seedlotName}</td>
                            <td>{numSeeds}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};
