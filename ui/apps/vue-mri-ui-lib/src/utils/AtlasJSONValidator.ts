import { criteriaSchema } from '../schema/criteriaSchema'

export function validateAtlasJson(input: string): { isValid: boolean; error: string | null; parsed: any } {
  try {
    const parsed = JSON.parse(input)
    criteriaSchema.parse(parsed)
    return { isValid: true, error: null, parsed }
  } catch (err: any) {
    return { isValid: false, error: err.message, parsed: null }
  }
}

