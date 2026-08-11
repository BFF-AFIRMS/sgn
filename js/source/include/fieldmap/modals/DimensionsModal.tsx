import React, { useState } from 'react';
import { AccessionAutocomplete } from '../components/AccessionAutocomplete';
import { useModals } from '../contexts/ModalsContext';
import { usePlotGrid } from '../contexts/PlotGridContext';

interface DimensionsModalProps {
}

export const DimensionsModal: React.FC<DimensionsModalProps> = ({}) => {
    const {
        showDimDialog: show,
        setShowDimDialog: setShow,
    } = useModals();

    const [dimRowsInput, setDimRowsInput] = useState('');
    const [dimColsInput, setDimColsInput] = useState('');
    const [fillerAccessionInput, setFillerAccessionInput] = useState('');

    const {
        applyDimensions
    } = usePlotGrid();

    if (!show) return null;

    const handleApplyDimensions = async () => {
        await applyDimensions(dimRowsInput, dimColsInput, fillerAccessionInput);
        setShow(false);
    };

    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={() => setShow(false)}>&times;</button>
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
                        <button className="btn btn-default" onClick={() => setShow(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleApplyDimensions}>Apply</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
