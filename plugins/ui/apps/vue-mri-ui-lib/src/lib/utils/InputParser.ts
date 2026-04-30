import Parser from './Parser'
import Tokenizer from './Tokenizer'

/**
 * Constructor for a new InputParser.
 * @constructor
 * @param {hc.mri.pa.ui.lib.utils.TokenDefinition[]} aTokenDefinitions List of TokenDefinitions
 * @param {object[]}                                  aAcceptedPatterns List of accepted patterns
 *
 * @classdesc
 * InputParser class
 * @alias hc.mri.pa.ui.lib.utils.InputParser
 */
export default class InputParser {
  private oParser: Parser
  private oTokenizer: Tokenizer
  constructor(aTokenDefinitions: any[], aAcceptedPatterns: any[]) {
    this.oTokenizer = new Tokenizer(aTokenDefinitions)
    this.oParser = new Parser(aAcceptedPatterns)
  }

  public parseInput(sInput, fParseSuccess, fParseFail) {
    if (sInput.length === 0) {
      return
    }

    // remove spaces between operators/brackets and numbers
    // but preserve spaces between separate expressions
    const normalizedInput = sInput
      .replace(/([><=]+)\s+(-?(?:\d*\.)?\d+)/g, '$1$2') // "> 30" -> ">30"
      .replace(/(\[|\])\s+(-?(?:\d*\.)?\d+)/g, '$1$2') // "[ 10" -> "[10"
      .replace(/(-?(?:\d*\.)?\d+)\s+(\[|\])/g, '$1$2') // "10 ]" -> "10]"
      .replace(/(-?(?:\d*\.)?\d+)\s+-\s+(-?(?:\d*\.)?\d+)/g, '$1-$2') // "10 - 20" -> "10-20"

    // const normalizedInput = sInput.replace(/([><=\[\]-])\s+/g, '$1').replace(/\s+([><=\[\]-])/g, '$1')

    const aSplittedInputs = normalizedInput.split(' ')

    while (aSplittedInputs.length > 0) {
      const sInputPart = aSplittedInputs[0].trim()

      if (sInputPart.length > 0) {
        try {
          const tokenList = this.oTokenizer.tokenize(sInputPart)
          const oParseResult = this.oParser.parse(tokenList)

          fParseSuccess(sInputPart, oParseResult)
        } catch (e) {
          fParseFail(sInputPart, e.message)
        }
      }

      aSplittedInputs.shift()
    }
  }
}
