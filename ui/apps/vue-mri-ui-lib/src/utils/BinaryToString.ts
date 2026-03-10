import pako from 'pako'

export default (binaryString: string) => {
  try {
    const decodedData = atob(binaryString)
    const inflated = pako.inflate(decodedData, { to: 'string' })
    return inflated
  } catch (error: unknown) {
    console.error('Failed to decode binary string:', error)
    throw error
  }
}
