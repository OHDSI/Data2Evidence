export const convertNameToPg = (name: string): string => {
    return name.toLowerCase().replace(".", "_");
};
