import React from 'react';

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
