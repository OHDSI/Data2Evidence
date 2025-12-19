import CohortUrlCodec from '../CohortUrlCodec'

describe('CohortUrlCodec', () => {
  const sampleCohortDefinition = {
    name: 'Test Cohort',
    expression: {
      ConceptSets: [],
      PrimaryCriteria: {
        CriteriaList: [],
      },
    },
  }

  describe('compress()', () => {
    it('converts JSON object to base64url string', () => {
      const result = CohortUrlCodec.compress(sampleCohortDefinition)

      // Should return a string
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('produces URL-safe output (no +, /, = characters)', () => {
      const result = CohortUrlCodec.compress(sampleCohortDefinition)

      // Base64url replaces + with -, / with _, and removes =
      expect(result).not.toContain('+')
      expect(result).not.toContain('/')
      expect(result).not.toContain('=')
    })

    it('handles empty object', () => {
      const result = CohortUrlCodec.compress({})

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('handles large objects', () => {
      const largeCohort = {
        ...sampleCohortDefinition,
        expression: {
          ...sampleCohortDefinition.expression,
          ConceptSets: Array(100).fill({ id: 1, name: 'Concept' }),
        },
      }

      const result = CohortUrlCodec.compress(largeCohort)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('decompress()', () => {
    it('converts base64url string back to original JSON object', () => {
      const compressed = CohortUrlCodec.compress(sampleCohortDefinition)
      const decompressed = CohortUrlCodec.decompress(compressed)

      expect(decompressed).toEqual(sampleCohortDefinition)
    })

    it('handles empty object round-trip', () => {
      const compressed = CohortUrlCodec.compress({})
      const decompressed = CohortUrlCodec.decompress(compressed)

      expect(decompressed).toEqual({})
    })

    it('throws error for invalid base64url input', () => {
      expect(() => {
        CohortUrlCodec.decompress('not-valid-base64!!!')
      }).toThrow()
    })

    it('throws error for corrupted gzip data', () => {
      // Valid base64url but not valid gzip data
      expect(() => {
        CohortUrlCodec.decompress('aGVsbG8gd29ybGQ')
      }).toThrow()
    })

    it('throws error for invalid JSON', () => {
      // Create a compressed string that decompresses to invalid JSON
      const invalidJsonCompressed = CohortUrlCodec.compress({ test: 'value' })
      // Manually corrupt it to produce invalid JSON when decompressed
      // This is tricky - let's use a manually created case
      const invalidBase64 = 'eJwLycgsVgIABEQBNQ' // compresses to "test" which is invalid JSON

      expect(() => {
        CohortUrlCodec.decompress(invalidBase64)
      }).toThrow()
    })
  })

  describe('safeDecompress()', () => {
    it('returns success result with data for valid input', () => {
      const compressed = CohortUrlCodec.compress(sampleCohortDefinition)
      const result = CohortUrlCodec.safeDecompress(compressed)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(sampleCohortDefinition)
      }
    })

    it('returns error result for invalid base64url input', () => {
      const result = CohortUrlCodec.safeDecompress('not-valid-base64!!!')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(typeof result.error).toBe('string')
      }
    })

    it('returns error result for corrupted gzip data', () => {
      const result = CohortUrlCodec.safeDecompress('aGVsbG8gd29ybGQ')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })

    it('returns error result for invalid JSON', () => {
      const invalidBase64 = 'eJwLycgsVgIABEQBNQ'
      const result = CohortUrlCodec.safeDecompress(invalidBase64)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })

    it('returns error result for empty input', () => {
      const result = CohortUrlCodec.safeDecompress('')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })
  })

  describe('checkUrlLength()', () => {
    it('returns null for URL under 2048 characters', () => {
      const shortUrl = 'http://example.com/?query=abc123'
      const result = CohortUrlCodec.checkUrlLength(shortUrl)

      expect(result).toBeNull()
    })

    it('returns warning message for URL over 2048 characters', () => {
      const longUrl = 'http://example.com/?query=' + 'a'.repeat(2100)
      const result = CohortUrlCodec.checkUrlLength(longUrl)

      expect(result).not.toBeNull()
      expect(typeof result).toBe('string')
      expect(result).toContain('2048')
    })

    it('returns warning at exactly 2049 characters', () => {
      const url = 'a'.repeat(2049)
      const result = CohortUrlCodec.checkUrlLength(url)

      expect(result).not.toBeNull()
    })

    it('returns null at exactly 2048 characters', () => {
      const url = 'a'.repeat(2048)
      const result = CohortUrlCodec.checkUrlLength(url)

      expect(result).toBeNull()
    })
  })

  describe('Round-trip compression', () => {
    it('maintains data integrity for complex nested objects', () => {
      const complexCohort = {
        name: 'Complex Cohort',
        description: 'A cohort with nested structures',
        expression: {
          ConceptSets: [
            {
              id: 1,
              name: 'Diabetes',
              expression: {
                items: [
                  { concept: { id: 201826, name: 'Type 2 Diabetes' } },
                  { concept: { id: 201254, name: 'Type 1 Diabetes' } },
                ],
              },
            },
          ],
          PrimaryCriteria: {
            CriteriaList: [
              {
                ConditionOccurrence: {
                  CodesetId: 1,
                  Age: { Value: 18, Op: 'gte' },
                },
              },
            ],
          },
          AdditionalCriteria: {
            Type: 'ALL',
            Criterias: [],
          },
        },
      }

      const compressed = CohortUrlCodec.compress(complexCohort)
      const decompressed = CohortUrlCodec.decompress(compressed)

      expect(decompressed).toEqual(complexCohort)
    })

    it('handles special characters in strings', () => {
      const cohortWithSpecialChars = {
        name: 'Test with "quotes" and \'apostrophes\'',
        description: 'Includes: newlines\nand\ttabs',
        emoji: '🚀',
        unicode: 'Ω',
      }

      const compressed = CohortUrlCodec.compress(cohortWithSpecialChars)
      const decompressed = CohortUrlCodec.decompress(compressed)

      expect(decompressed).toEqual(cohortWithSpecialChars)
    })
  })

  describe('shareCohortDefinition()', () => {
    let mockStore: any

    beforeEach(() => {
      // Reset window location and clipboard mock before each test
      delete (window as any).location
      ;(window as any).location = {
        origin: 'http://localhost:3000',
        pathname: '/portal/researcher/cohort',
        search: '',
        href: 'http://localhost:3000/portal/researcher/cohort',
      }

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      })

      // Mock console methods
      jest.spyOn(console, 'log').mockImplementation(() => {})
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('returns null when no bookmark data exists', () => {
      mockStore = {
        getters: {
          getBookmarksData: null,
          getSelectedDataset: { id: 'dataset1' },
        },
      }

      const result = CohortUrlCodec.shareCohortDefinition(mockStore)

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('No cohort definition loaded. Please load a cohort definition first.')
    })

    it('returns null when bookmark data is empty object', () => {
      mockStore = {
        getters: {
          getBookmarksData: {},
          getSelectedDataset: { id: 'dataset1' },
        },
      }

      const result = CohortUrlCodec.shareCohortDefinition(mockStore)

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('No cohort definition loaded. Please load a cohort definition first.')
    })

    it('builds correct URL with dataset from bookmark', () => {
      const bookmarkData = {
        datasetId: 'bookmark-dataset',
        filter: {
          name: 'Test Cohort',
        },
      }

      mockStore = {
        getters: {
          getBookmarksData: bookmarkData,
          getSelectedDataset: { id: 'store-dataset' },
        },
      }

      const result = CohortUrlCodec.shareCohortDefinition(mockStore)

      expect(result).not.toBeNull()
      expect(result).toContain('http://localhost:3000/portal/researcher')
      expect(result).toContain('datasetId=bookmark-dataset')
      expect(result).toContain('route=cohort')
      expect(result).toContain('linkType=cohort-definition')
      expect(result).toContain('query=')
    })

    it('falls back to store dataset when bookmark has no datasetId', () => {
      const bookmarkData = {
        filter: {
          name: 'Test Cohort',
        },
      }

      mockStore = {
        getters: {
          getBookmarksData: bookmarkData,
          getSelectedDataset: { id: 'store-dataset' },
        },
      }

      const result = CohortUrlCodec.shareCohortDefinition(mockStore)

      expect(result).not.toBeNull()
      expect(result).toContain('datasetId=store-dataset')
    })

    it('returns null when no dataset available', () => {
      const bookmarkData = {
        filter: {
          name: 'Test Cohort',
        },
      }

      mockStore = {
        getters: {
          getBookmarksData: bookmarkData,
          getSelectedDataset: null,
        },
      }

      const result = CohortUrlCodec.shareCohortDefinition(mockStore)

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('No dataset ID found. Cannot generate deep link without a dataset.')
    })

    it('returns null when store dataset is undefined', () => {
      const bookmarkData = {
        filter: {
          name: 'Test Cohort',
        },
      }

      mockStore = {
        getters: {
          getBookmarksData: bookmarkData,
          getSelectedDataset: undefined,
        },
      }

      const result = CohortUrlCodec.shareCohortDefinition(mockStore)

      expect(result).toBeNull()
    })

    it('generates valid compressed query parameter', () => {
      const bookmarkData = {
        datasetId: 'dataset1',
        filter: {
          name: 'Test Cohort',
          expression: {
            ConceptSets: [],
          },
        },
      }

      mockStore = {
        getters: {
          getBookmarksData: bookmarkData,
          getSelectedDataset: { id: 'dataset1' },
        },
      }

      const result = CohortUrlCodec.shareCohortDefinition(mockStore)

      expect(result).not.toBeNull()

      // Extract query parameter and verify it can be decompressed
      const url = new URL(result!)
      const queryParam = url.searchParams.get('query')

      expect(queryParam).not.toBeNull()
      expect(queryParam!.length).toBeGreaterThan(0)

      // Verify query param can be decompressed back to original data
      const decompressed = CohortUrlCodec.decompress(queryParam!)
      expect(decompressed).toEqual(bookmarkData)
    })

    it('warns about long URLs', () => {
      // Create a large bookmark to generate a long URL
      const largeBookmark = {
        datasetId: 'dataset1',
        filter: {
          name: 'Large Cohort',
          expression: {
            ConceptSets: Array(200).fill({
              id: 1,
              name: 'Very Long Concept Name That Will Make The URL Very Long',
              expression: {
                items: Array(50).fill({
                  concept: {
                    id: 123456,
                    name: 'Long Concept Name',
                  },
                }),
              },
            }),
          },
        },
      }

      mockStore = {
        getters: {
          getBookmarksData: largeBookmark,
          getSelectedDataset: { id: 'dataset1' },
        },
      }

      const result = CohortUrlCodec.shareCohortDefinition(mockStore)

      expect(result).not.toBeNull()
      // Should warn if URL is long
      if (result!.length > 2048) {
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('2048'))
      }
    })

    it('handles errors during compression gracefully', () => {
      // Create a circular reference that will fail JSON.stringify
      const circularBookmark: any = {
        datasetId: 'dataset1',
        filter: {},
      }
      circularBookmark.filter.self = circularBookmark

      mockStore = {
        getters: {
          getBookmarksData: circularBookmark,
          getSelectedDataset: { id: 'dataset1' },
        },
      }

      const result = CohortUrlCodec.shareCohortDefinition(mockStore)

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('Failed to generate deep link:', expect.any(Error))
    })
  })
})
