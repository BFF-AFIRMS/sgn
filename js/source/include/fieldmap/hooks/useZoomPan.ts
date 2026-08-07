import { useState, useRef, useEffect } from 'react';

const CLICK_DRAG_THRESHOLD = 1;
const PAN_MAX_EMPTY_SPACE = 200;

export const useZoomPan = (svgWidth: number, svgHeight: number) => {
    const [zoom, setZoom] = useState<number>(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const hasDragged = useRef<boolean>(false);
    const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const updateZoomAndPan = (
        nextZoom: number, 
        targetPan?: { x: number; y: number }
    ) => {
        const clampedZoom = Math.max(0.1, Math.min(5, nextZoom));
        if (!containerRef.current) {
            setZoom(clampedZoom);
            if (targetPan) setPan(targetPan);
            return;
        }
        const rect = containerRef.current.getBoundingClientRect();

        // Zoom around the center of the viewport if no target pan is provided
        if (!targetPan) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const mapX = (centerX - pan.x) / zoom;
            const mapY = (centerY - pan.y) / zoom;
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
    };

    // Bind native non-passive wheel listener to allow e.preventDefault() and prevent window scroll
    useEffect(() => {
        const handleNativeWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (!containerRef.current) return;

            // Get dimensions of the viewport container
            const rect = containerRef.current.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;

            // Determine target coordinates on the unscaled map corresponding to the cursor position
            const mapX = (cursorX - pan.x) / zoom;
            const mapY = (cursorY - pan.y) / zoom;

            const scaleFactor = 1.1;
            let nextZoom = e.deltaY < 0 ? zoom * scaleFactor : zoom / scaleFactor;
            nextZoom = Math.max(0.1, Math.min(5, nextZoom));

            // Recalculate pan to keep the point under the cursor stable
            const nextPanX = cursorX - mapX * nextZoom;
            const nextPanY = cursorY - mapY * nextZoom;

            updateZoomAndPan(nextZoom, { x: nextPanX, y: nextPanY });
        };
        const element = containerRef.current;
        if (element) {
            element.addEventListener('wheel', handleNativeWheel, { passive: false });
        }
        return () => {
            if (element) {
                element.removeEventListener('wheel', handleNativeWheel);
            }
        };
    }, [zoom, pan, svgWidth, svgHeight]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only drag with primary mouse button
        if (e.button !== 0) return;
        setIsDragging(true);
        hasDragged.current = false;
        dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        if (!containerRef.current) return;

        // Calculate the raw next pan coordinates
        const nextX = e.clientX - dragStart.current.x;
        const nextY = e.clientY - dragStart.current.y;

        updateZoomAndPan(zoom, { x: nextX, y: nextY });

        const deltaX = Math.abs(e.clientX - (dragStart.current.x + pan.x));
        const deltaY = Math.abs(e.clientY - (dragStart.current.y + pan.y));
        if (deltaX > CLICK_DRAG_THRESHOLD || deltaY > CLICK_DRAG_THRESHOLD) {
            hasDragged.current = true;
        }
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    const handleResetZoomPan = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    return {
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
    };
};
