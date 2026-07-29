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
    onRestoreStep?: (step: number, draft: DraftData | null) => void;
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
    private onRestoreStep?: (step: number, draft: DraftData | null) => void;

    constructor(options: FormDraftOptions) {
        this.formSelector = options.formSelector;
        this.draftPrefix = options.draftPrefix;
        this.stepSelector = options.stepSelector;
        this.workflowSelector = options.workflowSelector;
        this.onRestoreStep = options.onRestoreStep;

        if (typeof window !== 'undefined') {
            window.addEventListener('popstate', () => {
                const stepIndex = this.getStepFromUrl();
                this.navigateToStep(stepIndex, false);
            });
        }
    }

    public getStepFromUrl(): number {
        if (typeof window === 'undefined') return 0;
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

    public updateStepInUrl(stepIndex?: number, push: boolean = true): void {
        if (typeof window === 'undefined') return;
        if (typeof stepIndex === 'undefined' && this.stepSelector) {
            const idx = $(this.stepSelector).index();
            if (idx >= 0) {
                stepIndex = idx;
            }
        }
        if (typeof stepIndex === 'undefined' || stepIndex < 0) return;

        const urlParams = new URLSearchParams(window.location.search);
        const currentUrlStep = urlParams.get('step');
        const newStepStr = String(stepIndex + 1);

        if (currentUrlStep !== newStepStr) {
            urlParams.set('step', newStepStr);
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            if (push) {
                window.history.pushState({ draftId: urlParams.get('draft_id'), step: stepIndex }, '', newUrl);
            } else {
                window.history.replaceState({ draftId: urlParams.get('draft_id'), step: stepIndex }, '', newUrl);
            }
        }
    }

    public navigateToStep(stepIndex: number, updateUrl: boolean = false): void {
        if (stepIndex < 0 || !this.workflowSelector) return;

        const Workflow = (window as any).Workflow;
        const $workflow = $(this.workflowSelector);
        if ($workflow.length) {
            const $progItems = $workflow.find('.workflow-prog > li');
            $progItems.removeClass('workflow-complete');
            for (let i = 0; i < stepIndex; i++) {
                $progItems.eq(i).addClass('workflow-complete');
            }
            if (Workflow && typeof Workflow.focus === 'function') {
                Workflow.focus(this.workflowSelector, stepIndex);
            }
        }

        if (updateUrl) {
            this.updateStepInUrl(stepIndex, true);
        }

        const draft = this.getDraftData();
        if (this.onRestoreStep) {
            this.onRestoreStep(stepIndex, draft);
        }
    }

    public getDraftKey(): string {
        if (typeof window === 'undefined') return this.draftPrefix;
        const urlParams = new URLSearchParams(window.location.search);
        let draftId = urlParams.get('draft_id');
        let needsUpdate = false;

        if (!draftId) {
            draftId = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            urlParams.set('draft_id', draftId);
            needsUpdate = true;
        }

        const key = `${this.draftPrefix}${draftId}`;

        if (!urlParams.has('step')) {
            let defaultStep = 1;
            try {
                const itemStr = localStorage.getItem(key);
                if (itemStr) {
                    const item = JSON.parse(itemStr);
                    if (item && typeof item.current_step === 'number' && item.current_step >= 0) {
                        defaultStep = item.current_step + 1;
                    }
                }
            } catch (e) {
                // ignore
            }
            urlParams.set('step', String(defaultStep));
            needsUpdate = true;
        }

        if (needsUpdate) {
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            window.history.replaceState({ draftId, step: this.getStepFromUrl() }, '', newUrl);
        }

        return key;
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

        const draft: DraftData = {
            last_modified: Date.now(),
            data
        };

        localStorage.setItem(this.getDraftKey(), JSON.stringify(draft));
        this.cleanupOldDrafts();
        this.updateStepInUrl();
    }

    public getDraftData(): DraftData | null {
        if (typeof localStorage === 'undefined') return null;
        const stateStr = localStorage.getItem(this.getDraftKey());
        if (!stateStr) return null;
        try {
            return JSON.parse(stateStr) as DraftData;
        } catch (e) {
            return null;
        }
    }

    public restoreFormState(): DraftData | null {
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
        this.navigateToStep(currentStep, false);

        return draft;
    }

    public clearDraft(): void {
        localStorage.removeItem(this.getDraftKey());
    }
}

if (typeof window !== 'undefined') {
    (window as any).FormDraft = FormDraft;
}
