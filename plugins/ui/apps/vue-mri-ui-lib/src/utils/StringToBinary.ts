import pako from 'pako'

export default (stringToConvert: string) => btoa(pako.deflate(stringToConvert, { to: 'string' }))
