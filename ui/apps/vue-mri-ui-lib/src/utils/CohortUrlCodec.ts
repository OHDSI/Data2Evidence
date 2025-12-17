import pako from 'pako'

/**
 * Result type for safe decompression operations
 */
export type DecompressResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * CohortUrlCodec - Utility for compressing/decompressing cohort definitions for URL encoding
 *
 * Uses pako deflate/inflate for compression and base64url encoding for URL safety.
 * Base64url is a URL-safe variant that replaces + with -, / with _, and removes = padding.
 */
class CohortUrlCodec {
  /**
   * Compress a cohort definition object to a URL-safe base64url string
   *
   * @param obj - The cohort definition object to compress
   * @returns Base64url-encoded compressed string
   */
  static compress(obj: unknown): string {
    // Convert object to JSON string
    const jsonString = JSON.stringify(obj)

    // Compress using pako deflate (same as StringToBinary.ts)
    const compressed = pako.deflate(jsonString, { to: 'string' })

    // Convert to base64
    const base64 = btoa(compressed)

    // Convert base64 to base64url (URL-safe)
    const base64url = this.toBase64Url(base64)

    return base64url
  }

  /**
   * Decompress a base64url string back to the original object
   *
   * @param base64url - The base64url-encoded compressed string
   * @returns The original object
   * @throws Error if decompression or JSON parsing fails
   */
  static decompress<T = unknown>(base64url: string): T {
    // Convert base64url back to base64
    const base64 = this.fromBase64Url(base64url)

    // Decode base64 to binary string
    const binaryString = atob(base64)

    // Decompress using pako inflate
    const decompressed = pako.inflate(binaryString, { to: 'string' })

    // Parse JSON
    const obj = JSON.parse(decompressed)

    return obj as T
  }

  /**
   * Safely decompress a base64url string with error handling
   *
   * @param base64url - The base64url-encoded compressed string
   * @returns Result object with success flag and either data or error message
   */
  static safeDecompress<T = unknown>(base64url: string): DecompressResult<T> {
    try {
      // Handle empty input
      if (!base64url || base64url.trim() === '') {
        return {
          success: false,
          error: 'Empty input provided',
        }
      }

      const data = this.decompress<T>(base64url)
      return {
        success: true,
        data,
      }
    } catch (error) {
      // Determine error type for better error messages
      let errorMessage = 'Failed to decompress data'

      if (error instanceof Error) {
        if (error.message.includes('atob')) {
          errorMessage = 'Invalid base64url encoding'
        } else if (error.message.includes('inflate') || error.message.includes('incorrect header')) {
          errorMessage = 'Corrupted or invalid compressed data'
        } else if (error.message.includes('JSON')) {
          errorMessage = 'Invalid JSON format after decompression'
        } else {
          errorMessage = error.message
        }
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Check if a URL exceeds the recommended length limit
   *
   * @param url - The full URL to check
   * @returns Warning message if URL is too long, null otherwise
   */
  static checkUrlLength(url: string): string | null {
    const MAX_URL_LENGTH = 2048

    if (url.length > MAX_URL_LENGTH) {
      return `Warning: URL length (${url.length} characters) exceeds recommended limit of ${MAX_URL_LENGTH} characters. Some browsers may not support URLs this long.`
    }

    return null
  }

  /**
   * Convert standard base64 to base64url (URL-safe variant)
   *
   * Base64url replaces:
   * - '+' with '-'
   * - '/' with '_'
   * - Removes '=' padding
   *
   * @param base64 - Standard base64 string
   * @returns Base64url string
   */
  private static toBase64Url(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  /**
   * Convert base64url back to standard base64
   *
   * @param base64url - Base64url string
   * @returns Standard base64 string
   */
  private static fromBase64Url(base64url: string): string {
    // Replace URL-safe characters back to standard base64
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')

    // Add padding if needed
    const padding = (4 - (base64.length % 4)) % 4
    base64 += '='.repeat(padding)

    return base64
  }
}

export default CohortUrlCodec
