import React from 'react';
import { usePlotGrid } from '../contexts/PlotGridContext';
import { useLayoutConfig, PlotLayout, ColorVar, LabelVar } from '../contexts/LayoutConfigContext';
import { useView } from '../contexts/ViewContext';
import { useModals } from '../contexts/ModalsContext';
import { printFieldMap } from '../utils/print';
import { useDownloadHeatmapImage } from '../hooks/useDownloadHeatmapImage';
import { useSubmitFieldLayout } from '../hooks/useSubmitFieldLayout';

interface FieldMapSettingsPanelProps {
}

export const FieldMapSettingsPanel: React.FC<FieldMapSettingsPanelProps> = ({ }) => {
    const {
        transposeLayout,
        rotateLayout,
        recalculateLayout
    } = usePlotGrid();

    const {
        plotLayout, setPlotLayout,
        invertRows, setInvertRows,
        invertCols, setInvertCols,
        topBorder, setTopBorder,
        leftBorder, setLeftBorder,
        rightBorder, setRightBorder,
        bottomBorder, setBottomBorder,
        colorVar, setColorVar,
        labelVar, setLabelVar,
        labelSize, setLabelSize,
        northArrowAngle, setNorthArrowAngle
    } = useLayoutConfig();

    const {
        stockLabel,
        selectedView,
        selectedViewLabel,
        displayLinkedTrials,
    } = useView();

    const {
        setShowDownloadCSVModal,
        setShowDimDialog,
        setShowDeleteTraitModal,
        setShowSecondaryAxisModal,
    } = useModals();

    const {
        submitFieldLayout
    } = useSubmitFieldLayout();

    const {
        downloadHeatmapImage
    } = useDownloadHeatmapImage();

    return (
        <div className="tw:flex tw:gap-5 tw:flex-wrap tw:mb-3.75">
            <div className="form-inline">
                <label className="tw:mr-1.25">Plot Layout:</label>
                <select 
                    className="form-control" 
                    value={plotLayout} 
                    onChange={e => {
                        const nextLayout = e.target.value as PlotLayout;
                        setPlotLayout(nextLayout);
                        recalculateLayout(nextLayout);
                    }}
                    disabled={displayLinkedTrials}
                >
                    <option value="serpentine">Serpentine</option>
                    <option value="zigzag">Zigzag</option>
                </select>
            </div>
            <div className="form-check tw:flex tw:items-center">
                <label className="form-check-label">
                    <input type="checkbox" className="form-check-input tw:mr-1.25" checked={invertRows} onChange={e => setInvertRows(e.target.checked)} />
                    Invert Rows
                </label>
            </div>
            <div className="form-check tw:flex tw:items-center">
                <label className="form-check-label">
                    <input type="checkbox" className="form-check-input tw:mr-1.25" checked={invertCols} onChange={e => setInvertCols(e.target.checked)} />
                    Invert Columns
                </label>
            </div>
            <div className="form-inline">
                <label className="tw:mr-1.25">Color By:</label>
                <select className="form-control" value={colorVar} onChange={e => setColorVar(e.target.value as ColorVar)}>
                    <option value="parity">Default (Parity)</option>
                    <option value="germplasm">{stockLabel}</option>
                    <option value="block">Block Number</option>
                    <option value="family_name">Family</option>
                    <option value="cross_name">Cross</option>
                </select>
            </div>
            <div className="form-inline">
                <label className="tw:mr-1.25">Label By:</label>
                <select className="form-control" value={labelVar} onChange={e => setLabelVar(e.target.value as LabelVar)}>
                    <option value="plot_number">Plot Number</option>
                    <option value="germplasm">{stockLabel} Name</option>
                    <option value="block">Block Number</option>
                    <option value="family_name">Family</option>
                    <option value="cross_name">Cross</option>
                </select>
            </div>
            <div className="form-inline">
                <label className="tw:mr-1.25">Label Size:</label>
                <input type="number" className="form-control tw:w-15" value={labelSize} onChange={e => setLabelSize(parseInt(e.target.value) || 10)} />
            </div>
            <div className="form-inline">
                <label className="tw:mr-1.25">North Angle (°):</label>
                <input
                    type="number"
                    className="form-control tw:w-20"
                    value={northArrowAngle}
                    onChange={e => {
                        const val = e.target.value;
                        setNorthArrowAngle(val === '' ? 0 : parseFloat(val) || 0);
                    }}
                />
            </div>
            <div className="tw:flex tw:gap-2.5 tw:items-center">
                <label className="tw:m-0">Include Borders:</label>
                <label className="tw:font-normal tw:m-0"><input type="checkbox" checked={topBorder} onChange={e => setTopBorder(e.target.checked)} disabled={displayLinkedTrials} /> Top</label>
                <label className="tw:font-normal tw:m-0"><input type="checkbox" checked={bottomBorder} onChange={e => setBottomBorder(e.target.checked)} disabled={displayLinkedTrials} /> Bottom</label>
                <label className="tw:font-normal tw:m-0"><input type="checkbox" checked={leftBorder} onChange={e => setLeftBorder(e.target.checked)} disabled={displayLinkedTrials} /> Left</label>
                <label className="tw:font-normal tw:m-0"><input type="checkbox" checked={rightBorder} onChange={e => setRightBorder(e.target.checked)} disabled={displayLinkedTrials} /> Right</label>
            </div>

            <div className="tw:flex tw:gap-2.5 tw:flex-wrap tw:mb-3.75 tw:w-full">
                <button className="btn btn-default" onClick={transposeLayout} disabled={displayLinkedTrials} title="Transpose Display"><span className="glyphicon glyphicon-random"></span></button>
                <button className="btn btn-default" onClick={rotateLayout} disabled={displayLinkedTrials} title="Rotate"><span className="glyphicon glyphicon-repeat"></span></button>
                <button className="btn btn-default" onClick={() => setShowDimDialog(true)} disabled={displayLinkedTrials} title="Change Dimensions"><span className="glyphicon glyphicon-resize-full"></span></button>
                <button className="btn btn-default" onClick={() => setShowSecondaryAxisModal(true)} disabled={displayLinkedTrials} title="Change Secondary Axis"><span className="glyphicon glyphicon-indent-left"></span></button>
                <button className="btn btn-default" onClick={() => setShowDownloadCSVModal(true)} title="Download Spatial Layout (CSV)"><span className="glyphicon glyphicon-save"></span></button>
                <button className="btn btn-default" onClick={() => printFieldMap(selectedView, selectedViewLabel)} title="Print Fieldmap"><span className="glyphicon glyphicon-print"></span></button>
                {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && (
                    <button className="btn btn-default" onClick={() => downloadHeatmapImage()}>Download Heatmap Image</button>
                )}
                <button className="btn btn-success" onClick={submitFieldLayout} disabled={displayLinkedTrials}>Submit Layout Changes</button>
                {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && (
                    <button className="btn btn-danger" onClick={() => setShowDeleteTraitModal(true)}>Delete Selected Trait</button>
                )}
            </div>
        </div>
    );
};
