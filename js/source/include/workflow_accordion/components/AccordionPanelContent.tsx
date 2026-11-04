import React, { useState } from 'react';

/**
 * Props for `AccordionPanelContent`.
 */
export interface AccordionPanelContentProps {
    /** DOM id of the collapsible wrapper, so callers can target the panel. */
    id: string;
    /** Whether the panel is expanded. */
    isOpen: boolean;
    /** The panel's content. */
    children: React.ReactNode;
}

/**
 * A single collapsible panel. It animates between collapsed and expanded by
 * transitioning its CSS `grid-template-rows` (0fr ↔ 1fr), staying visible
 * through the collapse so the animation plays rather than snapping shut.
 *
 * While transitioning or collapsed its content is clipped; once open and
 * settled the overflow is released so children such as dropdowns are not cut
 * off.
 */
export const AccordionPanelContent: React.FC<AccordionPanelContentProps> = ({ id, isOpen, children }) => {
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
    const [isTransitioning, setIsTransitioning] = useState(false);

    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        setIsTransitioning(true);
    }

    const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && e.propertyName === 'grid-template-rows') {
            setIsTransitioning(false);
        }
    };

    return (
        <div
            id={id}
                className={`accordion-collapse-wrapper collapse ${isOpen ? 'in' : ''} tw:grid! tw:transition-[grid-template-rows,visibility] tw:duration-350 tw:ease-in-out ${
                    isOpen
                    ? 'tw:grid-rows-[1fr] tw:visible'
                    : `tw:grid-rows-[0fr] ${isTransitioning ? 'tw:visible' : 'tw:invisible'}`
            }`}
            onTransitionEnd={handleTransitionEnd}
        >
            <div
                className={`accordion-collapse-inner tw:min-h-0 ${isTransitioning || !isOpen ? 'tw:overflow-hidden' : 'tw:overflow-visible'}`}
            >
                <div className="sub_infosectioncontent">{children}</div>
            </div>
        </div>
    );
};
