export const parseValueForPrototypePollutingAssignment = (
    value: string
): string => {
    if (typeof value !== "string") {
        throw new Error(`Invalid value (not a string):${value}`);
    }
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
