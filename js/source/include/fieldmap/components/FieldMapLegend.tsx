import React from 'react';
import { useHeatmap } from '../contexts/HeatmapContext';
import { useView } from '../contexts/ViewContext';

interface FieldMapLegendProps {
}

export const FieldMapLegend: React.FC<FieldMapLegendProps> = ({ }) => {
    const {
        selectedView,
        selectedViewLabel
    } = useView();

    const {
        valueColorScale
    } = useHeatmap();

    return (
        <div id="legend_list" className="panel panel-default">
            <div className="panel-body">
                <div className="tw:flex tw:gap-3.75 tw:flex-wrap tw:items-center">
                    <span className="tw:inline-flex tw:items-center tw:gap-1.25 tw:whitespace-nowrap">
                        <span className="tw:inline-block tw:w-3.75 tw:h-3.75 tw:bg-[#d3d3d3] tw:border tw:border-[#ddd]"></span> Border Plots and Filler Plots
                    </span>
                    <span className="tw:inline-flex tw:items-center tw:gap-1.25 tw:whitespace-nowrap">
                        <span className="tw:inline-block tw:w-3.75 tw:h-3.75 tw:bg-[#c7e9b4] tw:border tw:border-[#ddd]"></span> Even Block Numbers (e.g. 2,4,...)
                    </span>
                    <span className="tw:inline-flex tw:items-center tw:gap-1.25 tw:whitespace-nowrap">
                        <span className="tw:inline-block tw:w-3.75 tw:h-3.75 tw:bg-[#41b6c4] tw:border tw:border-[#ddd]"></span> Odd Block Numbers (e.g. 1,3,...)
                    </span>
                    <span className="tw:inline-flex tw:items-center tw:gap-1.25 tw:whitespace-nowrap">
                        <span className="tw:inline-block tw:w-3.75 tw:h-3.75 tw:bg-[#6a5acd] tw:border tw:border-[#ddd]"></span> Checks
                    </span>
                    <span className="tw:inline-flex tw:items-center tw:gap-1.25 tw:whitespace-nowrap">
                        <span className="tw:inline-block tw:w-3.75 tw:h-1 tw:bg-[#008000] tw:self-center"></span> Odd Rep Numbers (e.g. 1,3,...)
                    </span>
                    <span className="tw:inline-flex tw:items-center tw:gap-1.25 tw:whitespace-nowrap">
                        <span className="tw:inline-block tw:w-3.75 tw:h-1 tw:bg-[#ff0000] tw:self-center"></span> Even Rep Numbers (e.g. 2,4,...)
                    </span>
                    <span className="tw:inline-flex tw:items-center tw:gap-1.25 tw:whitespace-nowrap">
                        <span className="tw:inline-block tw:w-3.75 tw:h-3.75 tw:bg-[#000000] tw:border-2 tw:border-[#ff0000]"></span> Overlapping Plots
                    </span>
                    <span className="tw:inline-flex tw:items-center tw:gap-1.25 tw:whitespace-nowrap">
                        <img src="/static/css/images/plot_images.png" alt="Camera" width="20" height="20" className="tw:align-middle" /> Plot Has Image
                    </span>
                    <span className="tw:inline-flex tw:items-center tw:gap-1.25 tw:whitespace-nowrap">
                        <span className="tw:inline-block tw:w-3.75 tw:h-3.75 tw:bg-[#a9afaf] tw:border tw:border-[#ddd]"></span> No measurement
                    </span>
                    {selectedView !== 'fieldmap' && selectedView !== 'geofieldmap' && (
                        <div className="tw:flex tw:items-center tw:gap-2.5">
                            <span>Low trait value ({selectedViewLabel})</span>
                            <div className="tw:w-30 tw:h-3.75" style={{ background: `linear-gradient(to right, ${valueColorScale.colors?.join(', ') || 'white, darkred'})` }} />
                            <span>High trait value</span>
                        </div>
                    )}
                    <span className="tw:inline-flex tw:items-center tw:gap-1.25 tw:whitespace-nowrap">
                        <span className="tw:inline-block tw:w-3.75 tw:h-3.75 tw:bg-[#ffffff] tw:border tw:border-[#eee]"></span> Empty Coordinate
                    </span>
                </div>
            </div>
        </div>
    );
};
