import Enum from '../../utils/Enum'
import TokenDefinition from './TokenDefinition'

/**
 * List of TokenDefinitions for the RangeConstraint.
 * @namespace
 * @alias hc.mri.pa.ui.lib.RangeConstraintTokenDefinition
 */
const rangeConstraintTokenDefinition = {
  tokens: null,
  tokenDefinitions: [],
}

rangeConstraintTokenDefinition.tokens = Enum.build(
  'GEQ',
  'LEQ',
  'GT',
  'LT',
  'OPENING_BRACKET',
  'CLOSING_BRACKET',
  'Dash',
  'Number',
  'NOVALUE'
)

rangeConstraintTokenDefinition.tokenDefinitions = [
  new TokenDefinition(/^>=/, rangeConstraintTokenDefinition.tokens.GEQ),
  new TokenDefinition(/^<=/, rangeConstraintTokenDefinition.tokens.LEQ),
  new TokenDefinition(/^>/, rangeConstraintTokenDefinition.tokens.GT),
  new TokenDefinition(/^</, rangeConstraintTokenDefinition.tokens.LT),
  new TokenDefinition(/^\[/, rangeConstraintTokenDefinition.tokens.OPENING_BRACKET),
  new TokenDefinition(/^]/, rangeConstraintTokenDefinition.tokens.CLOSING_BRACKET),
  new TokenDefinition(/^-/, rangeConstraintTokenDefinition.tokens.DASH),
  new TokenDefinition(/^(?:\d*\.)?\d+/, rangeConstraintTokenDefinition.tokens.NUMBER),
  new TokenDefinition(/^\(?-[0-9]?\d*\.?\d+\)?/, rangeConstraintTokenDefinition.tokens.NUMBER),
  new TokenDefinition(/^NoValue/, rangeConstraintTokenDefinition.tokens.NOVALUE),
]

export default rangeConstraintTokenDefinition
