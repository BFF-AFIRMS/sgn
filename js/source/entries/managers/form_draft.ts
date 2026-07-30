const $: JQueryStatic = (window as any).jQuery || (window as any).$;

/**
 * Primitive data types that can be stored in a form field draft state.
 */
export type FormPrimitiveValue = string | number | boolean | string[] | undefined | null;

/**
 * Key-value map representing serialized form field identifiers (ID or name) and their corresponding values.
 */
export type FormStateData = Record<string, FormPrimitiveValue>;

/**
 * Structure of draft data stored in localStorage.
 */
export interface DraftData {
    /** Epoch timestamp (in milliseconds) when the draft was last saved. */
    last_modified: number;
    /** Highest 0-indexed step index completed or reached by the user. */
    max_step?: number;
    /** Map of serialized form field keys and values. */
    data: FormStateData;
}

/**
 * Configuration for multi-step workflow navigation and URL step tracking.
 */
export interface FormWorkflowOptions {
    /** CSS selector for the workflow container element (e.g. '#trial_design_workflow'). */
    workflowSelector: string;
    /** CSS selector for identifying the currently active step element in the DOM (e.g. '.workflow-content > li.workflow-focus'). */
    stepSelector: string;
    /** Optional callback invoked when restoring or navigating to a workflow step. */
    onRestoreStep?: (step: number, draft: DraftData | null) => void;
}

/**
 * Options used to initialize a FormDraft manager instance.
 */
export interface FormDraftOptions {
    /** CSS selector for the form element to persist and restore. */
    formSelector: string;
    /** Prefix string for localStorage keys (e.g. 'trial_create_form_state_'). */
    draftPrefix: string;
    /** Optional workflow configuration for multi-step form workflows. */
    workflow?: FormWorkflowOptions;
}

/**
 * Maximum number of drafts to retain in localStorage per prefix before pruning older entries.
 */
const MAX_DRAFTS = 10;

/**
 * Manages form draft persistence in localStorage, URL state synchronization (draft_id and step),
 * and step navigation for multi-step workflows.
 */
export class FormDraft {
    private formSelector: string;
    private draftPrefix: string;
    private workflow?: FormWorkflowOptions;
    private draftId: string = '';
    /**
     * Tracks whether a `popstate` (browser back/forward navigation) event occurred.
     * When true, the next `updateStepInUrl()` call forces a new history state push
     * to truncate orphaned forward history states if the user edits form fields after navigating back.
     */
    private poppedState: boolean = false;
    private isRestoring: boolean = false;

    /**
     * Creates an instance of FormDraft and attaches a `popstate` window event listener
     * to handle browser history navigation (back/forward) for workflow steps.
     *
     * @param options - Configuration parameters for the form draft manager.
     */
    constructor(options: FormDraftOptions) {
        this.formSelector = options.formSelector;
        this.draftPrefix = options.draftPrefix;
        this.workflow = options.workflow;
        this.draftId = this.initUrlParams();

        window.addEventListener('popstate', () => {
            this.poppedState = true;
            const stepIndex = this.getStepFromUrl();
            this.navigateToStep(stepIndex);
        });
    }

    /**
     * Ensures `draft_id` and `step` parameters exist in the URL query parameters on initialization.
     *
     * @returns The resolved or newly generated draft ID string.
     */
    private initUrlParams(): string {
        const urlParams = new URLSearchParams(window.location.search);
        let draftId = urlParams.get('draft_id');
        let needsUpdate = false;

        if (!draftId) {
            draftId = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            urlParams.set('draft_id', draftId);
            needsUpdate = true;
        }

        if (!urlParams.has('step')) {
            urlParams.set('step', '1');
            needsUpdate = true;
        }

        if (needsUpdate) {
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            window.history.replaceState({ draftId, step: this.getStepFromUrl() }, '', newUrl);
        }

        return draftId;
    }

