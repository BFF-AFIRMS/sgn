import React, { useMemo, useState } from 'react';
import { Plot, PlotStructureNode } from '../model.types';
import { RenderPlantGrid, RenderSubplotGrid } from '../components/PlantSubplotGrids';
import { AccessionAutocomplete } from '../components/AccessionAutocomplete';
import { useDataFetch } from '../contexts/DataFetchContext';
import { useModals } from '../contexts/ModalsContext';
import { useHeatmap } from '../contexts/HeatmapContext';
import { useView } from '../contexts/ViewContext';

interface PlotDetailsModalProps {
    stockLabel: string;
    plotStructure: PlotStructureNode | null;
    plotImages: string;
}

export const PlotDetailsModal: React.FC<PlotDetailsModalProps> = ({
    stockLabel,
    plotStructure,
    plotImages,
}) => {
    const {
        showPlotDetails: show,
        setShowPlotDetails: setShow,
        showEditAccession,
        setShowEditAccession,
    } = useModals();

    const {
        handleSuppressPhenotype,
        submitReplaceAccession
    } = useDataFetch();

    const {
        selectedPlot,
        selectedView,
    } = useView();

    const { heatmapData } = useHeatmap();

    if (!show || !selectedPlot) return null;

    const [newAccession, setNewAccession] = useState('');
    const [newPlotName, setNewPlotName] = useState('');

    const plotStructureLayoutType = useMemo(() => {
        if (!plotStructure || !plotStructure.has) return 'none';
        const children = Object.values(plotStructure.has) as PlotStructureNode[];
        if (children.length > 0) {
            const firstChild = children[0];
            if (firstChild.type === 'subplot') {
                if (firstChild.has) {
                    const subChildren = Object.values(firstChild.has) as PlotStructureNode[];
                    if (subChildren.length > 0 && subChildren[0].attributes?.row_number?.value > 0) {
                        return 'subplot_grid';
                    }
                }
            } else if (firstChild.type === 'plant' && firstChild.attributes?.row_number?.value > 0) {
                return 'plant_grid';
            }
        }
        return 'tree';
    }, [plotStructure]);

    const hasHeatmapValue = useMemo(() => {
        if (!selectedPlot) return false;
        return !!heatmapData[selectedPlot.observationUnitDbId || ''];
    }, [selectedPlot, heatmapData]);

    return <>
        <CuratorWarningModal newAccession={newAccession} newPlotName={newPlotName} />
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={() => setShow(false)}>&times;</button>
                        <h4 className="modal-title">Plot Details: {selectedPlot.observationUnitName}</h4>
                    </div>
                    <div className="modal-body">
                        <ul className="nav nav-tabs tw:mb-3.75">
                            <li className={!showEditAccession ? 'active' : ''}>
                                <a className="tw:cursor-pointer" onClick={() => setShowEditAccession(false)}>Summary</a>
                            </li>
                            <li className={showEditAccession ? 'active' : ''}>
                                <a className="tw:cursor-pointer" onClick={() => setShowEditAccession(true)}>Replace {stockLabel}</a>
                            </li>
                        </ul>

                        {!showEditAccession ? (
                            <div className="tw:p-2.5">
                                <table className="table table-bordered">
                                    <tbody>
                                        <tr>
                                            <td className="tw:w-[30%] tw:font-bold">Plot Database ID:</td>
                                            <td>{selectedPlot.observationUnitDbId}</td>
                                        </tr>
                                        <tr>
                                            <td className="tw:font-bold">{stockLabel} Name:</td>
                                            <td>{selectedPlot.germplasmName}</td>
                                        </tr>
                                        <tr>
                                            <td className="tw:font-bold">Plot Number:</td>
                                            <td>{selectedPlot.observationUnitPosition?.observationLevel?.levelCode}</td>
                                        </tr>
                                        {selectedPlot.observationUnitPosition?.positionCoordinateX && (
                                            <tr>
                                                <td className="tw:font-bold">Coordinates (X / Y):</td>
                                                <td>{selectedPlot.observationUnitPosition.positionCoordinateX} / {selectedPlot.observationUnitPosition.positionCoordinateY}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Expandable Plot Structure Section */}
                                {plotStructure && (
                                    <div className="tw:mt-5">
                                        <h5 className="tw:font-bold tw:mb-2">Plot Contents & Structure Hierarchy:</h5>
                                        {plotStructureLayoutType === 'subplot_grid' ? (
                                            <div className="tw:p-2.5 tw:border tw:rounded tw:bg-[#fafafa]">
                                                <RenderSubplotGrid node={plotStructure} />
                                            </div>
                                        ) : plotStructureLayoutType === 'plant_grid' ? (
                                            <div className="tw:p-2.5 tw:border tw:rounded tw:bg-[#fafafa]">
                                                <RenderPlantGrid node={plotStructure} />
                                            </div>
                                        ) : (
                                            <div className="tw:max-h-62.5 tw:overflow-y-auto tw:bg-[#f5f5f5] tw:p-2.5 tw:rounded tw:text-xs">
                                                <pre className="tw:border-0 tw:bg-transparent tw:p-0 tw:m-0">{JSON.stringify(plotStructure, null, 2)}</pre>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {plotImages && (
                                    <div className="tw:mt-5">
                                        <h5><strong>Plot Images:</strong></h5>
                                        <div dangerouslySetInnerHTML={{ __html: plotImages }} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="tw:p-2.5">
                                <div className="form-group">
                                    <label>New {stockLabel} Name:</label>
                                    <AccessionAutocomplete value={newAccession} onChange={setNewAccession} className="form-control" />
                                </div>
                                <div className="form-group">
                                    <label>New Plot Name (Optional):</label>
                                    <input type="text" className="form-control" value={newPlotName} onChange={e => setNewPlotName(e.target.value)} />
                                </div>
                                <div className="alert alert-warning">
                                    Replacing this {stockLabel.toLowerCase()} will update layout structures and replicates. Ensure changes are correct.
                                </div>
                                <button className="btn btn-primary tw:mr-2" onClick={() => submitReplaceAccession('check', selectedPlot, newAccession, newPlotName)}>Update {stockLabel}</button>
                                {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && hasHeatmapValue && (
                                    <button className="btn btn-warning" onClick={() => handleSuppressPhenotype()}>Suppress Current Trait Value</button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-default" onClick={() => setShow(false)}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    </>;
};

interface CuratorWarningModalProps {
    newAccession: string;
    newPlotName: string;
}

export const CuratorWarningModal: React.FC<CuratorWarningModalProps> = ({ newAccession, newPlotName }) => {
    const {
        showCuratorWarning: show,
        setShowCuratorWarning: setShow
    } = useModals();

    if (!show) return null;

    const {
        submitReplaceAccession 
    } = useDataFetch();

    const {
        selectedPlot,
    } = useView();

    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={() => setShow(false)}>&times;</button>
                        <h4 className="modal-title">Curator Override Warning</h4>
                    </div>
                    <div className="modal-body">
                        <p>One or more traits have already been assayed for this trial. Are you sure you want to replace this accession?</p>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-default" onClick={() => setShow(false)}>No</button>
                        <button className="btn btn-primary" onClick={() => submitReplaceAccession('override', selectedPlot, newAccession, newPlotName)}>Yes, Override</button>
                    </div>
                </div>
            </div>
        </div>
    );
};