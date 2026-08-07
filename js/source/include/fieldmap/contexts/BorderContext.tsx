import React, { createContext, useContext, useState } from 'react';

interface BorderContextType {
    topBorder: boolean;
    setTopBorder: (val: boolean) => void;
    bottomBorder: boolean;
    setBottomBorder: (val: boolean) => void;
    leftBorder: boolean;
    setLeftBorder: (val: boolean) => void;
    rightBorder: boolean;
    setRightBorder: (val: boolean) => void;
}

const BorderContext = createContext<BorderContextType | undefined>(undefined);

export const BorderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [topBorder, setTopBorder] = useState(false);
    const [bottomBorder, setBottomBorder] = useState(false);
    const [leftBorder, setLeftBorder] = useState(false);
    const [rightBorder, setRightBorder] = useState(false);

    return (
        <BorderContext.Provider value={{
            topBorder, setTopBorder,
            bottomBorder, setBottomBorder,
            leftBorder, setLeftBorder,
            rightBorder, setRightBorder
        }}>
            {children}
        </BorderContext.Provider>
    );
};

export const useBorder = () => {
    const context = useContext(BorderContext);
    if (!context) {
        throw new Error('useBorder must be used within a BorderProvider');
    }
    return context;
};
