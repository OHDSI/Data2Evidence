export const deepCopy = <T>(json: T): T => {
    return JSON.parse(JSON.stringify(json));
};
