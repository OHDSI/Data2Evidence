sap.ui.define([
    "jquery.sap.global",
    "./TagElement",
    "./TagInput"
], function (jQuery, TagElement, TagInput) {
    "use strict";

    /**
     * Constructor for a new FreetextTagInput.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * FreetextTagInput Control.
     * @extends sap.hc.mri.pa.ui.lib.TagInput
     * @alias sap.hc.mri.pa.ui.lib.FreetextTagInput
     */
    var FreetextTagInput = TagInput.extend("sap.hc.mri.pa.ui.lib.FreetextTagInput", {
        renderer: {}
    });

    FreetextTagInput.prototype.init = function () {
        TagInput.prototype.init.call(this);

        this.fuzzy = 0.6;
        this._getListBox().setSelectedIndex(-1);
        this._getListBox().addStyleClass("sapMriPaFreetextTagListBox");
    };

    FreetextTagInput.prototype.onsapdown = function () {
        if (!this.isOpen()) {
            this._open();
        }
    };

    FreetextTagInput.prototype.onsapup = function () {
        if (!this.isOpen()) {
            this._open();
        }
    };

    FreetextTagInput.prototype._openBox = function () {
        TagInput.prototype._openBox.call(this);
        this._getListBox().setSelectedIndex(-1);
    };

    FreetextTagInput.prototype._open = function () {
        this._openBusyBox();
        this.fireSuggest({
            suggestValue: this.getProperty("value"),
            fuzzyValue: this.fuzzy
        });
    };

    // override the behavior of the normal tag input to skip validation. Any freetext tag is valid
    FreetextTagInput.prototype._myAddTag = function (tagTxt) {
        var similarTag = this._findMyTag(tagTxt);
        if (similarTag) {
            // just highlight the existing tag
            this.toHighlightAfterRendering.push(similarTag);
        } else {
            // add a new tag
            var newTag = new TagElement({
                text: tagTxt,
                status: "Valid",
                attributePath: this.getAttributePath(),
                remove: [this._removeMyTag, this],
                changed: [this._myTagChanged, this],
                tagFocus: [this._onTagFocusin, this]
            });
            this.addMyTag(newTag);
            // here we assume the validation and the query engine can run in paralel,
            // i.e. they work consistently and are independent
            this.fireChanged();
        }
    };

    // override the addTag as well for the addMultipleTags to also skip validation
    FreetextTagInput.prototype.addMyTag = function (oTag) {
        oTag.setStatus("Valid");
        TagInput.prototype.addMyTag.call(this, oTag);
    };

    return FreetextTagInput;
});
