import VariantConstraintTokenDefinition from './VariantConstraintTokenDefinition'

function _returnVariantFilterBuilder(iIndexOfChromId, iIndexOfPosStart, iIndexOfPosEnd) {
  return aTokenList => {
    return {
      chromosomeId: aTokenList[iIndexOfChromId].value.toLowerCase().replace('chr', ''),
      positionStart: parseInt(aTokenList[iIndexOfPosStart].value, 10),
      positionEnd: parseInt(aTokenList[iIndexOfPosEnd].value, 10),
    }
  }
}

const tokens = VariantConstraintTokenDefinition.tokens

/**
 * List of pattern definitions for the VariantConstraint.
 * @namespace
 * @alias hc.mri.pa.ui.lib.VariantConstraintPatternDefinition
 */
const VariantConstraintPatternDefinition = {
  acceptedPatterns: [],
}

VariantConstraintPatternDefinition.acceptedPatterns = [
  {
    sequence: [tokens.CHR, tokens.COLON, tokens.NUMBER, tokens.DASH, tokens.NUMBER],
    action: _returnVariantFilterBuilder(0, 2, 4),
  },
]

export default VariantConstraintPatternDefinition
