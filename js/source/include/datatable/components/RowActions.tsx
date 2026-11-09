import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { DataTableRowAction } from '../types';
import { Button, Ellipses } from '~/@generic';

const MENU_WIDTH = 160;

interface DataTableRowActionsProps<TData> {
    actions: DataTableRowAction<TData>[];
    row: TData;
}

export function DataTableRowActions<TData extends Record<string, any>>({
    actions,
    row,
}: DataTableRowActionsProps<TData>) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!menuPosition) {
            return undefined;
        }
        // The menu is portalled with fixed coordinates, so it cannot follow the
        // button when the table (or the page) scrolls. Close instead of drift.
        const close = () => setMenuPosition(null);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [menuPosition]);

    const toggleMenu = () => {
        if (menuPosition) {
            setMenuPosition(null);
            return;
        }
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) {
            return;
        }
        setMenuPosition({
            top: rect.bottom + 4,
            left: Math.max(8, rect.right - MENU_WIDTH),
        });
    };

    return (
        <>
            <Button
                ref={buttonRef}
                variant="default-sm"
                aria-haspopup="true"
                aria-expanded={menuPosition !== null}
                aria-label="Row actions"
                onClick={toggleMenu}
            >
                <Ellipses />
            </Button>
            {menuPosition &&
                createPortal(
                    <>
                        <div
                            className="tw:fixed tw:inset-0 tw:z-9999"
                            onClick={() => setMenuPosition(null)}
                        />
                        <div
                            className="dropdown-menu tw:block"
                            style={{
                                position: 'fixed',
                                top: menuPosition.top,
                                left: menuPosition.left,
                                width: MENU_WIDTH,
                                zIndex: 10000,
                            }}
                        >
                            {actions.map(action => (
                                <li key={action.label}>
                                    <a
                                        className={
                                            action.variant === 'danger'
                                                ? 'tw:cursor-pointer tw:text-[#d9534f]'
                                                : 'tw:cursor-pointer'
                                        }
                                        onClick={() => {
                                            setMenuPosition(null);
                                            action.onClick(row);
                                        }}
                                    >
                                        {action.label}
                                    </a>
                                </li>
                            ))}
                        </div>
                    </>,
                    document.body,
                )}
        </>
    );
}
