sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./MriFrontendConfig",
    "./TagElement",
    "sap/ui/commons/ComboBox",
    "sap/ui/commons/ListBox",
    "sap/ui/core/Item"
], function (jQuery, Utils, MriFrontendConfig, TagElement, ComboBox, ListBox, Item) {
    "use strict";

    /**
     * Constructor for a new TagInput.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * TagInput Control.
     * @extends sap.ui.commons.ComboBox
     * @alias sap.hc.mri.pa.ui.lib.TagInput
     */
    var TagInput = ComboBox.extend("sap.hc.mri.pa.ui.lib.TagInput", {
        metadata: {
            properties: {
                /**
                 * Each tag is an object with {text: "" , status: "" }.
                 */
                tags: {
                    type: "object[]",
                    defaultValue: []
                },
                validationCallback: "any",
                selectableSuggestions: {
                    type: "boolean",
                    defaultValue: true
                },
                attributePath: {
                    type: "string",
                    defaultValue: ""
                }
            },
            events: {
                suggest: {},
                changed: {},
                /**
                 * Fired when we need to validate new tags (because they were added) or check wether we can cancel some
                 * validations (because tags were removed)
                 */
                validate: {}
            },
            aggregations: {
                myTags: {
                    type: "sap.hc.mri.pa.ui.lib.TagElement",
                    multiple: true
                }
            }
        }
    });

    TagInput.prototype.init = function () {
        ComboBox.prototype.init.call(this);

        this.toHighlightAfterRendering = [];

        this.setProperty("value", "", true);
        this._sTypedChars = "";

        this.attachLiveChange(function (event) {
            var liveValue = event.getParameters().liveValue;
            this._sTypedChars = liveValue;
        });

        // attach a function that opens the dropdown box when typing
        this.attachLiveChange(function (event) {
            this._openBusyBox();
            this._fireSuggestFromLiveChange(event);
        });

        this._getListBox().setBusyIndicatorDelay(0);

        this._listBoxPosition = -1;

        // modify listbox control to allow items with highlighted search hits to
        // be rendered correctly
        var listbox = this._getListBox();
        listbox.onAfterRendering = function () {
            ListBox.prototype.onAfterRendering.apply(listbox, arguments);
            jQuery(".sapUiLbxISec, .sapUiLbxITxt", listbox.getDomRef()).html(function (index, oldhtml) {
                // Remove id to fix ListBox selection
                this.id = "";
                return oldhtml.replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>");
            });
        };
    };

    TagInput.prototype._splitInputBySpaces = function (sInput) {
        if (sInput.length === 0) {
            return;
        }

        var aSplittedInputs = sInput.split(" ");

        aSplittedInputs = aSplittedInputs.filter(function (sElem) {
            return sElem.trim().length > 0;
        });

        if (aSplittedInputs.length > 0) {
            this.addMultipleTags(aSplittedInputs);
        }
    };

    TagInput.prototype._parseInputAndCreateTags = function (sInputString) {
        this._splitInputBySpaces(sInputString);
    };

    /**
     * Wrapper for fireLiveChange.
     * We need to make sure, that hitting Escape or any arrow key doesn't trigger a liveChange event.
     * Those keys are used to navigate the list of suggestions.
     * @private
     */
    TagInput.prototype._fireLiveChange = function () {
        var currentVal = jQuery(this.getInputDomRef()).val();
        if (this._sTypedChars !== currentVal) {
            // fire a change event
            this.fireLiveChange({
                liveValue: currentVal
            });
        }
    };

    TagInput.prototype.addMultipleTags = function (multipleTextTags) {
        var that = this;

        // first filter out the possible null values, coming from the no value column
        multipleTextTags = multipleTextTags.filter(function (oneValue) {
            return oneValue !== null;
        });

        // transform all the values to strings
        multipleTextTags = multipleTextTags.map(function (oneValue) {
            return oneValue.toString();
        });

        // remove duplicates from the tags. This can happen when multiple axes are selected
        var mSeen = {};
        multipleTextTags = multipleTextTags.filter(function (item) {
            var bSeen = mSeen.hasOwnProperty(item);
            mSeen[item] = true;
            return !bSeen;
        });

        var validValue = that._isCatalogAttribute()? "Valid" : "ValidWithData";

        multipleTextTags.forEach(function (oneTxtTag) {
            var status = (oneTxtTag === "NoValue" || oneTxtTag === Utils.getText("MRI_PA_NO_VALUE")) ? validValue : "BeingValidated";

            //check Existing Tags
            var similarTag = that._findMyTag(oneTxtTag);
            if (similarTag) {
                // just highlight the existing tag
                that.toHighlightAfterRendering.push(similarTag);
            } else {
                // add tag but don't let it self-validate, otherwise the back-end will be flooded with simultaneous requests
                var newTag = new TagElement({
                    text: oneTxtTag,
                    popupText: oneTxtTag,
                    status: status,
                    attributePath: that.getAttributePath(),
                    remove: [that._removeMyTag, that],
                    changed: [that._myTagChanged, that],
                    tagFocus: [that._onTagFocusin, that]
                });

                // just add the tags here, the request to the back-end will be send after rendering
                that.addMyTag(newTag);
            }
        });

        this.fireChanged();
    };

    TagInput.prototype._myAddTag = function (tagTxt, additionalTxt) {
        // always get rid of the highlighted text
        var tagText = this._unBoldText(tagTxt);
        var additionalText = this._unBoldText(additionalTxt);

        var similarTag = this._findMyTag(tagText);
        if (similarTag) {
            // just highlight the existing tag
            this.toHighlightAfterRendering.push(similarTag);
        } else {
            // add a new tag
            var newTag = new TagElement({
                text: this._escapeBraces(tagText),
                popupText: this._escapeBraces(tagText + " : " + additionalText),
                status: "BeingValidated",
                attributePath: this.getAttributePath(),
                remove: [this._removeMyTag, this],
                changed: [this._myTagChanged, this],
                tagFocus: [this._onTagFocusin, this]
            });

            this.addMyTag(newTag);
            newTag.selfValidate();
            // TODO here we assume the validation and the query engine can run in paralel,
            //      i.e. they work consistently and are independent
            this.fireChanged();
        }
    };

    /**
     * Returns true if the attribute related to the tag input is configured as a catalog attribute in the current
     * MRI config.
     * @private
     * @returns {boolean} True if catalog attribute
     */
    TagInput.prototype._isCatalogAttribute = function () {
        return MriFrontendConfig.getFrontendConfig().getAttributeByPath(this.getAttributePath()).isCatalogAttribute();
    };

    /**
     * Set the focues on the input field instead of the individual tag.
     * @private
     */
    TagInput.prototype._onTagFocusin = function () {
        jQuery("input", this.getDomRef()).focus();
    };

    TagInput.prototype._unBoldText = function (text) {
        return text.replace("<b>", "").replace("</b>", "");
    };

    /**
     * Escapes the possible braces and escape characters in the
     * text to avoid braces coming from the data to be interpreted as model
     * binding.
     * @private
     * @param   {string} text Text possibly containing backslash and braces.
     * @returns {string} Escaped text using \\, \{ and \}.
     */
    TagInput.prototype._escapeBraces = function (text) {
        // first escape the escape character itself ("\") and then the braces
        return text.replace(/\\/g, "\\\\").replace(/{/g, "\\{").replace(/}/g, "\\}");
    };

    TagInput.prototype._findMyTag = function (tagName) {
        var obj;
        this.getMyTags().every(function (tagObject) {
            var found = tagName.toUpperCase() === tagObject.getText().toUpperCase();
            if (found) {
                obj = tagObject;
                return false;
            }
            return true;
        });
        return obj;
    };

    /**
     * Returns similar tags.
     * Similar tags are those with the same text but different id.
     * @private
     * @param   {sap.hc.mri.pa.ui.lib.TagElement}   tag Tag to be compared to.
     * @returns {sap.hc.mri.pa.ui.lib.TagElement[]} List of similar Tags.
     */
    TagInput.prototype._findMySimilarTags = function (tag) {
        var tags = [];
        var sTagText = tag.getText().toUpperCase();
        this.getMyTags().forEach(function (similarTag) {
            if (sTagText === similarTag.getText().toUpperCase() && tag.getId() !== similarTag.getId()) {
                tags.push(similarTag);
            }
        });
        return tags;
    };

    TagInput.prototype._removeMyTag = function (oEvent) {
        this.removeMyTag(oEvent.getSource());
        this.fireChanged();
    };

    TagInput.prototype._myTagChanged = function (oEvent) {
        var changedTag = oEvent.getSource();
        // count the number of tags with the new text
        var similarTags = this._findMySimilarTags(changedTag);

        if (similarTags.length > 0) {
            // just highlight the first tag. We shouldn't have multiple tags with the same text in a consistent state
            this.toHighlightAfterRendering.push(similarTags[0]);
            // remove the tag that changed since it is a duplicate
            this.removeMyTag(oEvent.getSource());
        } else {
            this.fireChanged();
        }
    };

    TagInput.prototype._fireSuggestFromLiveChange = function (event) {
        this.fireSuggest({
            suggestValue: event.getParameters().liveValue,
            doOpen: false
        });
    };

    TagInput.prototype._open = function () {
        this._openBusyBox();
        // throw the suggest event that will initiate the call to the domain service
        this.fireSuggest({
            suggestValue: this.getProperty("value"),
            doOpen: true
        });
    };

    TagInput.prototype._openBusyBox = function () {
        this.openTime = new Date().getTime();
        if (!this.isOpen()) {
            this._boxSessionStarted = false;
        }
        if (this.getItems().length === 0) {
            // if there is no item, add a dummy item
            this._getListBox().setItems([new Item({
                text: "",
                key: "searching"
            })]);
        }
        this._getListBox().setBusy(true);
        ComboBox.prototype._open.call(this);

        this._getListBox().scrollToIndex(0, false);

        this._getListBox().setSelectedIndex(-1);
        this._listBoxPosition = -1;
    };

    TagInput.prototype.checkSession = function () {
        return this._boxSessionStarted === true;
    };

    TagInput.prototype._openBox = function () {
        if (this.isEmptyListBox()) {
            // the list has only placeholders
            this._getListBox().setItems([new Item({
                text: "{i18n>MRI_PA_DROP_DOWN_NO_SUGGESTIONS}",
                key: "no_val",
                enabled: false
            })]);
            this._getListBox().setEnabled(false);
        } else {
            // the list has meaningful items
            this._getListBox().setEnabled(true);
        }

        this._getListBox().setBusy(false);

        // if the busy list is open, replace it with the real list of suggestions
        if (this.isOpen()) {
            // close and reopen to be sure to adapt the size to the size of the list
            ComboBox.prototype._close.call(this);
            ComboBox.prototype._open.call(this);
        }
        this._getListBox().scrollToIndex(0, false);
        this._getListBox().setSelectedIndex(0);
        this._listBoxPosition = 0;
        this._boxSessionStarted = true;
    };

    TagInput.prototype.onsapescape = function (e) {
        if (this.oPopup && this.oPopup.isOpen()) {
            this._close();
            e.stopPropagation();
        }
    };

    TagInput.prototype.isEmptyListBox = function () {
        return this.getItems().length === 0 || this.getItems()[0].getKey() === "no_val" || this.getItems()[0].getKey() === "searching";
    };

    /**
     * Move throught the items in the given direction.
     * @param {Object}  oEvent Standard SAPUI5 Event
     * @param {Boolean} down   Direction of the scroll
     */
    TagInput.prototype.scrollItem = function (oEvent, down) {
        if (oEvent.target.id === this.getId() + "-select") {
            return;
        }
        if (!this.getEnabled() || !this.getEditable()) {
            return;
        }
        if (jQuery(this.getFocusDomRef()).data("sap.InNavArea")) {
            return;
        }
        if (this.isBusy()) {
            return;
        }

        if (!this.isOpen()) {
            this._open();
        } else {
            var oListBox = this._getListBox();
            var aItems = oListBox.getItems();

            var pos = this._listBoxPosition;
            if (down) {
                // move one item down
                pos++;
                if (pos >= aItems.length) {
                    pos = 0;
                }
            } else {
                pos--;
                if (pos < 0) {
                    pos = aItems.length - 1;
                }
            }

            oListBox.setSelectedIndex(pos);
            oListBox.scrollToIndex(pos, true);
            this._listBoxPosition = pos;
            oEvent.preventDefault();
            oEvent.stopPropagation();
        }
    };

    TagInput.prototype.onsapdown = function (oEvent) {
        this.scrollItem(oEvent, true);
    };

    TagInput.prototype.onsapup = function (oEvent) {
        this.scrollItem(oEvent, false);
    };

    TagInput.prototype._prepareOpen = function () {
        var items = this._getListBox().getItems().length;
        var maxpopup = this.getMaxPopupItems();
        this._getListBox().setVisibleItems(maxpopup < items ? maxpopup : items);
    };

    /**
     * Overwrite setter for placeholder so we can manage its visibility.
     * @param {string} placeholder New placeholder
     */
    TagInput.prototype.setPlaceholder = function (placeholder) {
        this._placeholder = placeholder;
        this.setProperty("placeholder", placeholder);
    };

    TagInput.prototype.getTagsAsText = function () {
        return jQuery.map(this.getMyTags(), function (tag) {
            return tag.getText();
        });
    };

    TagInput.prototype.removeAllMyTags = function () {
        this.destroyMyTags();
    };

    TagInput.prototype.onBeforeRendering = function () {
        var domRef = this.getDomRef();
        var inputElement = jQuery("input", domRef);
        // remember to reset the focus
        this._requestFocus = inputElement.is(":focus");
        // check if the placeholder should be rendered
        if (this.getMyTags().length === 0) {
            this.setProperty("placeholder", this._placeholder);
        } else {
            this.setProperty("placeholder", "");
        }
    };

    TagInput.prototype.onAfterRendering = function () {
        ComboBox.prototype.onAfterRendering.apply(this, arguments);

        var that = this;
        var domRef = this.getDomRef();
        var inputElement = jQuery("input", domRef);

        // we deal with the size of the input element differently so first we remove the style and add our class
        inputElement.removeAttr("style");
        inputElement.addClass("sapMriPaTagInputField");
        // now we set an initial size of 5 characters, it will be adjusted in onkeydown
        inputElement.attr("size", 5);

        jQuery(".tagRemoveHandle", this.getDomRef()).click(function () {
            var tagIndex = jQuery(this).parent().attr("tag_index");
            that.removeTag(tagIndex, true);
        });

        this.toHighlightAfterRendering.forEach(function (tag) {
            tag.highlight();
        });

        this.toHighlightAfterRendering = [];

        // grab back focus if we had it before the rerendering
        if (this._requestFocus) {
            inputElement.focus();
        }

        if (!this.getSelectableSuggestions()) {
            jQuery("div.sapUiTfComboIcon", this.getDomRef()).hide();
        }

        // validate tags that haven't been validated
        var multipleTags = this.getMyTags().filter(function (tag) {
            return tag.getStatus() === "BeingValidated" && ((tag.getText() !== "NoValue") || (tag.getText() !== Utils.getText("MRI_PA_NO_VALUE")));
        });

        var multipleTextTags = multipleTags.map(function (oTag) {
            return oTag.getText();
        });

        // now validate all the tags at once and ask the invalid tags to get their suggestions
        if (multipleTextTags.length > 0) {

            this.getParent().loadValues(function () {
                var allValues = that.getModel().getData();
                var response = multipleTextTags.map(function (element) {
                    var obj = {
                        value: element,
                        dataMatch: null,
                        catalogMatch: null
                    };

                    allValues.data.forEach(function (valu) {
                        if (valu.value.toUpperCase() === obj.value.toUpperCase()) {
                            obj.dataMatch = valu.value;
                            obj.catalogMatch = valu.value;
                        }
                    });

                    return obj;
                });

                response.forEach(function (mData) {
                    var oTag = that._findMyTag(mData.value);

                    // If the Tag is not found (i.e. deleted) simply return
                    if (!oTag) {
                        return;
                    }

                    if (that._isCatalogAttribute()) {
                        if (mData.catalogMatch === null && mData.dataMatch === null) {
                            oTag.setStatus("Invalid");
                            oTag._getAlternativeSuggestions(false);
                        } else {
                            oTag.setStatus("Valid");
                            oTag.setText(mData.catalogMatch);
                        }

                    } else {
                        if (mData.dataMatch === null) {
                            oTag.setStatus("ValidNoData");
                        } else {
                            oTag.setStatus("ValidWithData");
                            oTag.setText(mData.dataMatch);
                        }
                    }

                    /*
                    // determine if the tag should be valid, invalid or no_data
                    if (that._isCatalogAttribute() && mData.catalogMatch === null && mData.dataMatch === null) {
                        // this is a catalog atribute without catalog match and without data match invalid
                        oTag.setStatus("Invalid");
                        // the tag object should request his suggestions from the backend
                        // but not open the popup automatically
                        oTag._getAlternativeSuggestions(false);
                    } else if (mData.dataMatch === null) { // it is either a data attribute or a valid catalog attribute
                        oTag.setStatus("ValidNoData");
                        if (that._isCatalogAttribute()) {
                            // use the value found in the catalog
                            oTag.setText(mData.catalogMatch);
                        }
                        // Else: there is no catalog - don't do anything - use the value entered by the user
                    } else {
                        // we have a data match. Replace the tag value with the real value
                        oTag.setStatus("Valid");
                        oTag.setText(mData.dataMatch);
                    }
                    */
                });
            });
        }
    };

    // add a new tag using the content of the input field
    TagInput.prototype._addTagFromInput = function (tagText, additionalText) {
        this._myAddTag(tagText, additionalText);
        this._sTypedChars = "";
        this.setProperty("value", "", false);
    };

    /**
     * Overwrite behavior for select event.
     * If the selection is final, i.e. the popup is already closed, use it to add a new tag.
     * @private
     */
    TagInput.prototype._doSelect = function () {
        if (this._getListBox().getEnabled()) {
            var oSelectedItem = this._getListBox().getSelectedItem();
            this._addTagFromInput(oSelectedItem.getKey(), oSelectedItem.getAdditionalText());
        }
    };

    /**
     * Prevent the ComboBox behavior on this event which involves auto-completion
     */
    TagInput.prototype.onkeypress = function () { /* override default */ };

    /**
     * Prevent the ComboBox behavior on this event.
     * @private
     */
    TagInput.prototype._handleItemsChanged = function () { /* override default */ };


    /**
     * Another hack to fix interferences between this code and the default combo box behavior.
     * @private
     */
    TagInput.prototype._close = function () {
        // hack to prevent a error caused by some intereference
        // between our code
        // and the combo box code...
        this._iClosedUpDownIdx = -1;

        // the parent function closes the popup
        ComboBox.prototype._close.apply(this,
            arguments);
        this._boxSessionStarted = false;
    };

    /**
     * Handler for the Enter key event.
     * Closes the popup (if open) and try to add a new tag.
     */
    TagInput.prototype.onsapenter = function () {
        var typedValue = this.getLiveValue();

        // clear the typed text
        this._sTypedChars = "";
        this.setProperty("value", "", false);

        // empty the value of the input field to avoid the combo box reseting
        // the live value as the value property (this is part of the default
        // behavior of the combo box)
        jQuery(this.getInputDomRef()).val("");

        if (this.isOpen() && !this.isEmptyListBox() && this._getListBox().getSelectedIndex() !== -1) {
            // build tag from selection
            var oSelectedItem = this._getListBox().getSelectedItem();
            this._myAddTag(oSelectedItem.getKey(), oSelectedItem.getAdditionalText());
        } else if (typedValue) {
            // add tag using the typed text
            //                this._myAddTag(typedValue, "");
            this._parseInputAndCreateTags(typedValue);
        }
        this._close();
        // we need to manually re-render here
        this.rerender();
    };

    TagInput.prototype.onkeydown = function () {
        var valueLength = jQuery("input", this.getDomRef()).val().length;
        jQuery("input", this.getDomRef()).attr("size", valueLength + 5);
    };

    /**
     * If backspace is pressed in an empty input field, remove the last tag.
     */
    TagInput.prototype.onsapbackspace = function () {
        if (this.getLiveValue().length === 0 && this.getMyTags().length > 0) {
            var notSelected = true;
            for (var i = 0; i < this.getMyTags().length; i++) {
                if (this.getMyTags()[i].getSelected()) {
                    notSelected = false;
                    break;
                }
            }
            if (notSelected) {
                var oLastTag = this.getMyTags()[this.getMyTags().length - 1];
                oLastTag.closePopup();
                this.removeMyTag(oLastTag);
                this.fireChanged();
            }
        }
    };

    TagInput.prototype.onsapleft = function () {
        var myTagsNum = this.getMyTags().length;
        var inputElement = jQuery("input", this.getDomRef());
        if (myTagsNum > 0 && inputElement.is(":focus")) {
            var obj = this.getMyTags()[myTagsNum - 1];
            setTimeout(function () {
                obj.primaryButton.focus();
            }, 50);
        }
    };

    TagInput.prototype.onclick = function () {
        jQuery("input", this.getDomRef())[0].focus();
        ComboBox.prototype.onclick.apply(this, arguments);
    };

    TagInput.prototype.clearListBox = function () {
        this._getListBox().destroyItems();
        this._listBoxPosition = -1;
    };

    TagInput.prototype.setBusy = function (isBusy) {
        this._getListBox().setBusy(isBusy);
    };

    TagInput.prototype.setBusyIndicatorDelay = function (value) {
        this._getListBox().setBusyIndicatorDelay(value);
    };

    TagInput.prototype.isOpen = function () {
        return this.oPopup && this.oPopup.isOpen();
    };

    TagInput.prototype.isBusy = function () {
        return this._getListBox().isBusy();
    };

    return TagInput;
});
