import { useMemo } from 'react';
import { GeneratedDesignPlot, TrialFormData } from '../types';

export const useParsedDesign = (formData: TrialFormData): Record<string, GeneratedDesignPlot>[] => {
	const result = formData.designResult ?? null;

    const parsedDesigns = useMemo(() => {
		if (!result?.design_json) {
			return [];
		}

        try {
            const raw: string[] = JSON.parse(result.design_json);
            return raw.map(item => JSON.parse(item));
        } catch {
            return [];
        }
    }, [result]);

    return parsedDesigns;
}