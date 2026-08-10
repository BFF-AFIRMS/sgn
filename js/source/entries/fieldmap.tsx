import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    Plot, 
    PlotStructureNode,
    DownloadOpts
} from '../include/fieldmap/model.types';
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
import { SuppressPhenotypeModal } from '../include/fieldmap/modals/SuppressPhenotypeModal';
import { DeleteTraitModal } from '../include/fieldmap/modals/DeleteTraitModal';
import { PlotGridProvider, usePlotGrid } from '../include/fieldmap/contexts/PlotGridContext';
import { ControlProvider } from '../include/fieldmap/contexts/ControlContext';
import { LayoutConfigProvider, useLayoutConfig } from '../include/fieldmap/contexts/LayoutConfigContext';
import { useZoomPan, ZoomPanProvider } from '../include/fieldmap/contexts/ZoomPanContext';
import { FieldMapContextProps, FieldMapProps } from '../include/fieldmap/context.types';
import { ZoomControls } from '../include/fieldmap/components/ZoomControls';
import { useModals } from '../include/fieldmap/contexts/ModalsContext';
import { useView } from '../include/fieldmap/contexts/ViewContext';
import { useDataFetch } from '../include/fieldmap/contexts/DataFetchContext';

// Declare external legacy global libraries
// We must use 'any' here as Leaflet (L) and Turf are loaded globally as script includes 
// via Mason templates and do not have type declarations within this bundler.
declare const L: any;
declare const turf: any;
declare const BrAPIFieldmap: any;
declare const jQuery: any;