    /**
     * Retrieves the current 0-indexed workflow step index from the URL `step` parameter.
     *
     * @returns The 0-indexed step index parsed from the URL, or 0 if missing or invalid.
     */
    public getStepFromUrl(): number {
        const urlParams = new URLSearchParams(window.location.search);
        const stepStr = urlParams.get('step');
        if (stepStr) {
            const parsed = parseInt(stepStr, 10);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed - 1;
            }
        }
        return 0;
    }

    /**
     * Synchronizes the browser URL `step` query parameter with the active workflow step in the DOM.
     *
     * Automatically inspects and consumes `poppedState`. If a back-navigation occurred prior to
     * this sync, forces a `window.history.pushState()` call to truncate orphaned forward history.
     *
     * @returns The active 0-indexed step index, or undefined if no step selector is configured/found.
     */
    public updateStepInUrl(): number | undefined {
        const force = this.poppedState;
        this.poppedState = false;

        let stepIndex: number | undefined;
        if (this.workflow?.stepSelector) {
            const idx = $(this.workflow.stepSelector).index();
            if (idx >= 0) {
                stepIndex = idx;
            }
        }
        if (stepIndex === undefined) return undefined;

        const urlParams = new URLSearchParams(window.location.search);
        const currentUrlStep = urlParams.get('step');
        const newStepStr = String(stepIndex + 1);

        if (force || currentUrlStep !== newStepStr) {
            urlParams.set('step', newStepStr);
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            window.history.pushState({ draftId: urlParams.get('draft_id'), step: stepIndex }, '', newUrl);
        }

        return stepIndex;
    }

    /**
     * Navigates the workflow UI to the specified step index and triggers step restore callbacks.
     *
     * @param stepIndex - The 0-indexed target step index to focus.
     */
    public navigateToStep(stepIndex: number): void {
        if (stepIndex < 0 || !this.workflow) return;

        const draft = this.getDraftData();
        const $workflow = $(this.workflow.workflowSelector);
        if ($workflow.length) {
            const $progItems = $workflow.find('.workflow-prog > li');
            const maxStep = Math.max(stepIndex, draft?.max_step ?? 0);
            // Workflow.focus does not update the progress bar completed steps, so we update the 'workflow-complete' class here.
            $progItems.removeClass('workflow-complete');
            for (let i = 0; i < maxStep; i++) {
                $progItems.eq(i).addClass('workflow-complete');
            }

            const Workflow = (window as any).Workflow;
            if (Workflow && typeof Workflow.focus === 'function') {
                Workflow.focus(this.workflow.workflowSelector, stepIndex);
            }
        }

        if (this.workflow.onRestoreStep) {
            this.workflow.onRestoreStep(stepIndex, draft);
        }
    }

    /**
     * Retrieves the unique localStorage key for the current form draft.
     *
     * @returns The full localStorage key string (e.g. 'trial_create_form_state_1700000000_abc12').
     */
    public getDraftKey(): string {
        return `${this.draftPrefix}${this.draftId}`;
    }

    /**
     * Removes older draft records matching `draftPrefix` from localStorage if the total count exceeds MAX_DRAFTS.
     */
    public cleanupOldDrafts(): void {
        const drafts: { key: string; lastModified: number }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.indexOf(this.draftPrefix) === 0) {
                let lastModified = 0;
                try {
                    const itemStr = localStorage.getItem(key);
                    if (itemStr) {
                        const item = JSON.parse(itemStr) as DraftData;
                        if (item) {
                            lastModified = item.last_modified || 0;
                        }
                    }
                } catch (e) {
                    // ignore malformed item
                }
                drafts.push({ key, lastModified });
            }
        }
        if (drafts.length > MAX_DRAFTS) {
            drafts.sort((a, b) => b.lastModified - a.lastModified);
            for (let j = MAX_DRAFTS; j < drafts.length; j++) {
                localStorage.removeItem(drafts[j].key);
            }
        }
    }

    /**
     * Serializes input values from the target form and saves them to localStorage under the current draft key.
     *
     * Also prunes old drafts and invokes `updateStepInUrl()`.
     * 
     * This function should be called whenever the form state changes (e.g., on input change events) to persist the latest draft.
     */
    public saveFormState(): void {
        if (this.isRestoring) return;
        const $form = $(this.formSelector);
        if (!$form.length) return;

        const data: FormStateData = {};
        $form.find('input, select, textarea').each(function () {
            const $elem = $(this);
            const id = $elem.attr('id');
            const name = $elem.attr('name');
            const type = $elem.attr('type');
            if (!id && !name) return;
            const key = id || name;
            if (!key) return;

            if (type === 'checkbox' || type === 'radio') {
                data[key] = $elem.is(':checked');
            } else {
                data[key] = $elem.val() as FormPrimitiveValue;
            }
        });

        const currentStep = this.updateStepInUrl();
        const existingDraft = this.getDraftData();
        let maxStep = Math.max(existingDraft?.max_step ?? 0, currentStep ?? 0);
        if (currentStep === 1) {
            maxStep = 1;
        }

        const draft: DraftData = {
            last_modified: Date.now(),
            max_step: maxStep,
            data
        };

        localStorage.setItem(this.getDraftKey(), JSON.stringify(draft));
        this.cleanupOldDrafts();

        if (this.workflow) {
            const $workflow = $(this.workflow.workflowSelector);
            if ($workflow.length) {
                const $progItems = $workflow.find('.workflow-prog > li');
                $progItems.removeClass('workflow-complete');
                for (let i = 0; i < maxStep; i++) {
                    $progItems.eq(i).addClass('workflow-complete');
                }
            }
        }
    }

    /**
     * Fetches and parses the draft data object for the current form from localStorage.
     *
     * @returns The parsed DraftData object if present, or null if unreadable/absent.
     */
    public getDraftData(): DraftData | null {
        const stateStr = localStorage.getItem(this.getDraftKey());
        if (!stateStr) return null;

        try {
            return JSON.parse(stateStr) as DraftData;
        } catch (e) {
            return null;
        }
    }

    /**
     * Restores form input values from localStorage into the form DOM elements,
     * fires change events for each updated field, and navigates to the step specified in the URL.
     *
     * @returns The restored DraftData object, or null if no draft was found.
     */
    public restoreFormState(): DraftData | null {
        this.isRestoring = true;
        try {
            const draft = this.getDraftData();
            const $form = $(this.formSelector);

            if (draft && draft.data && $form.length) {
                const { data } = draft;

                for (const key in data) {
                    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
                    let $elem = $form.find('#' + key);
                    if (!$elem.length) {
                        $elem = $form.find('[name="' + key + '"]');
                    }
                    if (!$elem.length) continue;

                    const type = $elem.attr('type');
                    const val = data[key];
                    if (type === 'checkbox' || type === 'radio') {
                        $elem.prop('checked', Boolean(val));
                    } else {
                        $elem.val(val as string | number | string[]);
                    }
                    $elem.trigger('change');
                }
            }

            const currentStep = this.getStepFromUrl();
            this.navigateToStep(currentStep);

            return draft;
        } finally {
            this.isRestoring = false;
        }
    }

    /**
     * Removes the draft item for the current form from localStorage.
     */
    public clearDraft(): void {
        localStorage.removeItem(this.getDraftKey());
    }
}

(window as any).FormDraft = FormDraft;
