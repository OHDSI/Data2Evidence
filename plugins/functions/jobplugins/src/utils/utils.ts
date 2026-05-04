

export function sanitizeFileName(fileName: string): string {
    // Sanitize fileName for file name: allow only alphanumeric, dash, underscore
    const safeTemplateId = fileName.replace(/[^a-zA-Z0-9-_]/g, "");
    if (safeTemplateId !== fileName) {
        throw new Error('Invalid filename: contains unsafe characters');
    }
    return safeTemplateId;
}