import { getPortalAPI } from './PortalUtils'

/**
 * Token types for variant constraint parsing
 */
enum TokenType {
  CHR = 0,
  COLON = 1,
  DASH = 2,
  NUMBER = 3,
}

/**
 * Token definition for the tokenizer
 */
interface TokenDefinition {
  pattern: RegExp
  tokenType: TokenType
}

/**
 * Matched token from tokenizer
 */
interface Token {
  type: TokenType
  value: string
}

/**
 * Parsed chromosome location result
 */
interface ChromosomeLocation {
  chromosomeId: string
  positionStart: number
  positionEnd: number
}

/**
 * Validation result from backend
 */
export interface ValidationResult {
  status: 'Valid' | 'Invalid'
  sProcess: 'validateGene' | 'validateChrom'
  [key: string]: any
}

/**
 * Token definitions for variant constraint patterns
 * Matches patterns like: chr1:12345-67890, chrX:100-200
 */
const tokenDefinitions: TokenDefinition[] = [
  { pattern: /^chr(1[0-9]|2[0-1]|[1-9]|x|y)/i, tokenType: TokenType.CHR },
  { pattern: /^:/, tokenType: TokenType.COLON },
  { pattern: /^-/, tokenType: TokenType.DASH },
  { pattern: /^\d+/, tokenType: TokenType.NUMBER },
]

/**
 * Expected pattern sequence: CHR : NUMBER - NUMBER
 * e.g., chr1:12345-67890
 */
const acceptedPattern = [TokenType.CHR, TokenType.COLON, TokenType.NUMBER, TokenType.DASH, TokenType.NUMBER]

/**
 * Tokenizer - splits input string into tokens
 */
function tokenize(input: string): Token[] {
  let remaining = input
  const tokens: Token[] = []

  while (remaining.length > 0) {
    let matched = false

    for (const def of tokenDefinitions) {
      const match = def.pattern.exec(remaining)
      if (match !== null) {
        const matchedString = match[0]
        remaining = remaining.substring(matchedString.length)
        tokens.push({
          type: def.tokenType,
          value: matchedString,
        })
        matched = true
        break
      }
    }

    if (!matched) {
      throw new Error('Could not match input.')
    }
  }

  return tokens
}

/**
 * Parser - validates token sequence matches expected pattern
 */
function parse(tokens: Token[]): ChromosomeLocation {
  if (tokens.length !== acceptedPattern.length) {
    throw new Error('Input did not match expected pattern.')
  }

  for (let i = 0; i < acceptedPattern.length; i++) {
    if (acceptedPattern[i] !== tokens[i].type) {
      throw new Error('Input did not match expected pattern.')
    }
  }

  // Extract values: CHR:NUMBER-NUMBER
  return {
    chromosomeId: tokens[0].value.toLowerCase().replace('chr', ''),
    positionStart: parseInt(tokens[2].value, 10),
    positionEnd: parseInt(tokens[4].value, 10),
  }
}

// Cache for validation results
const locationCache: Map<string, ValidationResult> = new Map()

/**
 * Get the analytics service URL
 */
function getServiceUrl(): string {
  const portalAPI = getPortalAPI()
  const baseUrl = portalAPI?.qeSvcUrl || process.env.VUE_APP_API_BASE_URL || ''
  return `${baseUrl}/pa/services/analytics.xsjs?action=genomics_values_service`
}

/**
 * Make authenticated API request
 */
async function makeRequest(data: Record<string, any>): Promise<any> {
  const portalAPI = getPortalAPI()
  const url = getServiceUrl()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json;charset=utf-8',
  }

  if (portalAPI) {
    const token = await portalAPI.getToken()
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json()
}

/**
 * VariantValidator - validates genomic variant notations
 *
 * Supports two types of input:
 * 1. Chromosome location: chr1:12345-67890, chrX:100-200
 * 2. Gene name: BRCA1, TP53 (any text that doesn't match chromosome pattern)
 */
export const VariantValidator = {
  /**
   * Validate a variant constraint token
   * @param tokenText - The variant text to validate (e.g., "chr1:12345-67890" or "BRCA1")
   * @returns Promise resolving to validation result
   */
  async validate(tokenText: string): Promise<ValidationResult> {
    // Check cache first
    const cached = locationCache.get(tokenText)
    if (cached) {
      return cached
    }

    let request: Record<string, any>

    try {
      // Try to parse as chromosome location
      const tokens = tokenize(tokenText)
      const parseResult = parse(tokens)
      request = {
        sChromName: parseResult.chromosomeId,
        iStartPos: parseResult.positionStart,
        iEndPos: parseResult.positionEnd,
        sProcess: 'validateChrom',
      }
    } catch {
      // Parse failed - treat as gene name
      request = {
        sGeneName: tokenText,
        sProcess: 'validateGene',
      }
    }

    const result = await makeRequest(request)

    // Cache the result
    result.sProcess = request.sProcess
    locationCache.set(tokenText, result)

    return result
  },

  /**
   * Get validation result from cache (synchronous)
   * @param tokenText - The variant text to look up
   * @returns Cached validation result or undefined
   */
  validateFromCache(tokenText: string): ValidationResult | undefined {
    return locationCache.get(tokenText)
  },

  /**
   * Clear the validation cache
   */
  clearCache(): void {
    locationCache.clear()
  },
}

export default VariantValidator
