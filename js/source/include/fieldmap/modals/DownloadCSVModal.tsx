import React, { useState } from 'react';
import { useModals } from '../contexts/ModalsContext';
import { CsvDownloadOpts } from '../types';
import { useDownloadLayoutCSV } from '../hooks/useDownloadLayoutCSV';

interface DownloadCSVModalProps {
}

export const DownloadCSVModal: React.FC<DownloadCSVModalProps> = ({ }) => {
    const {
        showDownloadCSVModal: show,
        setShowDownloadCSVModal: setShow
    } = useModals();

    const [csvDownloadOpts, setCsvDownloadOpts] = useState<CsvDownloadOpts>({
        accession: true,
        obsUnit: false,
        seedlot: false,
        plotId: false,
        plotNum: false,
        familyName: false,
        crossName: false,
    });

    const {
        downloadLayoutCSV
    } = useDownloadLayoutCSV();

    const handleDownload = () => {
        downloadLayoutCSV(csvDownloadOpts);
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={() => setShow(false)}>&times;</button>
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
                        <button className="btn btn-default" onClick={() => setShow(false)}>Close</button>
                        <button className="btn btn-primary" onClick={handleDownload}>Download CSV</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
