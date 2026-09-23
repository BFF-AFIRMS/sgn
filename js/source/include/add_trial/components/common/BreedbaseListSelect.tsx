import React, { useEffect } from 'react';
import { useBreedbaseLists } from '../../hooks/useBreedbaseLists';

interface BreedbaseListSelectProps {
    listType: string;
    value: string;
    onChange: (listId: string) => void;
    placeholder?: string;
    required?: boolean;
    id?: string;
    selectId?: string;
}

export const BreedbaseListSelect: React.FC<BreedbaseListSelectProps> = ({
    listType,
    value,
    onChange,
    placeholder = '-- Select a list --',
    required = false,
    id,
    selectId
}) => {
    const { lists, loading, loadLists } = useBreedbaseLists(listType);

    useEffect(() => {
        const handleFocus = () => loadLists();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [loadLists]);

    return (
        <div id={id} className="tw:flex tw:items-center tw:gap-2">
            <select
                id={selectId}
                name={selectId}
                className="form-control"
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={loading && lists.length === 0}
                required={required}
            >
                <option value="">{loading && lists.length === 0 ? 'Loading lists...' : placeholder}</option>
                {lists.map(item => (
                    <option key={item.id} value={item.id}>
                        {item.name}
                    </option>
                ))}
            </select>
            <button
                type="button"
                className="btn btn-default btn-sm"
                onClick={() => loadLists()}
                title="Refresh list options"
                disabled={loading}
            >
                <span className={`glyphicon glyphicon-refresh ${loading ? 'tw:animate-spin' : ''}`}></span>
            </button>
            <a
                href="/list/manage"
                target="_blank"
                rel="noreferrer"
                className="btn btn-default btn-sm tw:whitespace-nowrap"
                title="Manage lists in new tab"
            >
                Manage Lists
            </a>
        </div>
    );
};
