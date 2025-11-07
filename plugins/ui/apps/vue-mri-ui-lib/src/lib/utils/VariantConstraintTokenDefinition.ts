import Enum from '../../utils/Enum'
import TokenDefinition from './TokenDefinition'

/**
 * List of TokenDefinitions for the VariantConstraint.
 * @namespace
 * @alias hc.mri.pa.ui.lib.VariantConstraintTokenDefinition
 */
const VariantConstraintTokenDefinition = {
  tokens: null,
  tokenDefinitions: [],
}

VariantConstraintTokenDefinition.tokens = Enum.build('CHR', 'COLON', 'DASH', 'NUMBER')

VariantConstraintTokenDefinition.tokenDefinitions = [
  new TokenDefinition(/^chr(1[0-9]|2[0-1]|[1-9]|x|y)/i, VariantConstraintTokenDefinition.tokens.CHR),
  new TokenDefinition(/^:/, VariantConstraintTokenDefinition.tokens.COLON),
  new TokenDefinition(/^-/, VariantConstraintTokenDefinition.tokens.DASH),
  new TokenDefinition(/^\d+/, VariantConstraintTokenDefinition.tokens.NUMBER),
]

export default VariantConstraintTokenDefinition
