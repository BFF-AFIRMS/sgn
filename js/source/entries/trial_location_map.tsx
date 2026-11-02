import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { isDefined } from '~/functions';

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
    const hasAltitude = typeof altitude === 'number' && Number.isFinite(altitude);

    useEffect(() => {
        if (!mapContainerRef.current || !hasCoords) {
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

        const map = L.map(mapContainerRef.current, {
            center: [latitude, longitude],
            zoom: 10, // 10 ~= 153 m / pixel at equator
            layers: [satelliteLayer],
        });

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
    }, [latitude, longitude, popupContainer]);

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
