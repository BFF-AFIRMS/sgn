import { useMemo } from 'react';
import { GeneratedDesignPlot, TrialFormData } from '../types';

/**
 * Parses the design result held in the form draft into one design map per trial location.
 * 
 * The result's `design_json` is a JSON array whose entries are themselves stringified design
 * maps (keyed by plot id, plus a `treatments` key), so it is decoded twice; an absent or
 * malformed result yields an empty array rather than throwing.
 * 
 * Memoized on the design result, so the decoded maps keep a stable identity across re-renders
 * until a new design result is generated.
 * 
 * @param formData The wizard form data holding the design result.
 * @returns One decoded design map per trial location, or an empty array.
 */
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