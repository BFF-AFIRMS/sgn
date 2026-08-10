import React from 'react';
import { Plot } from '../types';
import { useBorder } from '../contexts/BorderContext';
import { usePlotGrid } from '../contexts/PlotGridContext';
import { useLayoutConfig, PlotLayout, ColorVar, LabelVar } from '../contexts/LayoutConfigContext';

interface FieldMapSettingsPanelProps {
    displayLinkedTrials: boolean;
    selectedView: string;
    selectedViewLabel: string;
    stockLabel: string;
    setShowDimDialog: (val: boolean) => void;
    setShowDownloadCSVModal: (val: boolean) => void;
    printFieldMap: (selectedView: string, selectedViewLabel: string) => void;
    downloadHeatmapImage: () => void;
    submitFieldLayout: () => void;
    setShowDeleteTraitModal: (val: boolean) => void;
    northArrowAngle: number;
    setNorthArrowAngle: (val: number) => void;
}

export const FieldMapSettingsPanel: React.FC<FieldMapSettingsPanelProps> = ({
    displayLinkedTrials,
    selectedView,
    selectedViewLabel,
    stockLabel,
    setShowDimDialog,
    setShowDownloadCSVModal,
    printFieldMap,
    downloadHeatmapImage,
    submitFieldLayout,
    setShowDeleteTraitModal,
    northArrowAngle,
    setNorthArrowAngle
}) => {
    const {
        topBorder, setTopBorder,
        leftBorder, setLeftBorder,
        rightBorder, setRightBorder,
        bottomBorder, setBottomBorder
    } = useBorder();

    const {
        dimensions,
        bounds,
        transposeLayout,
        rotateLayout,
        recalculateLayout
    } = usePlotGrid();

    const {
        plotLayout, setPlotLayout,
        invertRows, setInvertRows,
        invertCols, setInvertCols,
        colorVar, setColorVar,
        labelVar, setLabelVar,
        labelSize, setLabelSize
    } = useLayoutConfig();

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
                <button className="btn btn-default" onClick={transposeLayout} disabled={displayLinkedTrials}>Transpose Display</button>
                <button className="btn btn-default" onClick={rotateLayout} disabled={displayLinkedTrials}>Rotate</button>
                <button className="btn btn-default" onClick={() => setShowDimDialog(true)} disabled={displayLinkedTrials}>Change Dimensions</button>
                <button className="btn btn-default" onClick={() => setShowDownloadCSVModal(true)}>Download Spatial Layout (CSV)</button>
                <button className="btn btn-default" onClick={() => printFieldMap(selectedView, selectedViewLabel)}>Print Fieldmap</button>
                {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && (
                    <button className="btn btn-default" onClick={downloadHeatmapImage}>Download Heatmap Image</button>
                )}
                <button className="btn btn-success" onClick={submitFieldLayout} disabled={displayLinkedTrials}>Submit Layout Changes</button>
                {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && (
                    <button className="btn btn-danger" onClick={() => setShowDeleteTraitModal(true)}>Delete Selected Trait</button>
                )}
            </div>
        </div>
    );
};
