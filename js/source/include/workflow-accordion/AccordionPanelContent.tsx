import React, { useState, useEffect, useRef } from 'react';

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
            className={`accordion-collapse-wrapper collapse ${isOpen ? 'in' : ''}`}
            style={{
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                visibility: isOpen || isTransitioning ? 'visible' : 'hidden'
            }}
            onTransitionEnd={handleTransitionEnd}
        >
            <div
                className="accordion-collapse-inner"
                style={{ overflow: isTransitioning || !isOpen ? 'hidden' : 'visible' }}
            >
                <div className="sub_infosectioncontent">{children}</div>
            </div>
        </div>
    );
};
