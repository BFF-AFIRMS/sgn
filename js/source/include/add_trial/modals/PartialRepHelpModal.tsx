import React from 'react';

interface PartialRepHelpModalProps {
    show: boolean;
    onClose: () => void;
}

export const PartialRepHelpModal: React.FC<PartialRepHelpModalProps> = ({ show, onClose }) => {
    if (!show) return null;

    return (
        <div id="partial_rep_help_dialog" className="modal show tw:block tw:bg-black/50" tabIndex={-1}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={onClose}>&times;</button>
                        <h4 className="modal-title tw:font-bold">Partially Replicated Design Usage Help</h4>
                    </div>
                    <div className="modal-body tw:space-y-4">
                        <p>
                            Partially replicated designs have some treatments that are unreplicated and rely on replicated treatments to make the trial analysable (Cullis et al., 2006). It is recommended that at least 20% of the experimental units are occupied by replicated treatments.
                        </p>
                        <h5 className="tw:font-bold">Design Parameters:</h5>
                        <ul className="tw:list-disc tw:pl-5 tw:space-y-1">
                            <li><strong>Unreplicated Accessions:</strong> List of accessions evaluated once.</li>
                            <li><strong>Replicated Accessions:</strong> List of accessions evaluated multiple times.</li>
                            <li><strong>Rows & Columns:</strong> Total rows and columns in the field layout. Total plots = Rows × Columns.</li>
                            <li><strong>Replication Factor:</strong> Number of times replicated entries are repeated.</li>
                            <li><strong>Block & Sub-block Sequences:</strong> Structural dimensions of blocks (e.g. 13, 2).</li>
                        </ul>
                        <div className="alert alert-info">
                            <strong>Requirement:</strong> (Unreplicated entries + Replicated entries × Replication factor) must equal total plots (Rows × Columns).
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button id="partial_rep_usage_dialog_ok_button" className="btn btn-default" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
