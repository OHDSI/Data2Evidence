/**
 * ANONYMOUS_BLOCK = wrap SQL statement a "DO BEGIN...END" clause
 * TEMP_RESULTSET = uses Temporary tables to store result sets
 * NESTED = uses nested SQL
 */
export const enum sqlFormat {
    ANONYMOUS_BLOCK,
    TEMP_RESULTSET,
    NESTED,
    COMBINE_COUNT
}
