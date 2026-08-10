export interface FieldMapProps {
    trialId: string;
    trialStockType: string;
    hasColAndRowNumbers: boolean;
    hasSubplotEntries: boolean;
    hasPlantEntries: boolean;
    authToken?: string;
}

export interface FieldMapContextProps extends FieldMapProps {
	children: React.ReactNode;
}