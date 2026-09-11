import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { usePlotGrid } from './PlotGridContext';
import { FieldMapContextProps } from '../types';

const CLICK_DRAG_THRESHOLD = 1;
const PAN_MAX_EMPTY_SPACE = 200;

export interface ZoomPanContextType {
	zoom: number;
	setZoom: React.Dispatch<React.SetStateAction<number>>;
	pan: { x: number; y: number };
	setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;

	isDragging: boolean;
	hasDragged: React.RefObject<boolean>;

	containerRef: React.RefCallback<HTMLElement | null>;

	handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
	handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
	handleMouseUpOrLeave: () => void;
	handleResetZoomPan: () => void;
	updateZoomAndPan: (nextZoom: number, targetPan?: { x: number; y: number }) => void;
}

const ZoomPanContext = createContext<ZoomPanContextType | undefined>(undefined);

export const ZoomPanProvider: React.FC<FieldMapContextProps> = ({ children }) => {
	const { svgDimensions: { width: svgWidth, height: svgHeight } } = usePlotGrid();

    const [zoom, setZoom] = useState<number>(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const hasDragged = useRef<boolean>(false);
    const dragStart = useRef<{
        startX: number;
        startY: number;
        panX: number;
        panY: number;
    } | null>(null);

    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;
    const panRef = useRef(pan);
    panRef.current = pan;

    // Stash the container element received by the containerRef callback for use in updateZoomAndPan
    const containerValueRef = useRef<HTMLElement | null>(null);

    const updateZoomAndPan = useCallback((
        nextZoom: number, 
        targetPan?: { x: number; y: number }
    ) => {
        const clampedZoom = Math.max(0.1, Math.min(5, nextZoom));
        if (!containerValueRef.current) {
            setZoom(clampedZoom);
            if (targetPan) setPan(targetPan);
            return;
        }
        const rect = containerValueRef.current.getBoundingClientRect();

        // Zoom around the center of the viewport if no target pan is provided
        if (!targetPan) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const mapX = (centerX - panRef.current.x) / zoomRef.current;
            const mapY = (centerY - panRef.current.y) / zoomRef.current;
            targetPan = {
                x: centerX - mapX * clampedZoom,
                y: centerY - mapY * clampedZoom
            };
        }

        const maxPanX = PAN_MAX_EMPTY_SPACE;
        const minPanX = rect.width - (svgWidth * clampedZoom) - PAN_MAX_EMPTY_SPACE;
        const maxPanY = PAN_MAX_EMPTY_SPACE;
        const minPanY = rect.height - (svgHeight * clampedZoom) - PAN_MAX_EMPTY_SPACE;

        setZoom(clampedZoom);
        setPan({
            x: Math.max(minPanX, Math.min(maxPanX, targetPan.x)),
            y: Math.max(minPanY, Math.min(maxPanY, targetPan.y))
        });
    }, [svgWidth, svgHeight]);

    const handleNativeWheel = useCallback((node: HTMLElement | null, e: WheelEvent) => {
        e.preventDefault();
        if (!node) return;

        // Get dimensions of the viewport container
        const rect = node.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        const currentZoom = zoomRef.current;
        const currentPan = panRef.current;

        // Determine target coordinates on the unscaled map corresponding to the cursor position
        const mapX = (cursorX - currentPan.x) / currentZoom;
        const mapY = (cursorY - currentPan.y) / currentZoom;

        const scaleFactor = 1.1;
        let nextZoom = e.deltaY < 0 ? currentZoom * scaleFactor : currentZoom / scaleFactor;
        nextZoom = Math.max(0.1, Math.min(5, nextZoom));

        // Recalculate pan to keep the point under the cursor stable
        const nextPanX = cursorX - mapX * nextZoom;
        const nextPanY = cursorY - mapY * nextZoom;

        updateZoomAndPan(nextZoom, { x: nextPanX, y: nextPanY });
    }, [updateZoomAndPan]);

    // Bind native non-passive wheel listener to allow e.preventDefault() and prevent window scroll
    const containerRef = useCallback((node: HTMLElement | null) => {
        containerValueRef.current = node;
        const handleWheel = (event: WheelEvent) => handleNativeWheel(node, event);

        if (node) {
            node.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (node) {
                node.removeEventListener('wheel', handleWheel);
                containerValueRef.current = null;
            }
        };
    }, [handleNativeWheel]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Only drag with primary mouse button
        if (e.button !== 0) return;
        setIsDragging(true);
        hasDragged.current = false;
        dragStart.current = {
            startX: e.clientX,
            startY: e.clientY,
            panX: panRef.current.x,
            panY: panRef.current.y
        };
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragStart.current) return;

        const dx = e.clientX - dragStart.current.startX;
        const dy = e.clientY - dragStart.current.startY;

        if (Math.abs(dx) > CLICK_DRAG_THRESHOLD || Math.abs(dy) > CLICK_DRAG_THRESHOLD) {
            hasDragged.current = true;
        }

        updateZoomAndPan(zoomRef.current, { x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    }, [updateZoomAndPan]);

    const handleMouseUpOrLeave = useCallback(() => {
        dragStart.current = null;
        setIsDragging(false);
    }, []);

    const handleResetZoomPan = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    return (
        <ZoomPanContext.Provider value={{
			zoom,
			setZoom,
			pan,
			setPan,
			isDragging,
			hasDragged,
			containerRef,
			handleMouseDown,
			handleMouseMove,
			handleMouseUpOrLeave,
			handleResetZoomPan,
			updateZoomAndPan
        }}>
            {children}
        </ZoomPanContext.Provider>
    );
};

export const useZoomPan = () => {
    const context = useContext(ZoomPanContext);
    if (!context) {
        throw new Error('useZoomPan must be used within a ZoomPanProvider');
    }
    return context;
};