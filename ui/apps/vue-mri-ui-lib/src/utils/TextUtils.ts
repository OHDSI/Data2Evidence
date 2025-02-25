/**
 * @namespace
 * @classdesc Utility class for text/ResourceBundle related functionality.
 * @alias hc.hph.core.ui.TextUtils
 */

// mock data
class ResourceModel {
  public params: any
  constructor(params: { bundleUrl: any }) {
    this.params = params
  }
  public getResourceBundle() {
    return {}
  }
}

const textUtils = {
  mResourceBundles: {},
  /**
   * Set the ResourceBundle.
   * Provides a static access to the ResourceBundle. As the access is
   * no longer scoped by the component, a key needs
   * to be provided to indentify the ResourceBundle.
   * @param {string}                         sKey           Key of the ResourceBundle
   * @param {jQuery.sap.util.ResourceBundle} oResouceBundle I18n-ResouceBundle
   * of the MRI-PA-Component
   */
  setResourceBundle(sKey: any, oResouceBundle: {}) {
    ;(textUtils.mResourceBundles as any)[sKey] = oResouceBundle
  },

  /**
   * Load and set the ResourceBundle.
   * Provides a static access to the ResourceBundle. As the access is
   * no longer scoped by the component, a key needs
   * to be provided to indentify the ResourceBundle.
   * @param {string} sKey  Key of the ResourceBundle
   * @param {string} sPath Path to the resource file
   */
  loadResourceBundle(sKey: string, sPath: string) {
    textUtils.setResourceBundle(
      sKey,
      new ResourceModel({
        bundleUrl: sPath,
      }).getResourceBundle()
    )
  },

  /**
   * Wrapper around ResouceBundle.getText() but escapes single quotes.
   * Checks if a ResourceBundle has been set and if so returns the translated string.
   * If text parameters are given, then any occurrences of the pattern
   * "{<i>n</i>}" with <i>n</i> being an integer
   * are replaced by the parameter value with index <i>n</i>.
   * @see jQuery.sap.util.ResourceBundle#getText
   * @see hc.hph.core.ui.TextUtils.formatMessage
   * @param   {string}   sKey        Key of the ResourceBundle
   * @param   {string}   sMessageKey Key of the translatable string
   * @param   {string[]} [aArgs]     List of parameters which should replace the place holders
   * @returns {string}   The value belonging to the key, if found; otherwise the key itself.
   */
  getText(sKey: string, aArgs?: string[]) {
    return sKey + aArgs
    // if (!TextUtils.mResourceBundles[sKey]) {
    //   // console.error('ResourceBundle has to be initialized
    //   // before getText is called', null, 'hc.core');
    //   return sMessageKey;
    // }
    // return TextUtils.formatMessage(TextUtils.mResourceBundles[sKey].getText(sMessageKey), aArgs);
  },

  // mock function
  getLetterForNumber(iNumber: any) {
    const iOrdA = 'A'.charCodeAt(0) // iOrdA = 0
    const iOrdZ = 'Z'.charCodeAt(0) // iOrdZ = 25
    const iLength = iOrdZ - iOrdA + 1 // iLength = 26

    let sLetters = ''
    while (iNumber > 0) {
      sLetters = String.fromCharCode(((iNumber - 1) % iLength) + iOrdA) + sLetters // iNumber starts from 1, whereas the index (iOrdA) starts from 0
      iNumber = Math.floor((iNumber - 1) / iLength)
    }
    return sLetters
  },

  /**
   * Wrapper around jQuery.sap.formatMessage which escapes single quotes correctly.
   * @param   {string}   sPattern A pattern string in the described syntax
   * @param   {string[]} aValues The values to be used instead of the placeholders
   * @returns {string[]}   The formatted result string
   */
  formatMessage(sPattern: string, aValues: string[]): string[] {
    // return jQuery.sap.formatMessage(sPattern.replace(/'/g, "''"), aValues);
    return aValues
  },

  /**
   * Notifies the user using either a (modal) MessageBox or a MessageToast.
   * The method of notification depends on the level of the message.
   * For "warning" and "error" a MessageBox is opened, to prevent any user from missing it.
   * For any other kind of notification (e.g. "success" or "info"),
   * the MessageToast provides an non-interruptive notification.
   * @param {string} sLevel   Notification level,
   * decides the method of notification
   * @param {string}                  sMessage           The message of the notification
   */
  notifyUser(sLevel: string, sMessage: string) {
    // if ([sap.ui.core.MessageType.Warning, sap.ui.core.MessageType.Error]
    // .indexOf(sLevel) !== -1) {
    //   const mOptions = {
    //     styleClass: FioriUtils.getContentDensityClass(),
    //   };
    //   if (typeof fMessageBoxClosed === 'function') {
    //     mOptions.onClose = fMessageBoxClosed;
    //   }
    //   if (MessageBox[sLevel.toLowerCase()]) {
    //     MessageBox[sLevel.toLowerCase()](sMessage, mOptions);
    //   } else {
    //     // Remove else block with SAPUI5 1.30
    //     mOptions.icon = sLevel.toUpperCase();
    //     MessageBox.alert(sMessage, mOptions);
    //   }
    // } else {
    //   sap.m.MessageToast.show(sMessage);
    // }
    return sMessage
  },
}

textUtils.loadResourceBundle('hph.core', '')

export default textUtils
