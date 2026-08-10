import React from 'react';

export interface CSVDownloadOpts {
    accession: boolean;
    obsUnit: boolean;
    seedlot: boolean;
    plotId: boolean;
    plotNum: boolean;
    familyName: boolean;
    crossName: boolean;
}

interface DownloadCSVModalProps {
    show: boolean;
    onClose: () => void;
    csvDownloadOpts: CSVDownloadOpts;
    setCsvDownloadOpts: React.Dispatch<React.SetStateAction<CSVDownloadOpts>>;
    onDownload: () => void;
}

export const DownloadCSVModal: React.FC<DownloadCSVModalProps> = ({
    show,
    onClose,
    csvDownloadOpts,
    setCsvDownloadOpts,
    onDownload
}) => {
    if (!show) return null;
    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={onClose}>&times;</button>
                        <h4 className="modal-title">Download Spatial Layout Customizer</h4>
                    </div>
                    <div className="modal-body">
                        <div className="checkbox">
                            <label><input type="checkbox" checked={csvDownloadOpts.accession} onChange={e => setCsvDownloadOpts({ ...csvDownloadOpts, accession: e.target.checked })} /> Accession Name</label>
                        </div>
                        <div className="checkbox">
                            <label><input type="checkbox" checked={csvDownloadOpts.obsUnit} onChange={e => setCsvDownloadOpts({ ...csvDownloadOpts, obsUnit: e.target.checked })} /> Plot Name</label>
                        </div>
                        <div className="checkbox">
                            <label><input type="checkbox" checked={csvDownloadOpts.seedlot} onChange={e => setCsvDownloadOpts({ ...csvDownloadOpts, seedlot: e.target.checked })} /> Seedlot Name</label>
                        </div>
                        <div className="checkbox">
                            <label><input type="checkbox" checked={csvDownloadOpts.plotId} onChange={e => setCsvDownloadOpts({ ...csvDownloadOpts, plotId: e.target.checked })} /> Plot ID</label>
                        </div>
                        <div className="checkbox">
                            <label><input type="checkbox" checked={csvDownloadOpts.plotNum} onChange={e => setCsvDownloadOpts({ ...csvDownloadOpts, plotNum: e.target.checked })} /> Plot Number</label>
                        </div>
                        <div className="checkbox">
                            <label><input type="checkbox" checked={csvDownloadOpts.familyName} onChange={e => setCsvDownloadOpts({ ...csvDownloadOpts, familyName: e.target.checked })} /> Family</label>
                        </div>
                        <div className="checkbox">
                            <label><input type="checkbox" checked={csvDownloadOpts.crossName} onChange={e => setCsvDownloadOpts({ ...csvDownloadOpts, crossName: e.target.checked })} /> Cross</label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-default" onClick={onClose}>Close</button>
                        <button className="btn btn-primary" onClick={onDownload}>Download CSV</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
