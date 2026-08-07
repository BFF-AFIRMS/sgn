import React from 'react';
import { DownloadOpts } from '../types';

interface DownloadPlotOrderPanelProps {
    hasColAndRowNumbers: boolean;
    hasSubplotEntries: boolean;
    hasPlantEntries: boolean;
    downloadOpts: DownloadOpts;
    setDownloadOpts: React.Dispatch<React.SetStateAction<DownloadOpts>>;
    onDownload: () => void;
}

export const DownloadPlotOrderPanel: React.FC<DownloadPlotOrderPanelProps> = ({
    hasColAndRowNumbers,
    hasSubplotEntries,
    hasPlantEntries,
    downloadOpts,
    setDownloadOpts,
    onDownload
}) => {
    if (!hasColAndRowNumbers) return null;

    return (
        <div className="panel panel-default tw:mt-5">
            <div className="panel-heading">
                <h3 className="panel-title tw:font-bold">Download Plot Order</h3>
            </div>
            <div className="panel-body">
                <div className="tw:flex tw:gap-5 tw:flex-wrap">
                    <div className="form-group tw:min-w-45">
                        <label>File Format:</label>
                        <select
                            className="form-control"
                            value={downloadOpts.type}
                            onChange={e => setDownloadOpts({ ...downloadOpts, type: e.target.value })}
                        >
                            <option value="">--Select Type--</option>
                            <option value="planting">Planting Order</option>
                            <option value="collection">Collection Order</option>
                            <option value="harvest">Harvest Order</option>
                            <option value="harvestmaster">HarvestMaster</option>
                        </select>
                    </div>

                    <div className="form-group tw:min-w-45">
                        <label>Traversal Order:</label>
                        <select
                            className="form-control"
                            value={downloadOpts.order}
                            onChange={e => setDownloadOpts({ ...downloadOpts, order: e.target.value })}
                        >
                            <option value="by_col_serpentine">By Column: Serpentine</option>
                            <option value="by_col_zigzag">By Column: Zigzag</option>
                            <option value="by_row_serpentine">By Row: Serpentine</option>
                            <option value="by_row_zigzag">By Row: Zigzag</option>
                        </select>
                    </div>

                    <div className="form-group tw:min-w-45">
                        <label>Starting Corner:</label>
                        <select
                            className="form-control"
                            value={downloadOpts.start}
                            onChange={e => setDownloadOpts({ ...downloadOpts, start: e.target.value })}
                        >
                            <option value="bottom_left">Bottom Left</option>
                            <option value="top_left">Top Left</option>
                            <option value="top_right">Top Right</option>
                            <option value="bottom_right">Bottom Right</option>
                        </select>
                    </div>
                </div>

                {downloadOpts.type === 'harvestmaster' && (
                    <div className="well well-sm tw:mt-2.5">
                        <strong>HarvestMaster Mapping Config:</strong>
                        <div className="tw:flex tw:gap-3.75 tw:flex-wrap tw:mt-2.5">
                            <div className="form-group">
                                <label>PLTID:</label>
                                <select className="form-control" value={downloadOpts.hmPltid} onChange={e => setDownloadOpts({ ...downloadOpts, hmPltid: e.target.value })}>
                                    <option value="plot_id">Plot Database ID</option>
                                    <option value="plot_name">Plot Name</option>
                                    <option value="plot_number">Plot Number</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Range Mapping:</label>
                                <select className="form-control" value={downloadOpts.hmRange} onChange={e => setDownloadOpts({ ...downloadOpts, hmRange: e.target.value })}>
                                    <option value="col_number">Breedbase Column</option>
                                    <option value="row_number">Breedbase Row</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Row Mapping:</label>
                                <select className="form-control" value={downloadOpts.hmRow} onChange={e => setDownloadOpts({ ...downloadOpts, hmRow: e.target.value })}>
                                    <option value="col_number">Breedbase Column</option>
                                    <option value="row_number">Breedbase Row</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                <div className="tw:flex tw:gap-3.75 tw:my-3.75">
                    <label><input type="checkbox" checked={downloadOpts.borders} onChange={e => setDownloadOpts({ ...downloadOpts, borders: e.target.checked })} /> Include Borders</label>
                    <label><input type="checkbox" checked={downloadOpts.gaps} onChange={e => setDownloadOpts({ ...downloadOpts, gaps: e.target.checked })} /> Include Gaps</label>
                    {hasSubplotEntries && <label><input type="checkbox" checked={downloadOpts.subplots} onChange={e => setDownloadOpts({ ...downloadOpts, subplots: e.target.checked })} /> Include Subplots</label>}
                    {hasPlantEntries && <label><input type="checkbox" checked={downloadOpts.plants} onChange={e => setDownloadOpts({ ...downloadOpts, plants: e.target.checked })} /> Include Plants</label>}
                </div>

                <button className="btn btn-primary" onClick={onDownload}>Generate & Download File</button>
            </div>
        </div>
    );
};
