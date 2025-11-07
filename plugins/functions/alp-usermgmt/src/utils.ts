import { INVITE_EXPIRY_SECONDS } from './const'
import crypto from 'crypto'

export const DateNow = () => new Date().toISOString()

export const isDev = Deno.env.get("NODE_ENV") === 'development'

export const getRandomString = (length: number) => {
  const buff = crypto.randomBytes(length + 2)
  const base64 = buff.toString('base64')
  return base64
    .toUpperCase()
    .replace(/\+|\/|=/g, '')
    .substring(0, length)
}

export const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

export const findDateDifference = (date: string) => {
  const currentDate = new Date().getTime()
  const convertedDate = new Date(date).getTime()
  return (currentDate - convertedDate) / 1000
}

export const checkInviteExpiry = (date: string): boolean => {
  if (findDateDifference(date) > INVITE_EXPIRY_SECONDS) {
    return true
  }
  return false
}

export const generateRandomString = (
  length = 10,
  charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
) => {
  let result = ''
  for (let i = 0, n = charset.length; i < length; ++i) {
    result += charset.charAt(Math.floor(Math.random() * n))
  }
  return result
}

const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const shuffle = (value: string) => {
  const array = value.split('')
  let tmp: string,
    current: number,
    top = array.length

  if (top)
    while (--top) {
      current = Math.floor(Math.random() * (top + 1))
      tmp = array[current]
      array[current] = array[top]
      array[top] = tmp
    }

  return array.join('')
}

export const generatePassword = () => {
  const maxLen = 10
  return getRandomString(maxLen)
}
