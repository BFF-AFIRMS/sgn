import React from 'react';
import { AccessionAutocomplete } from '../components/AccessionAutocomplete';

interface DimensionsModalProps {
    show: boolean;
    onClose: () => void;
    dimRowsInput: string;
    setDimRowsInput: (v: string) => void;
    dimColsInput: string;
    setDimColsInput: (v: string) => void;
    fillerAccessionInput: string;
    setFillerAccessionInput: (v: string) => void;
    onApply: () => void;
}

export const DimensionsModal: React.FC<DimensionsModalProps> = ({
    show,
    onClose,
    dimRowsInput,
    setDimRowsInput,
    dimColsInput,
    setDimColsInput,
    fillerAccessionInput,
    setFillerAccessionInput,
    onApply
}) => {
    if (!show) return null;
    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={onClose}>&times;</button>
                        <h4 className="modal-title">Change Layout Dimensions</h4>
                    </div>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Rows:</label>
                            <input type="number" className="form-control" value={dimRowsInput} onChange={e => setDimRowsInput(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Columns:</label>
                            <input type="number" className="form-control" value={dimColsInput} onChange={e => setDimColsInput(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Filler Accession (Optional):</label>
                            <AccessionAutocomplete value={fillerAccessionInput} onChange={setFillerAccessionInput} className="form-control" />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-default" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={onApply}>Apply</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface DownloadCSVModalProps {
    show: boolean;
    onClose: () => void;
    csvDownloadOpts: {
        accession: boolean;
        obsUnit: boolean;
        seedlot: boolean;
        plotId: boolean;
        plotNum: boolean;
        familyName: boolean;
        crossName: boolean;
    };
    setCsvDownloadOpts: (opts: any) => void;
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

interface SuppressPhenotypeModalProps {
    show: boolean;
    onClose: () => void;
    plotName: string;
    phenotypeValue: number | string | undefined;
    onSuppress: () => void;
}

export const SuppressPhenotypeModal: React.FC<SuppressPhenotypeModalProps> = ({
    show,
    onClose,
    plotName,
    phenotypeValue,
    onSuppress
}) => {
    if (!show) return null;
    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={onClose}>&times;</button>
                        <h4 className="modal-title">Suppress Plot Phenotype Measurement</h4>
                    </div>
                    <div className="modal-body">
                        <p>Suppressed measurements will be seen as outliers and can be excluded during phenotype analysis.</p>
                        <div><strong>Plot Name:</strong> {plotName}</div>
                        <div><strong>Phenotype Value:</strong> {phenotypeValue}</div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-default" onClick={onClose}>Close</button>
                        <button className="btn btn-danger" onClick={onSuppress}>Suppress Phenotype</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface DeleteTraitModalProps {
    show: boolean;
    onClose: () => void;
    onDelete: () => void;
}

export const DeleteTraitModal: React.FC<DeleteTraitModalProps> = ({
    show,
    onClose,
    onDelete
}) => {
    if (!show) return null;
    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header text-center">
                        <button type="button" className="close" onClick={onClose}>&times;</button>
                        <h4 className="modal-title">Assayed Trait Deletion</h4>
                    </div>
                    <div className="modal-body">
                        <p className="font-bold">Are you sure you want to delete this assayed trait?</p>
                        <p>All phenotyping data values linked with this trait in this trial will be removed permanently.</p>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-default" onClick={onClose}>Close</button>
                        <button className="btn btn-danger" onClick={onDelete}>Delete Trait</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface CuratorWarningModalProps {
    show: boolean;
    onClose: () => void;
    onOverride: () => void;
}

export const CuratorWarningModal: React.FC<CuratorWarningModalProps> = ({
    show,
    onClose,
    onOverride
}) => {
    if (!show) return null;
    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={onClose}>&times;</button>
                        <h4 className="modal-title">Curator Override Warning</h4>
                    </div>
                    <div className="modal-body">
                        <p>One or more traits have already been assayed for this trial. Are you sure you want to replace this accession?</p>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-default" onClick={onClose}>No</button>
                        <button className="btn btn-primary" onClick={onOverride}>Yes, Override</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
