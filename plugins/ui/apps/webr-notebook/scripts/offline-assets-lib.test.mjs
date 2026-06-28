import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveWheelClosure, buildSubsetPackagesIndex } from './offline-assets-lib.mjs'

test('resolveWheelClosure includes roots and transitive deps, deduped', () => {
  const lock = {
    packages: {
      requests: { file_name: 'requests-2.32.4-py3-none-any.whl', depends: ['urllib3', 'idna'] },
      urllib3: { file_name: 'urllib3-2.0-py3-none-any.whl', depends: [] },
      idna: { file_name: 'idna-3.0-py3-none-any.whl', depends: [] },
      six: { file_name: 'six-1.16-py3-none-any.whl', depends: [] },
    },
  }
  const files = resolveWheelClosure(lock, ['requests', 'six'])
  assert.deepEqual(
    [...files].sort(),
    [
      'idna-3.0-py3-none-any.whl',
      'requests-2.32.4-py3-none-any.whl',
      'six-1.16-py3-none-any.whl',
      'urllib3-2.0-py3-none-any.whl',
    ]
  )
})

test('resolveWheelClosure throws on a missing package', () => {
  assert.throws(() => resolveWheelClosure({ packages: {} }, ['nope']), /nope/)
})

test('buildSubsetPackagesIndex keeps wanted records + their dep closure', () => {
  const packages = [
    'Package: checkmate',
    'Version: 2.3.2',
    'Depends: backports',
    '',
    'Package: backports',
    'Version: 1.5.0',
    '',
    'Package: jsonlite',
    'Version: 1.8.9',
    '',
    'Package: unused',
    'Version: 9.9.9',
    '',
  ].join('\n')

  const subset = buildSubsetPackagesIndex(packages, ['checkmate', 'jsonlite'])
  assert.match(subset, /Package: checkmate/)
  assert.match(subset, /Package: backports/) // pulled in via Depends
  assert.match(subset, /Package: jsonlite/)
  assert.doesNotMatch(subset, /Package: unused/)
})
