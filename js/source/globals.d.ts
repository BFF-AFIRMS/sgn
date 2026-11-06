import type * as Leaflet from 'leaflet';
import type * as LeafletExtraMarkers from 'leaflet-extra-markers';
    
declare global {
    const L: typeof Leaflet & {
        ExtraMarkers: typeof LeafletExtraMarkers;
    };
}
