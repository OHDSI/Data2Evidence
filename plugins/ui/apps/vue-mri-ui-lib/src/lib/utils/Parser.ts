const parserError = function (message) {
  this.message = message
  this.stack = new Error().stack
}

parserError.prototype = Object.create(Error.prototype)
parserError.prototype.constructor = parserError
parserError.prototype.name = 'ParserError'

/**
 * Constructor for a new Parser.
 * @constructor
 * @param {object[]} aAcceptedPatterns List of accepted patterns
 *
 * @classdesc
 * Parser Class.
 * @alias hc.mri.pa.ui.lib.utils.Parser
 */
export default class Parser {
  private acceptedPatterns: any
  private tokenList: any
  constructor(aAcceptedPatterns) {
    this.acceptedPatterns = aAcceptedPatterns
  }

  public parse(tokenList) {
    this.tokenList = tokenList

    for (let i = 0; i < this.acceptedPatterns.length; i += 1) {
      if (this.tokenListMatchesSequence(this.acceptedPatterns[i].sequence)) {
        return this.acceptedPatterns[i].action(this.tokenList)
      }
    }

    throw new parserError('Input did not match any of the accepted patterns.')
  }

  private tokenListMatchesSequence(sequence) {
    if (sequence.length !== this.tokenList.length) {
      return false
    }

    for (let i = 0; i < sequence.length; i += 1) {
      if (sequence[i] !== this.tokenList[i].class) {
        return false
      }
    }

    return true
  }
}