const FieldMap: React.FC<FieldMapProps> = ({
    trialId,
    trialStockType,
    hasColAndRowNumbers,
    hasSubplotEntries,
    hasPlantEntries,
    authToken
}) => {
    const {
        overlappingPlots,
        svgDimensions: { width: svgWidth, height: svgHeight },
        gridMatrix,
    } = usePlotGrid();

    const {
        topBorder,
        leftBorder,
        rightBorder,
        bottomBorder,
    } = useLayoutConfig();

    const {
        selectedView,
        activeTrialIds,
    } = useView();

    const {
        loading,
        setShowDownloadCSVModal,
    } = useModals();

    const {
        submitGeoLayout,
    } = useDataFetch();

    const geoMapRef = useRef<HTMLDivElement | null>(null);
    const leafletMapInstance = useRef<any>(null);

    const [downloadOpts, setDownloadOpts] = useState<DownloadOpts>({
        type: '',
        order: 'by_row_zigzag',
        start: 'bottom_left',
        borders: false,
        gaps: false,
        subplots: false,
        plants: false,
        hmPltid: 'plot_id',
        hmRange: 'row_number',
        hmRow: 'col_number'
    });

    const stockLabel = useMemo(() => {
        if (trialStockType === 'cross') return 'Cross';
        if (trialStockType === 'family_name') return 'Family';
        return 'Accession';
    }, [trialStockType]);

    useEffect(() => {
        if (loading) {
            jQuery("#working_modal").modal("show");
        } else {
            jQuery("#working_modal").modal("hide");
        }
    }, [loading]);


    const { 
        zoom, pan, isDragging, containerRef, hasDragged, 
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

    // Handle Leaflet GeoMap rendering
    useEffect(() => {
        if (selectedView === 'geofieldmap' && geoMapRef.current) {
            if (leafletMapInstance.current) {
                leafletMapInstance.current.remove();
            }
            try {
                // Initialize custom Leaflet container mapping
                const mapEl = geoMapRef.current;
                mapEl.innerHTML = "<div id='geoflatmap_leaflet' style='width:100%; height:600px;'></div>";
                
                const fmInstance = new BrAPIFieldmap('#geoflatmap_leaflet', '/brapi/v2', {
                    viewOnly: false,
                    brapi_auth: authToken,
                    defaultPos: [0, 0],
                    defaultZoom: 2,
                    plotScaleFactor: 1,
                    style: { weight: 1, color: '#41b6c4', fillOpacity: 0.4 }
                });
                fmInstance.load(trialId).then((success: boolean) => {
                    if (!success) {
                        alert("No geo reference data in this trial!");
                    }
                });
                leafletMapInstance.current = fmInstance.map;
                (window as any).geoFieldMapInstance = fmInstance;
            } catch (e) {
                console.error("Leaflet initialization failed", e);
            }
        }
        return () => {
            if (leafletMapInstance.current) {
                leafletMapInstance.current.remove();
                leafletMapInstance.current = null;
            }
            delete (window as any).geoFieldMapInstance;
        };
    }, [selectedView, trialId, authToken]);

    const handleDownloadOrder = () => {
        const q = new URLSearchParams({
            trial_ids: activeTrialIds.join(','),
            type: downloadOpts.type,
            order: downloadOpts.order,
            start: downloadOpts.start,
            top_border: String(downloadOpts.borders && topBorder),
            right_border: String(downloadOpts.borders && rightBorder),
            bottom_border: String(downloadOpts.borders && bottomBorder),
            left_border: String(downloadOpts.borders && leftBorder),
            gaps: String(downloadOpts.gaps),
            subplots: String(downloadOpts.subplots),
            plants: String(downloadOpts.plants),
            hm_pltid: downloadOpts.hmPltid,
            hm_range: downloadOpts.hmRange,
            hm_row: downloadOpts.hmRow
        }).toString();
        window.open(`/ajax/breeders/trial_plot_order?${q}`, '_blank');
    };

    return (
        <div className="tw:p-3.75">
            <FieldMapHeaderPanel />

            <FieldMapControlPanel />

            {selectedView === 'geofieldmap' ? (
                <div key="geofieldmap-panel" className="panel panel-default">
                    <div className="panel-body tw:flex tw:flex-col tw:gap-2.5">
                        <div ref={geoMapRef} style={{ width: '100%', height: '600px' }}></div>
                        <button className="btn btn-success tw:self-start" onClick={submitGeoLayout}>Submit Geo Layout Changes</button>
                    </div>
                </div>
            ) : (
                <div key="standard-fieldmap-panel" className="panel panel-default">
                    <div className="panel-body tw:grid">
                        <FieldMapSettingsPanel
                            stockLabel={stockLabel}
                        />

                        <div
                            ref={containerRef}
                            className={`tw:relative tw:border tw:border-[#ddd] tw:bg-[#fcfcfc] tw:h-300 tw:flex tw:overflow-hidden tw:select-none ${isDragging ? 'tw:cursor-grabbing' : 'tw:cursor-grab'}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                        >
                            <NorthArrow />
                            <ZoomControls />

                            <svg
                                id="fieldmap_chart_svg"
                                className="tw:max-w-none tw:shrink-0"
                                width={svgWidth}
                                height={svgHeight}
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
                            >
                                <g transform="translate(50, 25)">
                                    <PlotLayer trialId={trialId} />
                                    <LabelLayer />
                                </g>
                            </svg>

                            <FieldMapTooltip />
                        </div>
                    </div>
                </div>
            )}

            <FieldMapLegend />

            <DownloadCSVModal trialId={trialId} />
            <SuppressPhenotypeModal />
            <DeleteTraitModal />
            <DimensionsModal />
            <PlotDetailsModal stockLabel={stockLabel} />

            <DownloadPlotOrderPanel
                hasColAndRowNumbers={hasColAndRowNumbers}
                hasSubplotEntries={hasSubplotEntries}
                hasPlantEntries={hasPlantEntries}
                downloadOpts={downloadOpts}
                setDownloadOpts={setDownloadOpts}
                onDownload={handleDownloadOrder}
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
        PlotGridProvider,
        ZoomPanProvider,
        ControlProvider
    ]);
};

export const init = (containerId: string, props: FieldMapProps) => {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(<FieldMapContainer {...props} />);
    }
};