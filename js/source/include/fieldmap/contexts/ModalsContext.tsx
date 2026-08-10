import React, { createContext, useContext, useState } from 'react';
import { FieldMapContextProps } from '../context.types';

export interface ModalsContextType {
	showPlotDetails: boolean;
	setShowPlotDetails: React.Dispatch<React.SetStateAction<boolean>>;

	showEditAccession: boolean;
	setShowEditAccession: React.Dispatch<React.SetStateAction<boolean>>;

	showDimDialog: boolean;
	setShowDimDialog: React.Dispatch<React.SetStateAction<boolean>>;

	showCuratorWarning: boolean;
	setShowCuratorWarning: React.Dispatch<React.SetStateAction<boolean>>;

	showSuppressModal: boolean;
	setShowSuppressModal: React.Dispatch<React.SetStateAction<boolean>>;

	showDeleteTraitModal: boolean;
	setShowDeleteTraitModal: React.Dispatch<React.SetStateAction<boolean>>;

	showDownloadCSVModal: boolean;
	setShowDownloadCSVModal: React.Dispatch<React.SetStateAction<boolean>>;

	loading: boolean;
	setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const ModalsContext = createContext<ModalsContextType | undefined>(undefined);

export const ModalsProvider: React.FC<FieldMapContextProps> = ({ children }) => {
    const [showPlotDetails, setShowPlotDetails] = useState(false);
    const [showEditAccession, setShowEditAccession] = useState(false);
    const [showDimDialog, setShowDimDialog] = useState(false);
    const [showCuratorWarning, setShowCuratorWarning] = useState(false);
    const [showSuppressModal, setShowSuppressModal] = useState(false);
    const [showDeleteTraitModal, setShowDeleteTraitModal] = useState(false);
    const [showDownloadCSVModal, setShowDownloadCSVModal] = useState(false);

    const [loading, setLoading] = useState(false);

    return (
        <ModalsContext.Provider value={{
            showPlotDetails, setShowPlotDetails,
            showEditAccession, setShowEditAccession,
            showDimDialog, setShowDimDialog,
            showCuratorWarning, setShowCuratorWarning,
            showSuppressModal, setShowSuppressModal,
            showDeleteTraitModal, setShowDeleteTraitModal,
            showDownloadCSVModal, setShowDownloadCSVModal,
            loading, setLoading,
        }}>
            {children}
        </ModalsContext.Provider>
    );
};

export const useModals = () => {
    const context = useContext(ModalsContext);
    if (!context) {
        throw new Error('useModals must be used within a ModalsProvider');
    }
    return context;
};
