/**
 * Enum builder.
 * @namespace
 * @alias hc.mri.pa.ui.lib.utils.Enum
 */
export default class Enum {
  public static build(...args) {
    const aListOfStates = args
    const mEnum = {}

    for (let i = 0; i < aListOfStates.length; i += 1) {
      const sNewStateName = aListOfStates[i]
      if (typeof mEnum[sNewStateName] !== 'undefined') {
        throw new Error('An identifier must not occur more than once in an enum!')
      }
      mEnum[sNewStateName] = i
    }

    return Object.freeze(mEnum)
  }
}
