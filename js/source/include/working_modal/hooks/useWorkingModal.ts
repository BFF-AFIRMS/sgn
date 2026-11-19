import { useEffect } from 'react';
import { hideWorkingModal, showWorkingModal } from '../utils/workingModal';

export const useWorkingModal = (isLoading?: boolean) => {
    useEffect(() => {
        if (isLoading === undefined) return;
        if (isLoading) {
            showWorkingModal();
        } else {
            hideWorkingModal();
        }
        return () => {
            if (isLoading) {
                hideWorkingModal();
            }
        };
    }, [isLoading]);
};
