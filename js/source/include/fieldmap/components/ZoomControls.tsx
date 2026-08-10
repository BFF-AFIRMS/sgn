import React from 'react';
import { useZoomPan } from '../contexts/ZoomPanContext';

interface ZoomControlsProps {
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ }) => {
    const { zoom, updateZoomAndPan, handleResetZoomPan } = useZoomPan();

    return (
        <div className="tw:absolute tw:bottom-4 tw:right-4 tw:z-50 tw:flex tw:flex-col tw:gap-1 tw:bg-white/80 tw:p-1.5 tw:rounded-md tw:border tw:border-[#ccc] tw:shadow-sm">
            <button 
                className="btn btn-default btn-xs tw:font-bold" 
                onClick={() => updateZoomAndPan(zoom * 1.2)}
                title="Zoom In"
            >+</button>
            <button 
                className="btn btn-default btn-xs tw:font-bold" 
                onClick={() => updateZoomAndPan(zoom / 1.2)}
                title="Zoom Out"
            >-</button>
            <button
                className="btn btn-default btn-xs tw:text-[10px]" 
                onClick={handleResetZoomPan}
                title="Reset View"
            >Reset</button>
        </div>
    );
};
