import ConstraintBase from './ConstraintBase'

/**
 * Constructor for a new LegacyRangeConstraint.
 * @constructor
 * @param {string} [sId]       id for the new control, generated automatically if no id is given
 * @param {object} [mSettings] initial settings for the new control
 *
 * @classdesc
 * Legacy Constraint that allows input of a start and end point to define a range.
 * @extends hc.mri.pa.ui.lib.Constraint
 * @alias hc.mri.pa.ui.lib.LegacyRangeConstraint
 */
class LegacyRangeConstraintModel extends ConstraintBase {
  constructor(mriFrontendConfig, newProps) {
    super(mriFrontendConfig, newProps)
    this.mriFrontendConfig = mriFrontendConfig
    const defaultProps = {
      type: 'legacyrangeconstraint',
    }
    this.props = { ...this.props, ...defaultProps, ...newProps }
  }

  // createInputContent() {
  //   const that = this;
  //   this._model = new JSONModel({
  //     lowerValue: null,
  //     upperValue: null,
  //     valueState: sap.ui.core.ValueState.None,
  //   });
  //   const oFloatType = new Float();
  //   /**
  //    * Overwrite for the internal parse function.
  //    * This is necessary because the Ui5 function doesn't allow empty strings as values.
  //    * Therefore if the value of an input using the Float type
  //    * is set to empty (after having had a value before),
  //    * the parse function throws an error as parsing an empty string to float results in NaN.
  //    * This however means that further formatting is skipped
  //    * and the value in the model keeps the old value.
  //    * @param   {any}    oValue        Value to be parsed, most likely string.
  //    * @param   {string} sInternalType Type of the value.
  //    * @returns {number} Float represantation of the value or
  //    *  undefined if the value was an empty string.
  //    */
  //   oFloatType.parseValue = function (oValue, sInternalType) {
  //     if (oValue === '') {
  //       return;
  //     }
  //     return Float.prototype.parseValue.call(this, oValue, sInternalType);
  //   };

  //   // set up lower bound input controls
  //   this._lowerInput = new TextField({
  //     placeholder: '0',
  //     value: {
  //       path: 'constraints>/lowerValue',
  //       type: oFloatType,
  //     },
  //     valueState: '{constraints>/valueState}',
  //     width: '100%',
  //     change() {
  //       that.setFromToolTip(that.preparePrefixToolTipString());
  //       that.fireChanged();
  //     },
  //     liveChange(oEvent) {
  //       let oModel = oEvent.getSource().getModel('constraints');
  //       let sLiveValue = oEvent.getParameter('liveValue');
  //       let iUpperValue = oModel.getProperty('/upperValue');

  //       // If both values are set, check if lower is bigger than higher and set state to error.
  //       if (sLiveValue && iUpperValue && sLiveValue > iUpperValue) {
  //         oModel.setProperty('/valueState', sap.ui.core.ValueState.Error);
  //       } else {
  //         oModel.setProperty('/valueState', sap.ui.core.ValueState.None);
  //       }
  //     },
  //   }).setModel(this._model, 'constraints');

  //   this._upperInput = new TextField({
  //     placeholder: '{i18n>MRI_PA_INPUT_PLACEHOLDER_ALL}',
  //     value: {
  //       path: 'constraints>/upperValue',
  //       type: oFloatType,
  //     },
  //     valueState: '{constraints>/valueState}',
  //     width: '100%',
  //     change() {
  //       that.setToToolTip(that.preparePrefixToolTipString());
  //       that.fireChanged();
  //     },
  //     liveChange(oEvent) {
  //       let oModel = oEvent.getSource().getModel('constraints');
  //       let sLiveValue = oEvent.getParameter('liveValue');
  //       let iLowerValue = oModel.getProperty('/lowerValue');

  //       // If both values are set, check if lower is bigger than higher and set state to error.
  //       if (sLiveValue && iLowerValue && sLiveValue < iLowerValue) {
  //         oModel.setProperty('/valueState', sap.ui.core.ValueState.Error);
  //       } else {
  //         oModel.setProperty('/valueState', sap.ui.core.ValueState.None);
  //       }
  //     },
  //   }).setModel(this._model, 'constraints');

  //   const oSeparatorLabel = new Label({
  //     text: '–', // en-dash
  //     width: '1rem',
  //     textAlign: sap.ui.core.TextAlign.Center,
  //   });

  //   this._setGrowingLayout(this._lowerInput);
  //   this._setGrowingLayout(this._upperInput);

  //   return [this._lowerInput, oSeparatorLabel, this._upperInput];
  // }

  // setLower(value) {
  //   this._model.setProperty('/lowerValue', value);
  //   this.fireChanged();
  // }

  // setUpper(value) {
  //   this._model.setProperty('/upperValue', value);
  //   this.fireChanged();
  // }

  // getLower() {
  //   return this._model.getProperty('/lowerValue');
  // }

  // getUpper() {
  //   return this._model.getProperty('/upperValue');
  // }

  // /**
  //  * Add an expression to the LegacyRangeConstraint
  //  * which sets either the lower or the upper input value.
  //  * @throws {Error} When an operator other than >= or <= is given.
  //  * @param {string} sOperator Operator as string
  //  * @param {string} sValue    Number value
  //  */
  // addExpression(sOperator, sValue) {
  //   if (sOperator === '>=') {
  //     this._model.setProperty('/lowerValue', sValue);
  //   } else if (sOperator === '<=') {
  //     this._model.setProperty('/upperValue', sValue);
  //   } else {
  //     throw new Error(`LegacyRangeConstraint does not support operator ${  sOperator}`);
  //   }
  // }

  // /**
  //  * Resets the Constraint to the initial state.
  //  */
  // clear() {
  //   this._model.setProperty('/lowerValue');
  //   this._model.setProperty('/upperValue');
  //   this.fireChanged();
  // }

  // /**
  //  * Check if the LegacyRangeConstraint has a selected value.
  //  * @override
  //  * @returns {boolean} True, if neither lower nor upper are set.
  //  */
  // isEmpty() {
  //   return !this._model.getProperty('/lowerValue') && !this._model.getProperty('/upperValue');
  // }

  // onSetConstraintToolTip(prefixString) {
  //   this.setFromToolTip(prefixString);
  //   this.setToToolTip(prefixString);
  // }

  // setFromToolTip(prefixString) {
  //   const fromStr = Utils.getText('MRI_PA_FILTERCARD_FROM_RANGE');
  //   this._lowerInput.setTooltip(`${prefixString } -
  // ${fromStr }: ${this._lowerInput.getValue()}`);
  // }

  // setToToolTip(prefixString) {
  //   const toStr = Utils.getText('MRI_PA_FILTERCARD_TO_RANGE');
  //   this._upperInput.setTooltip(`${prefixString} - ${toStr }: ${this._upperInput.getValue()}`);
  // }
}

export default LegacyRangeConstraintModel
