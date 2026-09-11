import { Plot } from '../types';

/**
 * @param plot The plot object to extract the accession name from.
 * @returns The accession name for the plot, prioritizing germplasm name, then cross name, then family name.
 */
export const plotAccessionName = (plot: Plot) =>
	plot.germplasmName ||
	plot.crossName ||
	plot.additionalInfo?.familyName || '';

/**
 * Creates a partial plot (mutation) with either the germplasm, cross, or family updated depending on
 * which type of accession information was originally present in the plot.
 * @param plot The original plot object.
 * @param newAccession The new accession name to update in the plot.
 * @param newAccessionId The new accession ID to update in the plot.
 * @returns A partial plot object with the updated information.
 */
export const plotAccessionMutation = (plot: Plot, newAccession: string, newAccessionId: string): Partial<Plot> => ({
	... (plot.germplasmName ? { germplasmName: newAccession, germplasmDbId: newAccessionId } : {}),
	... (plot.crossName ? { crossName: newAccession, crossDbId: newAccessionId } : {}),
	... (plot.additionalInfo?.familyName ? { additionalInfo: { ...plot.additionalInfo, familyName: newAccession, familyDbId: newAccessionId } } : {}),
});