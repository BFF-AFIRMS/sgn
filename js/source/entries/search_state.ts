/**
 * declarative search state utility
 * 
 * This module provides a highly reusable, framework-agnostic controller class
 * to handle serializing and deserializing search page form elements into the 
 * URL query parameters. This eliminates repetitive parameter parsing and 
 * auto-trigger logic across all search pages.
 */

/**
 * Configuration interface representing a single form element mapping.
 */
export interface ElementConfig {
    // jQuery selector targeting the DOM element
    selector: string;
    // Defines how the state should be interpreted from/to the DOM
    type?: 'text' | 'checkbox' | 'select' | 'multi-checkbox' | 'json';
    // Custom function to retrieve the value. 
    // Uses 'any' because custom components can return highly variable types (e.g., arrays, maps, nested objects).
    getValue?: () => any;
    // Custom function to set the value.
    // Uses 'any' to accommodate heterogeneous inputs.
    setValue?: (val: any) => void;
}

/**
 * Configuration parameters representing the overall layout state.
 */
export interface SearchStateConfig {
    // Declarative map of parameter keys to element configurations
    elements: Record<string, ElementConfig>;
    // Selector targeting the primary search submission button
    submitButtonSelector: string;
    // Selector targeting the reset button (if present)
    resetButtonSelector?: string;
    // Callback function to execute when a search is triggered
    onSearch?: () => void;
    // Callback function to execute when a reset is triggered
    onReset?: () => void;
}

export class SearchStateManager {
    private config: SearchStateConfig;

    constructor(config: SearchStateConfig) {
        this.config = config;
    }

