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
    onHeaderClick,
    className = ''
}) => {
    const evaluation = useMemo(() => evaluateAccordionSync(steps), [steps]);
    const effectiveMaxUnlocked = maxUnlocked !== undefined ? maxUnlocked : evaluation.maxUnlocked;
    const effectiveFailingMessage = firstFailingMessage !== undefined ? firstFailingMessage : evaluation.message;

    const [openPanels, setOpenPanels] = useState<Set<number>>(new Set([0]));

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
            {steps.map((sec, i) => {
                const isOpen = openPanels.has(i);
                const isLocked = i > effectiveMaxUnlocked;
                return (
                    <div
                        key={sec.id}
                        className="accordion-step-panel tw:mb-3.75"
                        id={`${id}_panel_${i}`}
                        data-step-index={i}
                    >
                        <table cellSpacing="0" cellPadding="0" className="sub_infosectionhead" summary="">
                            <tbody>
                                <tr>
                                    <td className="sub_infosectiontitle">
                                        <a
                                            className={`collapser tw:no-underline tw:hover:no-underline ${
                                                !isOpen ? 'collapsed' : ''
                                            } ${
                                                isLocked
                                                    ? 'accordion-locked tw:opacity-50 tw:cursor-help! [&_*]:tw:cursor-help!'
                                                    : 'tw:cursor-pointer'
                                            }`}
                                            onClick={() => handleHeaderClick(i)}
                                        >
                                            <span
                                                className={`glyphicon glyphicon-chevron-down collapser-chevron tw:inline-block tw:mr-2 tw:transition-transform tw:duration-200 tw:ease-in-out ${
                                                    !isOpen ? 'tw:-rotate-90' : 'tw:rotate-0'
                                                }`}
                                            ></span>
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
