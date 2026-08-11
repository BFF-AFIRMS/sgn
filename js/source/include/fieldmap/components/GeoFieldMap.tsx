import React, { useRef, useEffect } from 'react';
import { useSubmitGeoLayout } from '../hooks/useSubmitGeoLayout';
import { useView } from '../contexts/ViewContext';

declare const BrAPIFieldmap: any;

declare global {
	interface Window {
		geoFieldMapInstance: any;
	}
}

interface GeoFieldMapProps {
}

export const GeoFieldMap: React.FC<GeoFieldMapProps> = ({ }) => {
	const {
		selectedView,
		trialId,
		authToken,
	} = useView();

    const {
        submitGeoLayout,
    } = useSubmitGeoLayout();

    const geoMapRef = useRef<HTMLDivElement | null>(null);
    const leafletMapInstance = useRef<any>(null);

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
                window.geoFieldMapInstance = fmInstance;
            } catch (e) {
                console.error("Leaflet initialization failed", e);
            }
        }
        return () => {
            if (leafletMapInstance.current) {
                leafletMapInstance.current.remove();
                leafletMapInstance.current = null;
            }
            delete window.geoFieldMapInstance;
        };
    }, [selectedView, trialId, authToken]);
    return (
		<div key="geofieldmap-panel" className="panel panel-default">
			<div className="panel-body tw:flex tw:flex-col tw:gap-2.5">
				<div ref={geoMapRef} style={{ width: '100%', height: '600px' }}></div>
				<button className="btn btn-success tw:self-start" onClick={submitGeoLayout}>Submit Geo Layout Changes</button>
			</div>
		</div>
    );
};
