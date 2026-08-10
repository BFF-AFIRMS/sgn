import React from 'react';

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
