import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';

interface LeafletLayer {}

interface LeafletControl {
    addTo(map: LeafletMap): this;
}

interface LeafletIcon {}

interface LeafletMarker {
    addTo(map: LeafletMap): this;
    bindPopup(content: HTMLElement | string): this;
}

interface LeafletMap {
    invalidateSize(): void;
    remove(): void;
}

interface LeafletStatic {
    tileLayer(
        urlTemplate: string,
        options?: { attribution?: string; maxZoom?: number }
    ): LeafletLayer;
    map(
        element: HTMLElement | string,
        options?: { center?: [number, number]; zoom?: number; layers?: LeafletLayer[] }
    ): LeafletMap;
    control: {
        layers(
            baseLayers?: Record<string, LeafletLayer>,
            overlays?: Record<string, LeafletLayer> | null,
            options?: { position?: string }
        ): LeafletControl;
        scale(options?: {
            maxWidth?: number;
            metric?: boolean;
            imperial?: boolean;
            position?: string;
        }): LeafletControl;
    };
    divIcon(options: {
        className?: string;
        html?: string;
        iconSize?: [number, number];
        iconAnchor?: [number, number];
        popupAnchor?: [number, number];
    }): LeafletIcon;
    marker(latlng: [number, number], options?: { icon?: LeafletIcon }): LeafletMarker;
}

declare const L: LeafletStatic;

export interface TrialLocationMapProps {
    locationName?: string | null;
    countryName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    altitude?: number | null;
}

const PIN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">' +
    '<path d="M16 1 C7.7 1 1 7.7 1 16 C1 26 16 41 16 41 C16 41 31 26 31 16 C31 7.7 24.3 1 16 1 Z" fill="#d9534f" stroke="#b52b27" stroke-width="1.5"/>' +
    '<circle cx="16" cy="15" r="5.5" fill="#ffffff"/>' +
    '</svg>';

const isValidCoordinatePair = (
    lat?: number | null,
    lng?: number | null
): boolean =>
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0);

export const TrialLocationMap: React.FC<TrialLocationMapProps> = ({
    locationName,
    countryName,
    latitude,
    longitude,
    altitude,
}) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const popupContainer = useMemo(() => document.createElement('div'), []);
    const hasCoords = isValidCoordinatePair(latitude, longitude);
    const hasAltitude = typeof altitude === 'number' && Number.isFinite(altitude);

    useEffect(() => {
        if (!hasCoords || !mapContainerRef.current || latitude == null || longitude == null) {
            return;
        }

        const satelliteLayer = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                attribution:
                    'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                maxZoom: 19,
            }
        );

        const streetLayer = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            {
                attribution:
                    'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
                maxZoom: 19,
            }
        );

        const topoLayer = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            {
                attribution:
                    'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
                maxZoom: 19,
            }
        );

        const map = L.map(mapContainerRef.current, {
            center: [latitude, longitude],
            zoom: 16,
            layers: [satelliteLayer],
        });

        L.control
            .layers(
                {
                    Satellite: satelliteLayer,
                    Street: streetLayer,
                    Topographical: topoLayer,
                },
                null,
                { position: 'bottomright' }
            )
            .addTo(map);

        L.control
            .scale({
                maxWidth: 100,
                metric: true,
                imperial: false,
                position: 'bottomleft',
            })
            .addTo(map);

        const pinIcon = L.divIcon({
            className: 'trial-map-pin',
            html: PIN_SVG,
            iconSize: [32, 42],
            iconAnchor: [16, 41],
            popupAnchor: [0, -38],
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
    }, [hasCoords, latitude, longitude, popupContainer]);

    return (
        <div
            className="panel panel-default"
            id="trial_location_map_panel"
            style={{ marginTop: '15px' }}
        >
            <div className="panel-heading">
                <span className="glyphicon glyphicon-map-marker" /> <b>Location Map</b>
                {locationName && (
                    <span className="pull-right text-muted" style={{ fontSize: '11px' }}>
                        {locationName}
                        {countryName ? ` (${countryName})` : ''}
                    </span>
                )}
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
                {hasCoords ? (
                    <>
                        <div
                            ref={mapContainerRef}
                            id="trial_location_map"
                            style={{ height: '280px', width: '100%' }}
                        />
                        {createPortal(
                            <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
                                <b>{locationName}</b>
                                {countryName && (
                                    <>
                                        <br />
                                        <span className="text-muted">{countryName}</span>
                                    </>
                                )}
                                <hr style={{ margin: '5px 0' }} />
                                <b>Latitude:</b> {latitude}
                                <br />
                                <b>Longitude:</b> {longitude}
                                {hasAltitude && (
                                    <>
                                        <br />
                                        <b>Altitude:</b> {altitude} m
                                    </>
                                )}
                                <br />
                                <small>
                                    <a
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
                    <div className="text-center text-muted" style={{ padding: '25px 15px' }}>
                        <span
                            className="glyphicon glyphicon-globe"
                            style={{ fontSize: '2em', marginBottom: '8px', color: '#bbb' }}
                        />
                        <p style={{ marginBottom: '4px' }}>
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
                    <div className="text-center text-muted" style={{ padding: '25px 15px' }}>
                        <span
                            className="glyphicon glyphicon-globe"
                            style={{ fontSize: '2em', marginBottom: '8px', color: '#bbb' }}
                        />
                        <p style={{ marginBottom: 0 }}>No location specified for this trial.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const init = (containerId: string, props: TrialLocationMapProps) => {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(<TrialLocationMap {...props} />);
    }
};
