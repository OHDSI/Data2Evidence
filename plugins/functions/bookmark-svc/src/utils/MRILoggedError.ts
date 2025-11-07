import { TextLib } from '@alp/alp-base-utils'

export default class MRILoggedError extends Error {
  constructor(public logId: string, public lang: string) {
    super(TextLib.getText('MRI_DB_LOGGED_MESSAGE', lang, [logId]))
    this.name = 'MRILoggedError'
  }
}
