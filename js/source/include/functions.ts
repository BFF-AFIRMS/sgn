/**
 * Checks if a value is defined (not undefined or null).
 * @param value - The value to check for definition.
 * @returns True if the value is neither undefined nor null, otherwise false.
 */
export const isDefined = <T>(value: T | undefined | null): value is T => {
	return value !== undefined && value !== null;
};

/**
 * Converts an object of key-value pairs into URL search parameters.
 * @param mappings - An object containing key-value pairs to be converted into URL search parameters.
 * @returns A URLSearchParams object containing the provided mappings.
 */
export const buildParams = (mappings: Record<string, any>) => {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(mappings)) {
		if (isDefined(value)) {
			params.append(key, String(value));
		}
	}
	return params;
};