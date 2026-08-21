import React, { useMemo } from 'react';
import { useLayoutConfig } from '../contexts/LayoutConfigContext';
import { modulo } from '../utils/functions';

interface NorthArrowProps {
}

export const NorthArrow: React.FC<NorthArrowProps> = ({ }) => {
    const {
        invertRows,
        invertCols,
        northArrowAngle: angle
    } = useLayoutConfig();

    const transformedAngle = useMemo(() => {
        if (invertCols && invertRows) {
            return modulo(angle + 180, 360);
        } else if (invertCols) {
            return modulo(-angle, 360);
        } else if (invertRows) {
            return modulo(180 - angle, 360);
        }

        return modulo(angle, 360);
    }, [angle, invertCols, invertRows]);

    return (
        <div
            id="fieldmap_north_arrow"
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
                    transform: `rotate(${transformedAngle}deg) translateY(-10px)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-out'
                }}
            >
                <path style={{ fill: '#ffffff', stroke: 'rgb(0, 0, 0)', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '7px' }} d="M 99.395 63.781 L 99.395 238.843 L 7.257 292.897 L 99.395 63.781 Z" />
                <path style={{ stroke: 'rgb(0, 0, 0)', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '7px', transformBox: 'fill-box', transformOrigin: '50% 50%' }} d="M 191.623 292.345 L 191.623 117.283 L 99.485 63.229 L 191.623 292.345 Z" transform="matrix(-1, 0, 0, -1, -0.000015, 0.000014)" />
                <text style={{ fontFamily: 'Roboto, sans-serif', fontSize: '70px', fontWeight: 572, whiteSpace: 'pre', fill: '#000000', transform: `rotate(${-transformedAngle}deg)`, transformBox: 'fill-box', transformOrigin: 'center', transition: 'transform 0.2s ease-out' }} x="76.43" y="35">N</text>
            </svg>
        </div>
    );
};
