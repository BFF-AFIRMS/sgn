import React from 'react';
import { useBreedbaseLists } from '../../hooks/useBreedbaseLists';
import { verifyListById } from '../../services/trialService';

interface BreedbaseListSelectProps {
    listType: string;
    defaultValue: string;
    onChange: (listId: string) => void;
    placeholder?: string;
    required?: boolean;
    id?: string;
    selectId?: string;
}

export const BreedbaseListSelect: React.FC<BreedbaseListSelectProps> = ({
    listType,
    defaultValue,
    onChange,
    placeholder = '-- Select a list --',
    required = false,
    id,
    selectId
}) => {
    const { lists, loading, loadLists } = useBreedbaseLists(listType);

    const handleChange = (listId: string) => {
        onChange(listId);
        if (!listId) {
            return;
        }
        verifyListById(listId, listType).catch(err => {
            alert(err instanceof Error ? err.message : String(err));
        });
    };

    return (
        <div id={id} className="tw:flex tw:items-center tw:gap-2">
            <select
                id={selectId}
                name={selectId}
                className="form-control"
                defaultValue={defaultValue}
                onChange={e => handleChange(e.target.value)}
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
        </div>
    );
};
