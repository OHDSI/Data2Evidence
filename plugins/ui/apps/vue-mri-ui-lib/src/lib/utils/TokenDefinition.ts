/**
 * Container class holding patterns (RegExps) and associated classes for the tokenizer.
 * @constructor
 * @param {RegExp}   tokenPattern A regular expression describing this token. MUST start with ^.
 * @param {function} tokenClass   A class from which objects will be created when the tokenPattern matches.
 *                                The constructor gets the matched string as parameter.
 *
 * @classdesc
 * TokenDefinition class
 * @alias hc.mri.pa.ui.lib.utils.TokenDefinition
 */
export default class TokenDefinition {
  public tokenClass: any
  public tokenPattern: any
  constructor(tokenPattern, tokenClass) {
    this.tokenPattern = tokenPattern
    this.tokenClass = tokenClass
  }
}
