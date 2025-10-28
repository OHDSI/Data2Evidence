export const parseValueForPrototypePollutingAssignment = (
    value: string
): string => {
    // Protect against Prototype-polluting assignment
    if (
        value === "__proto__" ||
        value === "constructor" ||
        value === "prototype"
    ) {
        throw new Error(`Invalid value:${value}`);
    }

    return value;
};
