import React from 'react';
import { Plot, PlotStructureNode } from '../types';
import { RenderPlantGrid, RenderSubplotGrid } from '../components/PlantSubplotGrids';
import { AccessionAutocomplete } from '../components/AccessionAutocomplete';

interface PlotDetailsModalProps {
    show: boolean;
    onClose: () => void;
    plot: Plot | null;
    stockLabel: string;
    showEditAccession: boolean;
    setShowEditAccession: (v: boolean) => void;
    plotStructure: PlotStructureNode | null;
    plotStructureLayoutType: string;
    plotImages: string;
    newAccession: string;
    setNewAccession: (v: string) => void;
    newPlotName: string;
    setNewPlotName: (v: string) => void;
    onSubmitReplaceAccession: (override: 'check' | 'override') => void;
    selectedView: string;
    hasHeatmapValue: boolean;
    onSuppressClick: () => void;
}

export const PlotDetailsModal: React.FC<PlotDetailsModalProps> = ({
    show,
    onClose,
    plot,
    stockLabel,
    showEditAccession,
    setShowEditAccession,
    plotStructure,
    plotStructureLayoutType,
    plotImages,
    newAccession,
    setNewAccession,
    newPlotName,
    setNewPlotName,
    onSubmitReplaceAccession,
    selectedView,
    hasHeatmapValue,
    onSuppressClick
}) => {
    if (!show || !plot) return null;

    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={onClose}>&times;</button>
                        <h4 className="modal-title">Plot Details: {plot.observationUnitName}</h4>
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
                                            <td>{plot.observationUnitDbId}</td>
                                        </tr>
                                        <tr>
                                            <td className="tw:font-bold">{stockLabel} Name:</td>
                                            <td>{plot.germplasmName}</td>
                                        </tr>
                                        <tr>
                                            <td className="tw:font-bold">Plot Number:</td>
                                            <td>{plot.observationUnitPosition?.observationLevel?.levelCode}</td>
                                        </tr>
                                        {plot.observationUnitPosition?.positionCoordinateX && (
                                            <tr>
                                                <td className="tw:font-bold">Coordinates (X / Y):</td>
                                                <td>{plot.observationUnitPosition.positionCoordinateX} / {plot.observationUnitPosition.positionCoordinateY}</td>
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
                                <button className="btn btn-primary tw:mr-2" onClick={() => onSubmitReplaceAccession('check')}>Update {stockLabel}</button>
                                {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && hasHeatmapValue && (
                                    <button className="btn btn-warning" onClick={onSuppressClick}>Suppress Current Trait Value</button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-default" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
