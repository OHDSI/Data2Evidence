import { expect, test } from 'vitest'
import { snakeToCamelCase, convertKeysToCamelCase } from './snakeToCamelCase'

test('snakeToCamelCase', () => {
  expect(snakeToCamelCase('a')).toBe('a')
  expect(snakeToCamelCase('a_b')).toBe('aB')
})

test('convertKeysToCamelCase', () => {
  expect(convertKeysToCamelCase({ a: 1 })).toStrictEqual({ a: 1 })
  expect(convertKeysToCamelCase({ a_b: 1 })).toStrictEqual({ aB: 1 })
  expect(convertKeysToCamelCase({ a_b: 1, c_d: 2 })).toStrictEqual({ aB: 1, cD: 2 })
  expect(convertKeysToCamelCase([{ a_b: 1 }, { c_d: 2 }])).toStrictEqual([{ aB: 1 }, { cD: 2 }])
  expect(
    convertKeysToCamelCase({ a_b: 1, c_d: 2, e_f: [{ g_h: 3, i_j: [{ k_l: 4 }] }] })
  ).toStrictEqual({
    aB: 1,
    cD: 2,
    eF: [{ gH: 3, iJ: [{ kL: 4 }] }]
  })
  expect(convertKeysToCamelCase({ test: ['ab'] })).toStrictEqual({ test: ['ab'] })
})
