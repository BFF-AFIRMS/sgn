declare global {
    interface JQuery {
        modal: (action: string) => void;
    }
}

export const showWorkingModal = () => {
    jQuery('#working_modal').modal('show');
};

export const hideWorkingModal = () => {
    jQuery('#working_modal').modal('hide');
};
