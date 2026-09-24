import React, { useState, useEffect, useRef } from 'react';

export interface AccordionPanelContentProps {
    id: string;
    isOpen: boolean;
    children: React.ReactNode;
}

export const AccordionPanelContent: React.FC<AccordionPanelContentProps> = ({ id, isOpen, children }) => {
    const [isTransitioning, setIsTransitioning] = useState(false);
    const prevOpenRef = useRef(isOpen);

    useEffect(() => {
        if (prevOpenRef.current !== isOpen) {
            setIsTransitioning(true);
            prevOpenRef.current = isOpen;
        }
    }, [isOpen]);

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
