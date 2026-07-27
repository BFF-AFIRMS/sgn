const $: JQueryStatic = (window as any).jQuery || (window as any).$;

export type FormPrimitiveValue = string | number | boolean | string[] | undefined | null;
export type FormStateData = Record<string, FormPrimitiveValue>;

export interface DraftData {
    last_modified: number;
    current_step?: number;
    data: FormStateData;
}

export interface FormDraftOptions {
    formSelector: string;
    draftPrefix: string;
    stepSelector?: string;
    workflowSelector?: string;
    onRestoreStep?: (step: number, draft: DraftData) => void;
}

/**
 * Number of drafts to keep in localStorage. Older drafts will be removed when this limit is exceeded.
 */
const MAX_DRAFTS = 10;

export class FormDraft {
    private formSelector: string;
    private draftPrefix: string;
    private stepSelector?: string;
    private workflowSelector?: string;
    private onRestoreStep?: (step: number, draft: DraftData) => void;

    constructor(options: FormDraftOptions) {
        this.formSelector = options.formSelector;
        this.draftPrefix = options.draftPrefix;
        this.stepSelector = options.stepSelector;
        this.workflowSelector = options.workflowSelector;
        this.onRestoreStep = options.onRestoreStep;
    }

    public getDraftKey(): string {
        const urlParams = new URLSearchParams(window.location.search);
        let draftId = urlParams.get('draft_id');
        if (!draftId) {
            draftId = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            urlParams.set('draft_id', draftId);
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            window.history.replaceState(null, '', newUrl);
        }
        return `${this.draftPrefix}${draftId}`;
    }

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

    public saveFormState(): void {
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

        let currentStep: number | undefined;
        if (this.stepSelector) {
            const index = $(this.stepSelector).index();
            if (index >= 0) {
                currentStep = index;
            }
        }

        const draft: DraftData = {
            last_modified: Date.now(),
            current_step: currentStep,
            data
        };

        localStorage.setItem(this.getDraftKey(), JSON.stringify(draft));
        this.cleanupOldDrafts();
    }

    public restoreFormState(): DraftData | null {
        const stateStr = localStorage.getItem(this.getDraftKey());
        if (!stateStr) return null;
        let draft: DraftData;
        try {
            draft = JSON.parse(stateStr) as DraftData;
        } catch (e) {
            return null;
        }

        if (!draft || !draft.data) return null;
        const { data } = draft;

        const $form = $(this.formSelector);
        if (!$form.length) return draft;

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

        const currentStep = typeof draft.current_step !== 'undefined' ? draft.current_step : 0;
        if (currentStep > 0 && this.workflowSelector) {
            const Workflow = (window as any).Workflow;
            const $workflow = $(this.workflowSelector);
            if ($workflow.length) {
                for (let i = 0; i < currentStep; i++) {
                    $workflow.find('.workflow-prog > li').eq(i).addClass('workflow-complete');
                }
                if (Workflow && typeof Workflow.focus === 'function') {
                    Workflow.focus(this.workflowSelector, currentStep);
                }
            }
        }

        if (this.onRestoreStep && typeof currentStep !== 'undefined') {
            this.onRestoreStep(currentStep, draft);
        }

        return draft;
    }

    public clearDraft(): void {
        localStorage.removeItem(this.getDraftKey());
    }
}

if (typeof window !== 'undefined') {
    (window as any).FormDraft = FormDraft;
}
