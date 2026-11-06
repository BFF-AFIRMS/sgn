interface FetchSettings {
	[key: string]: unknown;
}

const _serializeSettings = (obj: FetchSettings) => {
	const mapped: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null) {
			continue;
		}

		if (typeof value === 'boolean') {
			mapped[key] = value ? '1' : '0';
		} else {
			mapped[key] = String(value);
		}
	}
	return mapped;
}

interface HtmlSelectSettings extends FetchSettings {
	/**
	 * Should include an empty option in the select dropdown.
	 */
	empty?: boolean;
}

export interface HtmlSelectOption {
    value: string;
    label: string;
    title: string;
}

export const fetchSelectOptions = async (selectKey: string, settings: HtmlSelectSettings = { }): Promise<HtmlSelectOption[]> => {
	const query = new URLSearchParams({ empty: '1', ..._serializeSettings(settings) })
	try {
		const res = await fetch(`/ajax/html/select/${selectKey}?${query.toString()}`);
		const data = await res.json();
		if (!data?.select) {
			return [];
		}
		const doc = new DOMParser().parseFromString(data.select, 'text/html');
		return Array.from(doc.querySelectorAll('option')).map(opt => ({
			value: opt.value,
			label: opt.text,
			title: opt.title || opt.text,
		}));
	} catch {
		return [];
	}
};
