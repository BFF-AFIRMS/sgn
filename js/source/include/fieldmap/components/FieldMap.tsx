import React, { useEffect } from 'react';
import { FieldMapLegend } from './FieldMapLegend';
import { FieldMapTooltip } from './FieldMapTooltip';
import { PlotLayer } from './PlotLayer';
import { LabelLayer } from './LabelLayer';
import { DownloadPlotOrderPanel } from './DownloadPlotOrderPanel';
import { PlotDetailsModal } from '../modals/PlotDetailsModal';
import { FieldMapHeaderPanel } from './FieldMapHeaderPanel';
import { FieldMapControlPanel } from './FieldMapControlPanel';
import { FieldMapSettingsPanel } from './FieldMapSettingsPanel';
import { NorthArrow } from './NorthArrow';
import { DimensionsModal } from '../modals/DimensionsModal';
import { DownloadCSVModal } from '../modals/DownloadCSVModal';
import { DeleteTraitModal } from '../modals/DeleteTraitModal';
import { PlotGridProvider, usePlotGrid } from '../contexts/PlotGridContext';
import { ControlProvider } from '../contexts/ControlContext';
import { LayoutConfigProvider, useLayoutConfig } from '../contexts/LayoutConfigContext';
import { useZoomPan, ZoomPanProvider } from '../contexts/ZoomPanContext';
import { FieldMapContextProps, FieldMapProps } from '../types';
import { ZoomControls } from './ZoomControls';
import { ModalsProvider, useModals } from '../contexts/ModalsContext';
import { useView, ViewProvider } from '../contexts/ViewContext';
import { HeatmapProvider } from '../contexts/HeatmapContext';
import { GeoFieldMap } from './GeoFieldMap';
import { SecondaryAxisModal } from '../modals/SecondaryAxisModal';

declare global {
    interface JQuery {
        modal: (action: string) => void;
    }
}

const FieldMap: React.FC<FieldMapProps> = ({
    hasColAndRowNumbers,
    hasSubplotEntries,
    hasPlantEntries,
    mode = 'full'
}) => {
    const { hasSecondaryAxis } = useLayoutConfig();
    const offsetX = hasSecondaryAxis ? 80 : 50;
    const offsetY = hasSecondaryAxis ? 55 : 25;

    const {
        svgDimensions: { width: svgWidth, height: svgHeight },
    } = usePlotGrid();

    const {
        selectedView,
    } = useView();

    const {
        loading,
        setShowDownloadCSVModal,
    } = useModals();

    useEffect(() => {
        if (loading) {
            jQuery("#working_modal").modal("show");
        } else {
            jQuery("#working_modal").modal("hide");
        }
    }, [loading]);

    const { 
        zoom, pan, isDragging, containerRef, 
        handleMouseDown, handleMouseMove, handleMouseUpOrLeave
    } = useZoomPan();

    useEffect(() => {
        const handleExternalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.id === 'trial_fieldmap_download_layout_button' || target.closest('#trial_fieldmap_download_layout_button'))) {
                setShowDownloadCSVModal(true);
            }
        };
        document.addEventListener('click', handleExternalClick);
        return () => {
            document.removeEventListener('click', handleExternalClick);
        };
    }, [setShowDownloadCSVModal]);

    return (
        <div className="tw:p-3.75">
            {mode !== 'preview' && (
                <>
                    <FieldMapHeaderPanel />
                    <FieldMapControlPanel />
                </>
            )}

            {selectedView === 'geofieldmap' ? (
                <GeoFieldMap />
            ) : (
                <div key="standard-fieldmap-panel" className="panel panel-default">
                    <div className="panel-body tw:grid">
                        <FieldMapSettingsPanel mode={mode} />

                        <div
                            ref={containerRef}
                            className={`tw:relative tw:border tw:border-[#ddd] tw:bg-[#fcfcfc] tw:h-300 tw:flex tw:overflow-hidden tw:select-none ${isDragging ? 'tw:cursor-grabbing' : 'tw:cursor-grab'}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                        >
                            <svg
                                id="fieldmap_chart_svg"
                                className="tw:max-w-none tw:shrink-0"
                                width={svgWidth}
                                height={svgHeight}
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
                            >
                                <g transform={`translate(${offsetX}, ${offsetY})`}>
                                    <PlotLayer />
                                    <LabelLayer />
                                </g>
                            </svg>

                            <NorthArrow />
                            <ZoomControls />

                            <FieldMapTooltip />
                        </div>
                    </div>
                </div>
            )}

            <FieldMapLegend />

            <DownloadCSVModal />
            {mode !== 'preview' && (
                <>
                    <DeleteTraitModal />
                    <DimensionsModal />
                    <PlotDetailsModal />
                    <SecondaryAxisModal />

                    <DownloadPlotOrderPanel
                        hasColAndRowNumbers={hasColAndRowNumbers}
                        hasSubplotEntries={hasSubplotEntries}
                        hasPlantEntries={hasPlantEntries}
                    />
                </>
            )}
        </div>
    );
};

export const FieldMapContainer: React.FC<FieldMapProps> = (props: FieldMapProps) => {
    const buildProviderTree = (providers: React.FC<FieldMapContextProps>[]): React.ReactNode => {
        if (providers.length === 0) {
            return <FieldMap {...props} />;
        }
        const [CurrentProvider, ...remainingProviders] = providers;
        return (
            <CurrentProvider {...props}>
                {buildProviderTree(remainingProviders)}
            </CurrentProvider>
        );
    };

    return buildProviderTree([
        LayoutConfigProvider,
        ViewProvider,
        ModalsProvider,
        PlotGridProvider,
        HeatmapProvider,
        ZoomPanProvider,
        ControlProvider,
    ]);
};
