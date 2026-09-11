import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { FieldMapLegend } from '../include/fieldmap/components/FieldMapLegend';
import { FieldMapTooltip } from '../include/fieldmap/components/FieldMapTooltip';
import { PlotLayer } from '../include/fieldmap/components/PlotLayer';
import { LabelLayer } from '../include/fieldmap/components/LabelLayer';
import { DownloadPlotOrderPanel } from '../include/fieldmap/components/DownloadPlotOrderPanel';
import { PlotDetailsModal } from '../include/fieldmap/modals/PlotDetailsModal';
import { FieldMapHeaderPanel } from '../include/fieldmap/components/FieldMapHeaderPanel';
import { FieldMapControlPanel } from '../include/fieldmap/components/FieldMapControlPanel';
import { FieldMapSettingsPanel } from '../include/fieldmap/components/FieldMapSettingsPanel';
import { NorthArrow } from '../include/fieldmap/components/NorthArrow';
import { DimensionsModal } from '../include/fieldmap/modals/DimensionsModal';
import { DownloadCSVModal } from '../include/fieldmap/modals/DownloadCSVModal';
import { DeleteTraitModal } from '../include/fieldmap/modals/DeleteTraitModal';
import { PlotGridProvider, usePlotGrid } from '../include/fieldmap/contexts/PlotGridContext';
import { ControlProvider } from '../include/fieldmap/contexts/ControlContext';
import { LayoutConfigProvider } from '../include/fieldmap/contexts/LayoutConfigContext';
import { useZoomPan, ZoomPanProvider } from '../include/fieldmap/contexts/ZoomPanContext';
import { FieldMapContextProps, FieldMapProps } from '../include/fieldmap/types';
import { ZoomControls } from '../include/fieldmap/components/ZoomControls';
import { ModalsProvider, useModals } from '../include/fieldmap/contexts/ModalsContext';
import { useView, ViewProvider } from '../include/fieldmap/contexts/ViewContext';
import { HeatmapProvider } from '../include/fieldmap/contexts/HeatmapContext';
import { GeoFieldMap } from '../include/fieldmap/components/GeoFieldMap';
import { SecondaryAxisModal } from '../include/fieldmap/modals/SecondaryAxisModal';
import { useLayoutConfig } from '../include/fieldmap/contexts/LayoutConfigContext';

declare global {
    interface JQuery {
        modal: (action: string) => void;
    }
}

const FieldMap: React.FC<FieldMapProps> = ({
    hasColAndRowNumbers,
    hasSubplotEntries,
    hasPlantEntries,
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
    }, []);

    return (
        <div className="tw:p-3.75">
            <FieldMapHeaderPanel />
            <FieldMapControlPanel />

            {selectedView === 'geofieldmap' ? (
                <GeoFieldMap />
            ) : (
                <div key="standard-fieldmap-panel" className="panel panel-default">
                    <div className="panel-body tw:grid">
                        <FieldMapSettingsPanel />

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
            <DeleteTraitModal />
            <DimensionsModal />
            <PlotDetailsModal />
            <SecondaryAxisModal />

            <DownloadPlotOrderPanel
                hasColAndRowNumbers={hasColAndRowNumbers}
                hasSubplotEntries={hasSubplotEntries}
                hasPlantEntries={hasPlantEntries}
            />
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

export const init = (containerId: string, props: FieldMapProps) => {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(<FieldMapContainer {...props} />);
    }
};