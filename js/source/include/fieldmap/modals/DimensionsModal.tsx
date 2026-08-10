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
