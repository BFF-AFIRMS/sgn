import React from 'react';

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
