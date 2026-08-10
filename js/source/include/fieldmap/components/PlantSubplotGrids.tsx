import React from 'react';
import { PlotStructureNode } from '../model.types';

export const RenderPlantGrid: React.FC<{ node: PlotStructureNode }> = ({ node }) => {
    if (!node.has) return null;
    
    let maxRow = 1;
    let maxCol = 1;
    const coordMap: Record<string, string> = {};
    
    Object.entries(node.has).forEach(([plantName, plantNode]) => {
        const row = parseInt(plantNode.attributes?.row_number?.value) || 0;
        const col = parseInt(plantNode.attributes?.col_number?.value) || 0;
        if (row > maxRow) maxRow = row;
        if (col > maxCol) maxCol = col;
        coordMap[`${row},${col}`] = plantName;
    });
    
    const rows = [];
    for (let r = maxRow; r >= 0; r--) {
        const cols = [];
        for (let c = 0; c <= maxCol; c++) {
            if (r === 0) {
                if (c === 0) {
                    cols.push(<th key="empty" className="tw:border-0"></th>);
                } else {
                    cols.push(<th key={`col-header-${c}`} className="tw:border-0 tw:text-center tw:align-middle tw:p-1 tw:text-xs">{c}</th>);
                }
            } else {
                if (c === 0) {
                    cols.push(<th key={`row-header-${r}`} className="tw:border-0 tw:text-left tw:align-middle tw:pr-2 tw:text-xs">{r}</th>);
                } else {
                    const key = `${r},${c}`;
                    const plantName = coordMap[key];
                    cols.push(
                        <td key={key} className="tw:border tw:border-black tw:p-1 tw:rounded tw:text-center tw:align-middle tw:text-[11px] tw:min-w-15 tw:h-8">
                            {plantName || <span className="tw:text-gray-300">empty</span>}
                        </td>
                    );
                }
            }
        }
        rows.push(<tr key={`row-${r}`}>{cols}</tr>);
    }
    
    return (
        <table className="tw:border-separate tw:border-spacing-1 tw:overflow-hidden tw:mx-auto tw:mt-2" style={{ aspectRatio: `${maxCol + 1} / ${maxRow + 1}` }}>
            <tbody>{rows}</tbody>
        </table>
    );
};

export const RenderSubplotGrid: React.FC<{ node: PlotStructureNode }> = ({ node }) => {
    if (!node.has) return null;
    
    return (
        <div className="tw:flex tw:flex-col tw:gap-2.5 tw:items-center tw:mt-2">
            {Object.entries(node.has).sort(([a], [b]) => a.localeCompare(b)).map(([subplotName, subplotNode]) => (
                <div key={subplotName} className="tw:border tw:border-gray-400 tw:p-2.5 tw:rounded-lg tw:text-center tw:align-middle tw:w-full">
                    <div className="tw:font-bold tw:mb-1 tw:text-sm">{subplotName}</div>
                    <RenderPlantGrid node={subplotNode} />
                </div>
            ))}
        </div>
    );
};
