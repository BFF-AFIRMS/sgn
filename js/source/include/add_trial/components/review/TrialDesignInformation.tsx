import React, { useMemo } from 'react';
import { TrialFormData, GeneratedDesignPlot, getDesignTypeDescription } from '../../types';

interface TrialDesignInformationProps {
    formData: TrialFormData;
    plots: GeneratedDesignPlot[];
    confirmedTreatments: Array<{ name: string; type?: string; stocks: string[] }>;
}

export const TrialDesignInformation: React.FC<TrialDesignInformationProps> = ({
    formData,
    plots,
    confirmedTreatments
}) => {
    const designDescription = getDesignTypeDescription(formData.designType);

    const stockLabelPlural = useMemo(() => {
        if (formData.stockType === 'cross') return 'cross unique ids';
        if (formData.stockType === 'family_name') return 'family names';
        return 'accessions';
    }, [formData.stockType]);

    const numLocations = formData.locations.length || 1;

    const { uniqueStocks, uniqueChecks, blockCounts, numReps } = useMemo(() => {
        const stocks = new Set<string>();
        const checks = new Set<string>();
        const blocks: Record<string, number> = {};
        const reps = new Set<string>();

        plots.forEach(p => {
            if (p.is_a_control) {
                if (p.stock_name) checks.add(p.stock_name);
            } else {
                if (p.stock_name) stocks.add(p.stock_name);
            }

            if (p.block_number !== undefined && p.block_number !== '') {
                const b = String(p.block_number);
                blocks[b] = (blocks[b] || 0) + 1;
            }

            if (p.rep_number !== undefined && p.rep_number !== '') {
                reps.add(String(p.rep_number));
            }
        });

        return {
            uniqueStocks: stocks.size || plots.length,
            uniqueChecks: checks.size,
            blockCounts: blocks,
            numReps: reps.size
        };
    }, [plots]);

    const numBlocks = Object.keys(blockCounts).length;

    return (
        <div id="trial_design_information">
            <dl>
                <dt>Design type</dt>
                <dd>{designDescription}</dd>

                <dt>Number of locations</dt>
                <dd>{numLocations}</dd>

                <dt>Number of {stockLabelPlural}</dt>
                <dd>{uniqueStocks}</dd>

                {uniqueChecks > 0 && (
                    <>
                        <dt>Number of checks</dt>
                        <dd>{uniqueChecks}</dd>
                    </>
                )}

                {numBlocks > 0 && (
                    <>
                        <dt>Number of blocks</dt>
                        <dd>{numBlocks}</dd>

                        <dt>Number of {stockLabelPlural} per block</dt>
                        <dd>
                            {Object.entries(blockCounts)
                                .sort(([a], [b]) => Number(a) - Number(b))
                                .map(([blockNum, count]) => (
                                    <span key={blockNum} className="tw:block">
                                        Block {blockNum}: {count} {stockLabelPlural}
                                    </span>
                                ))}
                        </dd>
                    </>
                )}

                {numReps > 0 && (
                    <>
                        <dt>Number of reps</dt>
                        <dd>{numReps}</dd>
                    </>
                )}

                <dt>Treatments:</dt>
                <dd>
                    <div id="trial_design_confirm_treatments">
                        {confirmedTreatments.length === 0 ? (
                            <span>None added. Treatments and management regimes can be added on the trial detail page.</span>
                        ) : (
                            <ul className="tw:list-disc tw:pl-5 tw:my-1 tw:space-y-1">
                                {confirmedTreatments.map(t => (
                                    <li key={t.name}>
                                        Treatment: <strong>{t.name}</strong>{t.type && ` (${t.type})`} &mdash; Plots: {t.stocks.join(', ')}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </dd>
            </dl>
        </div>
    );
};
