import { readFileSync } from 'node:fs'
import path from 'path'

const rootPkg = path.resolve(__dirname, '../../../../package.json')
const { version } = JSON.parse(readFileSync(rootPkg, 'utf8')) as { version: string }

export const d2eVersionDefine = {
  __D2E_VERSION__: JSON.stringify(`v${version}`),
}
