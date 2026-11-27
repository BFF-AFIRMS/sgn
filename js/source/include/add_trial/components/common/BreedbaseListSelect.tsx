import React from 'react';
import { verifyListById } from '../../services/trialService';
import { useBreedbaseLists } from '~/add_trial/contexts/BreedbaseListsContext';

interface BreedbaseListSelectProps {
    /**
     * The Breedbase list type to source options from (e.g. `accessions`).
     */
    listType: string;
    /**
     * The initially selected list id.
     */
    defaultValue: string;
    /**
     * Receives the selected list id.
     */
    onChange: (listId: string) => void;
    /**
     * The placeholder text for the `<select>` element.
     */
    placeholder?: string;
    /**
     * Whether the `<select>` element is required.
     */
    required?: boolean;
    /**
     * The id attribute for the container `<div>`.
     */
    id?: string;
    /**
     * The id attribute for the `<select>` element.
     */
    selectId?: string;
}

/**
 * A `<select>` of the Breedbase lists of a given type, paired with a refresh
 * button. Options are loaded and cached through `useBreedbaseLists`, and the
 * contents of the selected list are verified on change.
 */
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

    /**
     * Forwards the selection to `onChange` and, for a non-empty id, verifies the
     * selected list's contents against its list type, alerting on failure.
     *
     * @param listId The id of the newly selected list.
     */
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
