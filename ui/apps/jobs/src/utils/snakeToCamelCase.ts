export const snakeToCamelCase = (str: string): string => {
  return str.replace(/([_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace('_', '')
  })
}

export const convertKeysToCamelCase = <T>(obj: any): T => {
  if (typeof obj === 'string') {
    // Typing as T even though it is string so type of result is T
    return obj as T
  }
  if (Array.isArray(obj)) {
    return obj.map((obj1) => convertKeysToCamelCase(obj1)) as T
  }
  const newObj: { [key: string]: any } = {}

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = snakeToCamelCase(key)

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        newObj[newKey] = convertKeysToCamelCase(obj[key])
      } else {
        newObj[newKey] = obj[key]
      }
    }
  }

  return newObj as T
}
