import React, { useState, useEffect } from 'react';

interface AccessionAutocompleteProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    appendToId?: string;
}

export const AccessionAutocomplete: React.FC<AccessionAutocompleteProps> = ({
    value,
    onChange,
    placeholder,
    className
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (value.length < 2) {
            setSuggestions([]);
            return;
        }
        const delayDebounce = setTimeout(() => {
            fetch(`/ajax/stock/accession_autocomplete?term=${encodeURIComponent(value)}`)
                .then(res => res.json())
                .then((data: unknown) => {
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
                })
                .catch(() => {});
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [value]);

    return (
        <div className="tw:relative">
            <input
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
