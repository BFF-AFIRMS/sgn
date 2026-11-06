import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { isDefined } from '~/functions';

import * as ExtraMarkers from 'leaflet-extra-markers';

export interface TrialLocationMapProps {
    locationName?: string | null;
    countryName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    altitude?: number | null;
}

export const TrialLocationMap: React.FC<TrialLocationMapProps> = ({
    locationName,
    countryName,
    latitude,
    longitude,
    altitude,
}) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const popupContainer = useMemo(() => document.createElement('div'), []);
    const hasCoords = isDefined(latitude) && isDefined(longitude);
    const hasAltitude = isDefined(altitude);

    useEffect(() => {
        if (!mapContainerRef.current || !hasCoords) {
            return;
        }

        const satelliteLayer = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                attribution:
                    'Sources: Esri, DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community',
                maxZoom: 19,
            }
        );
        const topoMapLayer = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            {
                attribution:
                    'Sources: Esri, DeLorme, HERE, TomTom, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), swisstopo, MapmyIndia, and the GIS User Community',
                maxZoom: 19,
            }
        );
        const streetMapLayer = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            {
                attribution:
                    'Sources: Esri, DeLorme, HERE, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), MapmyIndia, Tomtom',
            }
        );
        const baseMapLayers = {
            "Satellite (Default)": satelliteLayer,
            "Street": streetMapLayer,
            "Topographical": topoMapLayer,
        };
        const map = L.map(mapContainerRef.current, {
            center: [latitude, longitude],
            zoom: 10, // 10 ~= 153 m / pixel at equator
            layers: [satelliteLayer],
        });

        L.control.layers(baseMapLayers, undefined, {position: 'bottomright'}).addTo(map);

        L.control
            .scale({
                maxWidth: 100,
                metric: true,
                imperial: false,
                position: 'bottomleft',
            })
            .addTo(map);

        const pinIcon = new ExtraMarkers.Icon({
            color: 'orange',
        });

        const marker = L.marker([latitude, longitude], { icon: pinIcon }).addTo(map);
        marker.bindPopup(popupContainer);

        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            map.remove();
        };
    }, [latitude, longitude, popupContainer]);

    return (
        <div className="panel panel-default tw:mt-3.75" id="trial_location_map_panel">
            <div className="panel-heading">
                <span className="glyphicon glyphicon-map-marker" /> <b>Location Map</b>
                {locationName && (
                    <span className="pull-right text-muted tw:text-xs">
                        {locationName}
                        {countryName ? ` (${countryName})` : ''}
                    </span>
                )}
            </div>
            <div className="panel-body tw:p-0">
                {hasCoords ? (
                    <>
                        <div
                            ref={mapContainerRef}
                            id="trial_location_map"
                            className="tw:h-120 tw:w-full"
                        />
                        {createPortal(
                            <div>
                                <h4>{locationName}</h4>
                                {countryName && (
                                    <>
                                        <h6>{countryName}</h6>
                                    </>
                                )}
                                <hr />
                                <b>Latitude:</b> {latitude}
                                <br />
                                <b>Longitude:</b> {longitude}
                                {hasAltitude && (
                                    <>
                                        <br />
                                        <b>Altitude:</b> {altitude} m
                                    </>
                                )}
                                <hr />
                                <small>
                                    <a
                                        className="tw:text-sm"
                                        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        View in Google Maps &raquo;
                                    </a>
                                </small>
                            </div>,
                            popupContainer
                        )}
                    </>
                ) : locationName ? (
                    <div className="text-center text-muted tw:py-6.25 tw:px-3.75">
                        <span className="glyphicon glyphicon-globe tw:text-3xl tw:mb-2 tw:text-gray-400" />
                        <p className="tw:mb-1">
                            No GPS coordinates recorded for <b>{locationName}</b>.
                        </p>
                        <p>
                            <small>
                                Coordinates can be added under{' '}
                                <a href="/breeders/locations">Manage Locations</a>.
                            </small>
                        </p>
                    </div>
                ) : (
                    <div className="text-center text-muted tw:py-6.25 tw:px-3.75">
                        <span className="glyphicon glyphicon-globe tw:text-3xl tw:mb-2 tw:text-gray-400" />
                        <p className="tw:mb-0">No location specified for this trial.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const parseProps = (raw: string | undefined): TrialLocationMapProps => {
    if (raw === undefined) {
        throw new Error(`missing data-props attribute`);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        throw new Error(`malformed data-props attribute: ${reason}`);
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error(`data-props must decode to a JSON object`);
    }

    return parsed as TrialLocationMapProps;
};

export const init = (containerId: string) => {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
    try {
        const props = parseProps(container.dataset.props);
        const root = createRoot(container);
        root.render(<TrialLocationMap {...props} />);
    } catch (e) {
        throw new Error(`#${containerId} failed to initialize: ${e instanceof Error ? e.message : String(e)}`)
    }
};