    /**
     * Serializes current DOM states and custom components into a key-value map.
     * Iterates through the element registry to gather text, selections, checkboxes,
     * and complex JSON states.
     */
    public serialize(): Record<string, string> {
        const params: Record<string, string> = {};

        for (const [key, element] of Object.entries(this.config.elements)) {
            // 1. Process custom serialize overrides if defined (e.g., JSON structures)
            if (element.getValue) {
                const val = element.getValue();
                if (val !== undefined && val !== null && val !== '') {
                    params[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
                }
                continue;
            }

            // 2. Resolve standard DOM states via jQuery selectors
            const $el = jQuery(element.selector);
            if (!$el.length) continue;

            if (element.type === 'checkbox') {
                // Serializes boolean check states
                if ($el.is(':checked')) {
                    params[key] = 'true';
                }
            } else if (element.type === 'multi-checkbox') {
                // Serializes grouped checkbox arrays as comma-separated lists
                const checkedVals: string[] = [];
                $el.filter(':checked').each(function() {
                    const val = jQuery(this).val();
                    if (val) checkedVals.push(String(val));
                });
                if (checkedVals.length > 0) {
                    params[key] = checkedVals.join(',');
                }
            } else {
                // Serializes fallback text inputs, selects, and textareas
                const val = $el.val();
                if (val !== undefined && val !== null && val !== '') {
                    params[key] = String(val);
                }
            }
        }
        return params;
    }

    /**
     * Parses the current URL query string and populates mapped elements.
     * Iterates through configurations, identifies matched URL keys, updates fields,
     * and handles programmatically expanding collapsible advanced option panels.
     */
    public deserialize(): void {
        const urlParams = new URLSearchParams(window.location.search);

        for (const [key, element] of Object.entries(this.config.elements)) {
            const val = urlParams.get(key);
            if (val === null) continue;

            // Process custom deserialize overrides (e.g. nested JSON configs)
            if (element.setValue) {
                if (element.type === 'json') {
                    try {
                        element.setValue(JSON.parse(val));
                    } catch (e) {
                        console.error(`Error parsing JSON parameter for ${key}`, e);
                    }
                } else {
                    element.setValue(val);
                }
            } else {
                // Perform fallback updates on standard DOM fields
                const $el = jQuery(element.selector);
                if ($el.length) {
                    if (element.type === 'checkbox') {
                        $el.prop('checked', val === 'true');
                    } else if (element.type === 'multi-checkbox') {
                        const items = val.split(',');
                        $el.each(function() {
                            const currentVal = jQuery(this).val();
                            if (currentVal && items.includes(String(currentVal))) {
                                jQuery(this).prop('checked', true);
                            } else {
                                jQuery(this).prop('checked', false);
                            }
                        });
                    } else {
                        $el.val(val);
                    }
                }
            }

            // Auto-expand any collapsed parent panels for this element
            if (element.selector) {
                const $el = jQuery(element.selector);
                if ($el.length) {
                    const parents = $el.parents('[id$="_content"]');
                    const parentElements = parents.toArray().reverse();
                    for (const parent of parentElements) {
                        const id = jQuery(parent).attr('id');
                        if (id) {
                            const prefix = id.slice(0, -8); // remove '_content'
                            const $toggle = jQuery('#' + prefix + '_onswitch');
                            const isCollapsed = parent.style.display === 'none' || 
                                                (jQuery(parent).hasClass('collapse') && !jQuery(parent).hasClass('in') && !jQuery(parent).hasClass('show'));
                            if (isCollapsed && $toggle.length) {
                                $toggle.click();
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Serializes current input states and commits them into the URL query parameters
     * without triggering a disruptive page reload.
     */
    public updateUrl(): void {
        const urlParams = new URLSearchParams(window.location.search);

        // Clear out only the managed search parameters
        for (const key of Object.keys(this.config.elements)) {
            urlParams.delete(key);
        }

        // Merge in the newly serialized search state
        const searchParams = this.serialize();
        for (const [key, value] of Object.entries(searchParams)) {
            urlParams.set(key, value);
        }

        const qString = urlParams.toString();
        const nextUrl = qString ? '?' + qString : window.location.pathname;
        window.history.pushState(null, '', nextUrl);
    }

    /**
     * Resets form fields, clears query parameters in the URL, and triggers callback updates.
     */
    public reset(): void {
        for (const [key, element] of Object.entries(this.config.elements)) {
            if (element.setValue) {
                if (element.type === 'json') {
                    element.setValue({});
                } else {
                    element.setValue('');
                }
                continue;
            }

            const $el = jQuery(element.selector);
            if (!$el.length) continue;

            if (element.type === 'checkbox' || element.type === 'multi-checkbox') {
                $el.prop('checked', false);
            } else if ($el.is('select')) {
                $el.prop('selectedIndex', 0);
            } else {
                $el.val('');
            }
        }

        const urlParams = new URLSearchParams(window.location.search);

        // Purge only managed search parameters, leaving unmanaged keys intact
        for (const key of Object.keys(this.config.elements)) {
            urlParams.delete(key);
        }

        const qString = urlParams.toString();
        const nextUrl = qString ? '?' + qString : window.location.pathname;
        window.history.pushState(null, '', nextUrl);

        if (this.config.onReset) {
            this.config.onReset();
        }
    }

    /**
     * Mounts listeners, triggers state restorations, and executes auto-triggers.
     */
    public init(): void {
        // De-serialize and restore state from existing URL query parameters on load
        this.deserialize();

        // Intercept the search execution event to update query params and trigger callbacks
        jQuery(this.config.submitButtonSelector).on('click', () => {
            this.updateUrl();
            if (this.config.onSearch) {
                this.config.onSearch();
            }
        });

        // Intercept the reset execution event to clear states
        if (this.config.resetButtonSelector) {
            jQuery(this.config.resetButtonSelector).on('click', (e) => {
                e.preventDefault();
                this.reset();
            });
        }

        // Auto-trigger search if managed query parameters were restored on load
        const urlParams = new URLSearchParams(window.location.search);
        const hasManagedParams = Object.keys(this.config.elements).some(key => urlParams.has(key));
        if (hasManagedParams) {
            jQuery(this.config.submitButtonSelector).click();
        }
    }
}

/**
 * Factory helper method to initialize the state manager safely
 * 
 * @example
 * var searchManager = window.jsMod['search_state'].create({
 *     submitButtonSelector: '#search_submit',
 *     elements: {
 *         any_name: { selector: '#any_name_input' },
 *         type: { selector: '#type_select' }
 *     },
 *     onSearch: function() {
 *         // Reload Datatable here
 *         myTable.ajax.reload();
 *     }
 * });
 * searchManager.init();
 */
export function create(config: SearchStateConfig): SearchStateManager {
    return new SearchStateManager(config);
}
