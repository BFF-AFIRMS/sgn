import React, { useState, useEffect } from 'react';

interface AccessionAutocompleteProps {
    id?: string;
    name?: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    appendToId?: string;
}

export const AccessionAutocomplete: React.FC<AccessionAutocompleteProps> = ({
    id,
    name,
    value,
    onChange,
    placeholder,
    className
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (value.length < 1) {
            setSuggestions([]);
            return;
        }

        const controller = new AbortController();

        const delayDebounce = setTimeout(async () => {
            try {
                const res = await fetch(`/ajax/stock/accession_autocomplete?term=${encodeURIComponent(value)}`, {
                    signal: controller.signal
                });
                if (!res.ok) return;
                const data: unknown = await res.json();
                if (controller.signal.aborted) return;

                if (Array.isArray(data)) {
                    const list = data.map(item => {
                        if (typeof item === 'string') return item;
                        if (item && typeof item === 'object') {
                            return (item as { label?: string; value?: string }).label || (item as { label?: string; value?: string }).value || '';
                        }
                        return '';
                    });
                    setSuggestions(list.filter(Boolean));
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return;
                }
            }
        }, 300);

        return () => {
            clearTimeout(delayDebounce);
            controller.abort();
        };
    }, [value]);

    return (
        <div className="tw:relative">
            <input
                id={id}
                name={name}
                type="text"
                value={value}
                onChange={e => { onChange(e.target.value); setShow(true); }}
                onBlur={() => setTimeout(() => setShow(false), 200)}
                placeholder={placeholder}
                className={className}
            />
            {show && suggestions.length > 0 && (
                <ul className="dropdown-menu tw:block! tw:w-full tw:max-h-50 tw:overflow-y-auto tw:z-1000">
                    {suggestions.map((s, idx) => (
                        <li key={idx} onMouseDown={() => { onChange(s); setShow(false); }} className="tw:cursor-pointer">
                            <a>{s}</a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
