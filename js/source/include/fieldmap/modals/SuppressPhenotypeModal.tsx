import React, { useMemo } from 'react';
import { useModals } from '../contexts/ModalsContext';
import { useView } from '../contexts/ViewContext';
import { useHeatmap } from '../contexts/HeatmapContext';
import { useSubmitSuppressPhenotype } from '../hooks/useSubmitSuppressPhenotype';

interface SuppressPhenotypeModalProps {
}

export const SuppressPhenotypeModal: React.FC<SuppressPhenotypeModalProps> = ({
}) => {
    const {
        showSuppressModal: show,
        setShowSuppressModal: setShow,
        setShowPlotDetails
    } = useModals();

    if (!show) return null;

    const {
        selectedPlot,
    } = useView();

    const {
        heatmapData
    } = useHeatmap();

    const {
        submitSuppressPhenotype
    } = useSubmitSuppressPhenotype();

    const plotName = useMemo(() => {
        return selectedPlot?.observationUnitName || '';
    }, [selectedPlot]);

    const phenotypeValue = useMemo(() => {
        return selectedPlot ? heatmapData[selectedPlot.observationUnitDbId || '']?.val : undefined;
    }, [selectedPlot, heatmapData]);

    const handleSuppressPhenotype = async () => {
        const ok = await submitSuppressPhenotype();
        if (ok) {
            setShow(false);
            setShowPlotDetails(false);
        }
    }

    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={() => setShow(false)}>&times;</button>
                        <h4 className="modal-title">Suppress Plot Phenotype Measurement</h4>
                    </div>
                    <div className="modal-body">
                        <p>Suppressed measurements will be seen as outliers and can be excluded during phenotype analysis.</p>
                        <div><strong>Plot Name:</strong> {plotName}</div>
                        <div><strong>Phenotype Value:</strong> {phenotypeValue}</div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-default" onClick={() => setShow(false)}>Close</button>
                        <button className="btn btn-danger" onClick={handleSuppressPhenotype}>Suppress Phenotype</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
