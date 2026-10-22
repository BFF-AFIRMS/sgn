export const alertWarnings = (warningList?: string[] | string): void => {
    if (!warningList) return;
    if (Array.isArray(warningList)) {
        if (warningList.length > 0) {
            alert(warningList.join('\n'));
        }
    } else if (typeof warningList === 'string' && warningList.trim().length > 0) {
        alert(warningList);
    }
};
