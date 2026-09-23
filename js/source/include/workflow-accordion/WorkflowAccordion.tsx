import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AccordionWorkflowStep, WorkflowAccordionProps } from './types';
import { AccordionPanelContent } from './AccordionPanelContent';

export const evaluateAccordionSync = (steps: AccordionWorkflowStep[]): {
    valid: boolean;
    failingIndex: number;
    message: string | null;
    maxUnlocked: number;
} => {
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.validate) {
            const res = step.validate();
            if (!res.valid) {
                return {
                    valid: false,
                    failingIndex: i,
                    message: res.error || res.message || 'Validation failed',
                    maxUnlocked: i
                };
            }
        }
    }
    return {
        valid: true,
        failingIndex: steps.length,
        message: null,
        maxUnlocked: steps.length
    };
};

export const WorkflowAccordion: React.FC<WorkflowAccordionProps> = ({
    id = 'workflow_accordion',
    steps,
    maxUnlocked,
    firstFailingMessage,
    openPanels: controlledOpenPanels,
    onOpenPanelsChange,
    onHeaderClick,
    className = ''
}) => {
    const evaluation = useMemo(() => evaluateAccordionSync(steps), [steps]);
    const effectiveMaxUnlocked = maxUnlocked !== undefined ? maxUnlocked : evaluation.maxUnlocked;
    const effectiveFailingMessage = firstFailingMessage !== undefined ? firstFailingMessage : evaluation.message;

    const [internalOpenPanels, setInternalOpenPanels] = useState<Set<number>>(new Set([0]));
    const openPanels = controlledOpenPanels !== undefined ? controlledOpenPanels : internalOpenPanels;
    const setOpenPanels = onOpenPanelsChange || setInternalOpenPanels;

    const prevMaxUnlockedRef = useRef<number>(0);

    useEffect(() => {
        const prevMax = prevMaxUnlockedRef.current;
        if (effectiveMaxUnlocked > prevMax) {
            setOpenPanels((prev: Set<number>) => {
                const next = new Set(prev);
                for (let j = prevMax + 1; j <= effectiveMaxUnlocked && j < steps.length; j++) {
                    next.add(j);
                }
                return next;
            });
        } else if (effectiveMaxUnlocked < prevMax) {
            setOpenPanels((prev: Set<number>) => {
                const next = new Set<number>();
                prev.forEach(idx => {
                    if (idx <= effectiveMaxUnlocked) next.add(idx);
                });
                return next;
            });
        }
        prevMaxUnlockedRef.current = effectiveMaxUnlocked;
    }, [effectiveMaxUnlocked, steps.length, setOpenPanels]);

    const handleHeaderClick = (idx: number) => {
        if (onHeaderClick) {
            onHeaderClick(idx);
            return;
        }

        if (idx > effectiveMaxUnlocked) {
            alert(effectiveFailingMessage || 'Please complete preceding steps first.');
            return;
        }

        setOpenPanels((prev: Set<number>) => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
            }
            return next;
        });
    };

    return (
        <div className={`panel-group accordion-workflow ${className}`} id={id}>
            <style>{`
                .accordion-workflow .accordion-step-panel {
                    margin-bottom: 15px;
                }
                .accordion-workflow .accordion-locked {
                    opacity: 0.5;
                    cursor: help !important;
                }
                .accordion-workflow .accordion-locked * {
                    cursor: help !important;
                }
                .accordion-workflow .accordion-collapse-wrapper {
                    display: grid !important;
                    grid-template-rows: 0fr;
                    transition: grid-template-rows 0.35s ease-in-out, visibility 0.35s ease-in-out;
                    visibility: hidden;
                }
                .accordion-workflow .accordion-collapse-wrapper.in {
                    grid-template-rows: 1fr;
                    visibility: visible;
                }
                .accordion-workflow .accordion-collapse-inner {
                    overflow: hidden;
                    min-height: 0;
                }
                .collapser-chevron {
                    transition: transform 0.2s ease-in-out;
                    margin-right: 8px;
                    display: inline-block;
                }
                .collapsed .collapser-chevron {
                    transform: rotate(-90deg);
                }
            `}</style>

            {steps.map((sec, i) => {
                const isOpen = openPanels.has(i);
                const isLocked = i > effectiveMaxUnlocked;
                return (
                    <div
                        key={sec.id}
                        className="accordion-step-panel"
                        id={`${id}_panel_${i}`}
                        data-step-index={i}
                    >
                        <table cellSpacing="0" cellPadding="0" className="sub_infosectionhead" summary="">
                            <tbody>
                                <tr>
                                    <td className="sub_infosectiontitle">
                                        <a
                                            className={`collapser collapser_show ${!isOpen ? 'collapsed' : ''} ${isLocked ? 'accordion-locked' : ''}`}
                                            style={{ textDecoration: 'none', cursor: isLocked ? 'help' : 'pointer' }}
                                            onClick={() => handleHeaderClick(i)}
                                        >
                                            <span className="glyphicon glyphicon-chevron-down collapser-chevron"></span>
                                            <span className="collapser-label">{sec.title}</span>
                                        </a>
                                    </td>
                                    <td className="sub_infosectionsubtitle" role="button" tabIndex={0}>&nbsp;</td>
                                </tr>
                            </tbody>
                        </table>
                        <AccordionPanelContent
                            id={`${id}_collapse_${i}_content`}
                            isOpen={isOpen}
                        >
                            {sec.component || sec.content}
                        </AccordionPanelContent>
                    </div>
                );
            })}
        </div>
    );
};
