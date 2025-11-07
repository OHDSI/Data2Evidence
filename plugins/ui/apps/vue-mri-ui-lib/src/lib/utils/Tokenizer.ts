const tokenizerError = function (message) {
  this.message = message
  this.stack = new Error().stack
}

tokenizerError.prototype = Object.create(Error.prototype)
tokenizerError.prototype.constructor = tokenizerError
tokenizerError.prototype.name = 'TokenizerError'

/**
 * A very simple tokenizer.
 * @constructor
 * @param {hc.mri.pa.ui.lib.utils.TokenDefinition[]} tokenDefinitions List of token definitions used by the
 *                                                                     Tokenizer to tokenize strings.
 *
 * @classdesc
 * Tokenizer class
 * @alias hc.mri.pa.ui.lib.utils.Tokenizer
 */
export default class Tokenizer {
  private listOfMatchedTokens: any[]
  private tokenDefinitions: any[]
  private input: string

  constructor(tokenDefinitions: any[]) {
    this.tokenDefinitions = tokenDefinitions
  }

  /**
   * Tokenizes a string.
   * @throws  {TokenizerError} If no token matched.
   * @param   {string}   sInput The string to be tokenized.
   * @returns {object[]} An array of objects containing classes according to the recognized token definitions.
   */
  public tokenize(sInput) {
    this.input = sInput
    this.listOfMatchedTokens = []

    while (this.input.length > 0) {
      let bNoTokenMatched = true

      bNoTokenMatched = this.tokenDefinitions.every(this.checkIfTokenDefinitionMatches, this)

      if (bNoTokenMatched) {
        throw new tokenizerError('Could not match input.')
      }
    }

    return this.listOfMatchedTokens
  }

  private checkIfTokenDefinitionMatches(tokenDefinition) {
    const matchResult = tokenDefinition.tokenPattern.exec(this.input)
    if (matchResult !== null) {
      let matchedString = matchResult[0]
      const matchLength = matchedString.length
      this.input = this.input.substring(matchLength)

      const negativeValue = matchedString.indexOf('(')

      if (negativeValue === 0) {
        matchedString = matchedString.substring(1, matchLength - 1)
      }

      this.listOfMatchedTokens.push({
        class: tokenDefinition.tokenClass,
        value: matchedString,
      })

      return false
    }
    return true
  }
}
