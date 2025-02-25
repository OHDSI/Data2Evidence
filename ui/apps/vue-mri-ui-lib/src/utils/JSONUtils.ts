/**
 * @namespace
 * @classdesc Utility class for JSON/object related functionality.
 * @alias hc.hph.core.ui.JSONUtils
 */
export default {
  /**
   * Return an independent copy of a pure data object (functions will not be copied).
   * @param   {object} vJSON JSON object to be cloned
   * @returns {object} Indpendent JSON clone of input.
   */
  clone: vJSON => JSON.parse(JSON.stringify(vJSON)),

  /**
   * Traverse an object to get the property specified in the path.
   * If the path doesn't fit to the object's structure, returns null.
   * @param   {object}      mObject Hierarchical Object.
   * @param   {string}      sPath   A dot separated sequence of names that identifies the property
   * @returns {object|null} Property at the end of path or null.
   */
  getPropertyByPath: (mObject, sPath) => {
    if (typeof mObject !== 'object') {
      return null
    }
    const aPathSteps = sPath.split('.')
    // tslint:disable-next-line:no-increment-decrement
    for (let i = 0; i < aPathSteps.length; ++i) {
      const sKey = aPathSteps[i]
      if (!mObject.hasOwnProperty(sKey)) {
        return null
      }
      // tslint:disable-next-line:no-parameter-reassignment
      mObject = mObject[sKey]
    }
    return mObject
  },

  /**
   * Sets an object property to a given value, where the property is identified by a path.
   * If the property or the path does not exist, it will be created.
   * @param {object} mObject The object whose property to update
   * @param {string} sPath   A dot separated sequence of names that identifies the property
   * @param {any}    vValue  Value to be set
   */
  createPathInObject: (mObject, sPath, vValue) => {
    if (typeof mObject !== 'object') {
      return
    }
    const aPathSteps = sPath.split('.')
    let sKey
    let cursor = mObject
    for (let i = 0; i < aPathSteps.length - 1; i += 1) {
      sKey = aPathSteps[i]
      if (!cursor.hasOwnProperty(sKey)) {
        cursor[sKey] = {}
      }
      cursor = cursor[sKey]
    }
    cursor[aPathSteps[aPathSteps.length - 1]] = vValue
  },

  /**
   * Takes a json-object and returns a function that can iterate over the json object.
   * This function takes a path expression and returns all matching results in the json.
   *
   * A path expression is either a concrete path such as
   *    patient.conditions.acme.interactions
   * or it can contain wildcards. Wildcards are
   *   '*'  - exactly one level
   *   '**' - any level
   * Example:
   * patient.conditions.acme.interactions.*
   *  -> all interactions under acme
   * **.attributes
   *  -> all attributes
   * @param   {object}   mObject Object in which to resolve the path expression
   * @returns {function} Function that returns a array with objects for all sub-parts of the
   *                     object that match the
   *                     passed expression.
   */
  getJsonWalkFunction: mObject => {
    const mPathIndex = {}

    /**
     * Collect all paths through objects terminating at a non-array non-object.
     * @param {object} mCurrentObject Current object
     * @param {string} sCurrentPath   Part of the path
     */
    function collect(mCurrentObject, sCurrentPath) {
      mPathIndex[sCurrentPath] = mCurrentObject
      // Check if mCurrentObject is an object but not an Array
      if (typeof mCurrentObject === 'object' && !Array.isArray(mCurrentObject) && mCurrentObject !== null) {
        Object.keys(mCurrentObject)
          .sort()
          .forEach(sKey => {
            const sSubPath = sCurrentPath === '' ? sKey : `${sCurrentPath}.${sKey}`
            collect(mCurrentObject[sKey], sSubPath)
          })
      } else if (Array.isArray(mCurrentObject)) {
        // deal with arrays
        mCurrentObject.forEach((_, iIndex) => {
          const sSubPath = sCurrentPath === '' ? iIndex : `${sCurrentPath}.${iIndex}`
          collect(mCurrentObject[iIndex], sSubPath)
        })
      }
    }
    collect(mObject, '')

    /**
     * Construct the match extraction function to be returned
     * @param   {string}   sPath Dot separated path
     * @returns {object[]} Array holding an index for all paths matching the argument.
     */
    function getMatch(sPath) {
      if (sPath.match(/.\*\*$/g)) {
        throw new Error('no ** expression at end of path allowed')
      }
      const aPathParts = sPath.split('.')
      // Construct regular expression for matching paths
      const aRegexedParts = aPathParts.map(sPathSection => {
        switch (sPathSection) {
          case '**':
            return '[^\\.]+(?:\\.[^\\.]+)*'
          case '*':
            return '[^\\.]+'
          default:
            return sPathSection
        }
      })
      const rPath = new RegExp(`^${aRegexedParts.join('\\.')}$`)

      // Index all matching paths in object
      const aIndexes: any[] = []
      Object.keys(mPathIndex).forEach(sIndexedPath => {
        const bIsMatch = rPath.test(sIndexedPath)
        if (bIsMatch) {
          aIndexes.push({
            path: sIndexedPath,
            obj: mPathIndex[sIndexedPath],
          })
        }
      })
      return aIndexes
    }

    // Return function
    return getMatch
  },

  /**
   * Creates a hash for the given JSON object.
   * Note:
   * - The hash would differ, if the properties are added in a different order.
   * - E.g. the has for {a:1, b:2} does not equal the hash for {b:2, a:1}.
   * @param   {object} oJSON JSON object to hash
   * @returns {number} hash.
   */
  hashJSON: oJSON => {
    const sString = JSON.stringify(oJSON)
    let hash = 0
    let i
    let chr
    let len
    if (sString.length === 0) {
      return hash
    }
    // tslint:disable-next-line:ban-comma-operator
    for (i = 0, len = sString.length; i < len; i += 1) {
      chr = sString.charCodeAt(i)
      // tslint:disable-next-line:no-bitwise
      hash = (hash << 5) - hash + chr
      // tslint:disable-next-line:no-bitwise
      hash |= 0 // Convert to 32bit integer
    }
    return hash
  },
}
