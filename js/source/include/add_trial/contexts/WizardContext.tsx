import {
    useWorkflowPaged,
    WorkflowPagedProvider,
    WorkflowPagedContextType
} from '../../workflow-paged';

export interface WizardContextType extends WorkflowPagedContextType {
    activeAccordionStep?: string;
    setActiveAccordionStep?: (step: string) => void;
}

export const useWizard = useWorkflowPaged as () => WizardContextType;
export const WizardProvider = WorkflowPagedProvider;
