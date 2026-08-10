import React, { useMemo } from 'react';
import { usePlotGrid } from '../contexts/PlotGridContext';
import { useLayoutConfig } from '../contexts/LayoutConfigContext';

interface NorthArrowProps {
}

export const NorthArrow: React.FC<NorthArrowProps> = ({ }) => {
    const {
        isTransposed,
        mapRotation
    } = usePlotGrid();
    const {
        invertRows,
        invertCols,
        northArrowAngle
    } = useLayoutConfig();

    const northArrowRotation = useMemo(() => {
        let angle = northArrowAngle + mapRotation;
        if (invertCols && invertRows) {
            return angle + 180;
        } else if (invertCols) {
            return -angle;
        } else if (invertRows) {
            return 180 - angle;
        }
        return angle;
    }, [northArrowAngle, mapRotation, invertCols, invertRows]);

    if (isTransposed) return null;

    return (
        <div
            className="tw:absolute tw:top-4 tw:right-4 tw:z-50 tw:flex tw:items-center tw:justify-center tw:pointer-events-none tw:bg-white/85 tw:rounded-full tw:border tw:border-[#ccc] tw:shadow-sm"
            style={{ width: '70px', height: '70px' }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 200 200"
                width="32"
                height="60"
                overflow="visible"
                style={{
                    transform: `rotate(${northArrowRotation}deg) translateY(-10px)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-out'
                }}
            >
                <path style={{ fill: '#ffffff', stroke: 'rgb(0, 0, 0)', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '7px' }} d="M 99.395 63.781 L 99.395 238.843 L 7.257 292.897 L 99.395 63.781 Z" />
                <path style={{ stroke: 'rgb(0, 0, 0)', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '7px', transformBox: 'fill-box', transformOrigin: '50% 50%' }} d="M 191.623 292.345 L 191.623 117.283 L 99.485 63.229 L 191.623 292.345 Z" transform="matrix(-1, 0, 0, -1, -0.000015, 0.000014)" />
                <text style={{ fontFamily: 'Roboto, sans-serif', fontSize: '70px', fontWeight: 572, whiteSpace: 'pre', fill: '#000000', transform: `rotate(${-northArrowRotation}deg)`, transformBox: 'fill-box', transformOrigin: 'center' }} x="76.43" y="35">N</text>
            </svg>
        </div>
    );
};
