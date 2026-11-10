/**
 * Dropdown from https://readymadeui.com/tailwind-components/dropdowns
 * License: MIT
 * 
 * Adapted to TypeScript by Seth Traverse <setraver@ualberta.ca>
 */

import { ButtonHTMLAttributes, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, ButtonProps } from './Button';

export const Dropdown = ({ label, caret = true, children, ...props }: ButtonProps & { label: string | React.ReactNode, caret?: boolean }) => {
    const [menu, setMenu] = useState<"first" | "last" | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // The menu button pattern: Enter, Space or Down open the menu on its first item, Up on its last.
    // Disabled items stay in the menu, and are announced, but the arrow keys skip them.
    const items = () => [...menuRef?.current?.querySelectorAll("[role^=menuitem]") || []].filter((item) => item.getAttribute("aria-disabled") !== "true") as HTMLButtonElement[];
    const close = (refocus: boolean) => {
        setMenu(null);
        if (refocus) buttonRef.current?.focus();
    };

    // Opening: below the button when it fits, above it when there is more room there; lined up with
    // the button's right edge unless that would run off the left of the window. Then focus goes in.
    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;

        el.removeAttribute("data-side");
        el.removeAttribute("data-align");
        if (!menu) return;

        const box = buttonRef.current?.getBoundingClientRect();
        if (!box) return;

        const below = window.innerHeight - box.bottom;
        if (el.offsetHeight + 12 > below && box.top > below) el.setAttribute("data-side", "top");
        if (box.right - el.offsetWidth < 8) el.setAttribute("data-align", "start");
        const list = items();
        (menu === "last" ? list[list.length - 1] : list[0]).focus();
    }, [menu]);

    // A click:
    // - outside the menu closes it without restoring focus to the button.
    // - on an enabled menu item closes the menu and restores focus to the button.
    useEffect(() => {
        if (!menu) return undefined;
        const onClick = (event: MouseEvent) => {
            if (!wrapRef.current?.contains(event.target as Node)) {
                setMenu(null);
                return;
            }

            if (!(event.target instanceof Element)) {
                return;
            }

            const item = event.target.closest("[role^=menuitem]");
            if (!item || item.getAttribute("aria-disabled") === "true") {
                return;
            }
            close(true);
        };
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, [menu]);

    const onButtonKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        setMenu(event.key === "ArrowUp" ? "last" : "first");
    };
    const typed = useRef({ text: "", at: 0 });
    const onMenuKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const list = items();
        const active = document.activeElement;
        if (!(active instanceof HTMLButtonElement)) return;
        const i = list.indexOf(active);

        const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[event.key];
        if (to !== undefined) {
            event.preventDefault();
            list[(to + list.length) % list.length].focus();
        } else if (event.key === "Escape") {
            event.preventDefault();
            close(true);
        } else if (event.key === "Tab") {
            close(true);
        } else if (event.key === " " && active.tagName === "A") {
            event.preventDefault();
            active.click();
        } else if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = Date.now();
            typed.current = { text: now - typed.current.at > 500 ? event.key.toLowerCase() : typed.current.text + event.key.toLowerCase(), at: now };
            const text = typed.current.text;
            const from = text.length === 1 ? i + 1 : i;
            const match = [...list.slice(from), ...list.slice(0, from)].find((item) => (item.getAttribute("aria-label") || item.textContent).trim().toLowerCase().startsWith(text));
            if (match) match.focus();
        }
    };

    // The pointer moves the focus with it, so the keyboard carries on from the row under it.
    const onMenuPointer = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!(event.target instanceof Element)) return;

        const item = event.target.closest("[role^=menuitem]");
        if (!(item instanceof HTMLButtonElement)) return;

        if (item && item.getAttribute("aria-disabled") !== "true" && item !== document.activeElement) item.focus();
    };

    return (
        <div className="tw:flex tw:items-center tw:gap-2">
            <div ref={wrapRef} className="tw:relative">
                <Button ref={buttonRef} type="button" onClick={() => (menu ? close(true) : setMenu("first"))} onKeyDown={onButtonKey} aria-haspopup="menu" aria-expanded={menu ? "true" : "false"} aria-controls="dd-actions-menu" className="tw:group" {...props}>
                    {label}
                    {caret && (
                        <svg className="tw:size-4 tw:shrink-0 tw:text-neutral-600 tw:transition-transform tw:duration-150 tw:group-aria-expanded:rotate-180 tw:motion-reduce:transition-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    )}
                </Button>
                <div ref={menuRef} role="menu" aria-labelledby="dd-actions-button" data-open={menu ? "" : undefined} onKeyDown={onMenuKey} onPointerMove={onMenuPointer} className="tw:absolute tw:top-full tw:right-0 tw:z-30 tw:mt-1.5 tw:hidden tw:w-60 tw:origin-top tw:rounded-xl tw:bg-white tw:p-1 tw:shadow-lg tw:ring-1 tw:ring-neutral-950/10 tw:not-data-open:scale-95 tw:not-data-open:opacity-0 tw:data-open:block tw:data-[align=start]:right-auto tw:data-[align=start]:left-0 tw:data-[side=top]:top-auto tw:data-[side=top]:bottom-full tw:data-[side=top]:mt-0 tw:data-[side=top]:mb-1.5 tw:data-[side=top]:origin-bottom tw:motion-safe:transition-[opacity,scale,display] tw:motion-safe:transition-discrete tw:motion-safe:duration-150 tw:motion-safe:ease-out tw:motion-safe:starting:scale-95 tw:motion-safe:starting:opacity-0">
                    {children}
                </div>
            </div>
        </div>
    );
}

export type DropdownVariant = 'default' | 'danger';

const STYLES = {
    default: 'tw:text-neutral-950',
    danger: 'tw:text-[#d9534f]',
};

export const DropdownItem = ({ children, variant = 'default', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: DropdownVariant }) => (
    <button type='button' role="menuitem" className={`tw:flex tw:h-10 tw:w-full tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-md tw:px-2 tw:border-0 tw:bg-white tw:text-left tw:text-sm tw:whitespace-nowrap tw:transition-colors tw:duration-150 tw:select-none tw:hover:bg-neutral-100 tw:focus:bg-neutral-100 tw:focus:outline-hidden tw:aria-disabled:cursor-not-allowed tw:aria-disabled:opacity-50 tw:aria-disabled:hover:bg-transparent tw:motion-reduce:transition-none tw:sm:h-8 ${STYLES[variant]}`} {...props} >
        {children}
    </button>
);

export const DropdownSeparator = () => (
    <div role="separator" className="tw:my-1 tw:h-px tw:bg-neutral-200"></div>
);