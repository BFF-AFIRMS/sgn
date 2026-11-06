import React, { useState, useEffect } from 'react';

interface AccessionAutocompleteProps {
    /** The id attribute for the `<input>` element. */
    id?: string;
    /** The name attribute for the `<input>` element. */
    name?: string;
    /**
     * The input's value, and the term used to fetch suggestions; changing it
     * triggers a re-fetch.
     */
    defaultValue: string;
    /**
     * Called with the input's value as the user types, and again with a chosen
     * suggestion when one is picked.
     */
    onChange: (val: string) => void;
    /** The placeholder text for the `<input>` element. */
    placeholder?: string;
    /** The class attribute for the `<input>` element. */
    className?: string;
}

/**
 * A text input with a dropdown of accession-name suggestions from
 * `/ajax/stock/accession_autocomplete`. Suggestions are fetched (debounced) as
 * the value changes, and the value is reported through `onChange` as the user
 * types and when a suggestion is picked.
 */
export const AccessionAutocomplete: React.FC<AccessionAutocompleteProps> = ({
    id,
    name,
    defaultValue,
    onChange,
    placeholder,
    className
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (defaultValue.length < 1) {
            setSuggestions([]);
            return;
        }

        const controller = new AbortController();

        const delayDebounce = setTimeout(async () => {
            try {
                const res = await fetch(`/ajax/stock/accession_autocomplete?term=${encodeURIComponent(defaultValue)}`, {
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
    }, [defaultValue]);

    return (
        <div className="tw:relative">
            <input
                id={id}
                name={name}
                type="text"
                defaultValue={defaultValue}
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
