/**
 * Sets `bookmarkVersion` in a COHORT_DEFINITION_SYNTAX string. Only the server
 * sets this key, so the function replaces a value that is already there.
 * The key is not written when the version is not an integer. Set `pending` to
 * write `bookmarkVersion: null`.
 */
export const setBookmarkVersionInCohortSyntax = (
    syntax: string,
    bookmarkVersion: unknown,
    { pending = false }: { pending?: boolean } = {}
): string => {
    const parsed = JSON.parse(syntax);
    delete parsed.bookmarkVersion;
    if (pending) {
        parsed.bookmarkVersion = null;
    } else if (Number.isInteger(bookmarkVersion)) {
        parsed.bookmarkVersion = bookmarkVersion;
    }
    return JSON.stringify(parsed);
};
