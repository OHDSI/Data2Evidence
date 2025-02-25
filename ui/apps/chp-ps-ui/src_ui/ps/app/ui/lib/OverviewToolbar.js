/* eslint-disable valid-jsdoc */
sap.ui.define([
    "jquery.sap.global",
    "sap/m/ToggleButton",
    "sap/ui/core/InvisibleText",
    "sap/m/OverflowToolbar",
    "sap/m/OverflowToolbarRenderer",
    "sap/m/Toolbar",
    "sap/m/ToolbarSpacer",
    "sap/m/OverflowToolbarLayoutData",
    "./OverviewToolbarAssociativePopover",
    "./OverviewToolbarAssociativePopoverControls"
], function (jQuery, ToggleButton, InvisibleText, OverflowToolbar, OverflowToolbarRenderer, Toolbar, ToolbarSpacer, OverflowToolbarLayoutData, OverviewToolbarAssociativePopover, OverviewToolbarAssociativePopoverControls) {
    "use strict";

    var OverviewToolbar;

    // Heuristic to distinguish between UI5 1.52 and 1.28
    if (OverflowToolbar._getActionSheet) {
        // From UI5 1.52, we are going to use the OverflowToolbar directly
        // The rest of the file is kept only for KAGes, their setup is based on UI5 1.28
        OverviewToolbar = OverflowToolbar.extend("hc.hph.patient.app.ui.lib.OverviewToolbar", {
            renderer: OverflowToolbarRenderer.render
        });

        OverviewToolbar.prototype._getPopover = function () {
            var oPopover;

            if (!this.getAggregation("_popover")) {
                // Create the Popover
                oPopover = new OverviewToolbarAssociativePopover(this.getId() + "-popover", {
                    showHeader: false,
                    modal: false,
                    horizontalScrolling: !sap.ui.Device.system.phone,
                    contentWidth: sap.ui.Device.system.phone ? "100%" : "auto"
                });
                if (sap.ui.Device.system.phone) {
                    // This will trigger when the toolbar is in the header/footer, because the the position is known in advance (strictly top/bottom)
                    oPopover.attachBeforeOpen(this._shiftPopupShadow, this);

                    // This will trigger when the toolbar is not in the header/footer, when the actual calculation is ready (see the overridden _calcPlacement)
                    oPopover.attachAfterOpen(this._shiftPopupShadow, this);
                }

                // This will set the toggle button to "off"
                oPopover.attachAfterClose(this._popOverClosedHandler, this);

                this.setAggregation("_popover", oPopover, true);
            }

            return this.getAggregation("_popover");
        };

        return OverviewToolbar;
    }

    /**
     * Constructor for a new OverviewToolbar
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The OverviewToolbar control is a container based on sap.m.Toolbar, that provides overflow when its content does not fit in the visible area.
     * @extends sap.ui.core.Toolbar
     * @alias sap.hc.hph.patient.app.ui.lib.OverviewToolbar
     */
    OverviewToolbar = Toolbar.extend("hc.hph.patient.app.ui.lib.OverviewToolbar", {
        metadata: {
            aggregations: {
                _overflowButton: {
                    type: "sap.m.ToggleButton",
                    multiple: false,
                    visibility: "hidden"
                },
                _popover: {
                    type: "sap.m.Popover",
                    multiple: false,
                    visibility: "hidden"
                }
            }
        }
    });

    /**
     * A shorthand for calling Toolbar.prototype methods.
     * @private
     * @param   {string} sFuncName  the name of the method
     * @param   {any[]}  aArguments the arguments to pass in the form of array
     * @returns {any}    Whatever the method returns
     */
    OverviewToolbar.prototype._callToolbarMethod = function (sFuncName, aArguments) {
        return Toolbar.prototype[sFuncName].apply(this, aArguments);
    };

    /**
     * Initializes the control
     * @private
     * @override
     */
    OverviewToolbar.prototype.init = function () {
        this._callToolbarMethod("init", arguments);

        // Used to store the previous width of the control to determine if a resize occurred
        this._iPreviousToolbarWidth = null;

        // When set to true, the overflow button will be rendered
        this._bOverflowButtonNeeded = false;

        // When set to true, changes to the controls in the toolbar will trigger a recalculation
        this._bListenForControlPropertyChanges = false;

        // When set to true, controls widths, etc... will not be recalculated, because they are already cached
        this._bControlsInfoCached = false;

        // When set to true, the recalculation algorithm will bypass an optimization to determine if anything moved from/to the action sheet
        this._bSkipOptimization = false;

        // Load the resources, needed for the text of the overflow button
        this._oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.m");

        OverviewToolbar.prototype._sAriaOverflowButtonLabelId = new InvisibleText({
            text: this._oResourceBundle.getText("LOAD_MORE_DATA")
        }).toStatic().getId();
    };

    /**
     * Called after the control is rendered
     */
    OverviewToolbar.prototype.onAfterRendering = function () {
        // If a control of the toolbar was focused, and we're here, then the focused control overflowed, so set the focus to the overflow button
        if (this._bControlWasFocused) {
            this._getOverflowButton().focus();
            this._bControlWasFocused = false;
        }

        // If before invalidation the overflow button was focused, and it's not visible any more, focus the last focusable control
        if (this._bOverflowButtonWasFocused && !this._getOverflowButtonNeeded()) {
            this.$().lastFocusableDomRef().focus();
            this._bOverflowButtonWasFocused = false;
        }

        // TODO: refactor with addEventDelegate for onAfterRendering for both overflow button and its label
        this._getOverflowButton().$().attr("aria-haspopup", "true");

        // Unlike toolbar, we don't set flexbox classes here, we rather set them on a later stage only if needed
        this._doLayout();
    };


    /* ********************************************LAYOUT****************************************************** */


    /**
     * For the OverflowToolbar, we need to register resize listeners always, regardless of Flexbox support
     * @override
     * @private
     */


    OverviewToolbar.prototype._doLayout = function () {
        // Stop listening for control changes while calculating the layout to avoid an infinite loop scenario
        this._bListenForControlPropertyChanges = false;

        // Deregister the resize handler to avoid multiple instances of the same code running at the same time
        this._deregisterToolbarResize();

        // Polyfill the flexbox support, if necessary
        this._polyfillFlexboxSupport();

        // Cache controls widths and other info, if not done already
        if (!this._bControlsInfoCached) {
            this._cacheControlsInfo();
        }

        // A resize occurred (or was simulated by setting previous width to null to trigger a recalculation)
        if (this._iPreviousToolbarWidth !== this.$().width()) {
            this._iPreviousToolbarWidth = this.$().width();
            this._setControlsOverflowAndShrinking();
        }

        // Register the resize handler again after all calculations are done and it's safe to do so
        // Note: unlike toolbar, we don't call registerResize, but rather registerToolbarResize here, because we handle content change separately
        this._registerToolbarResize();

        // Start listening for property changes on the controls once again
        this._bListenForControlPropertyChanges = true;
    };

    /**
     * If the client does not support the latest flexbox spec, run some polyfill code
     * @private
     */
    OverviewToolbar.prototype._polyfillFlexboxSupport = function () {
        // Modern clients have flexbox natively, do nothing
        if (Toolbar.hasNewFlexBoxSupport) {
            return;
        }

        // Old flexbox polyfill
        if (Toolbar.hasFlexBoxSupport) {
            var $This = this.$();
            var oDomRef = $This[0] || {};
            $This.removeClass("sapMTBOverflow");
            if (oDomRef.scrollWidth > oDomRef.clientWidth) {
                $This.addClass("sapMTBOverflow");
            }
            // IE - run the polyfill
        } else {
            Toolbar.flexie(this.$());
        }
    };


    /**
     * Stores the sizes and other info of controls so they don't need to be recalculated again until they change
     * @private
     */
    OverviewToolbar.prototype._cacheControlsInfo = function () {
        var bStayInOverflow;
        var bMoveToOverflow;

        this._aMovableControls = []; // Controls that can be in the toolbar or action sheet
        this._aToolbarOnlyControls = []; // Controls that can't go to the action sheet (inputs, labels, buttons with special layout, etc...)
        this._aActionSheetOnlyControls = []; // Controls that are forced to stay in the action sheet (buttons with layout)
        this._aControlSizes = {}; // A map of control id -> control *optimal* size in pixels; the optimal size is outerWidth for most controls and min-width for spacers
        this._iContentSize = 0; // The total *optimal* size of all controls in the toolbar

        this.getContent().forEach(function (oControl) {
            var oLayoutData = oControl.getLayoutData();

            if (oLayoutData instanceof OverflowToolbarLayoutData) {
                bStayInOverflow = oLayoutData.getStayInOverflow();
                bMoveToOverflow = oLayoutData.getMoveToOverflow();
            } else {
                bStayInOverflow = false;
                bMoveToOverflow = true;
            }

            var iControlSize = OverviewToolbar._getOptimalControlWidth(oControl);
            this._aControlSizes[oControl.getId()] = iControlSize;

            if (OverviewToolbarAssociativePopoverControls.supportsControl(oControl) && bStayInOverflow) {
                this._aActionSheetOnlyControls.push(oControl);
            } else {
                // Only add up the size of controls that can be shown in the toolbar, hence this addition is here
                this._iContentSize += iControlSize;

                if (OverviewToolbarAssociativePopoverControls.supportsControl(oControl) && bMoveToOverflow) {
                    this._aMovableControls.push(oControl);
                } else {
                    this._aToolbarOnlyControls.push(oControl);
                }
            }
        }, this);

        this._bControlsInfoCached = true;
    };

    /**
     * Moves controls from/to the action sheet
     * Sets/removes flexbox css classes to/from controls
     * @private
     */
    OverviewToolbar.prototype._setControlsOverflowAndShrinking = function () {
        var iToolbarSize = this.$().width(); // toolbar width in pixels
        var iContentSize = this._iContentSize; // total optimal control width in pixels, cached in _cacheControlsInfo and used until invalidated
        var aButtonsToMoveToActionSheet = []; // buttons that must go to the action sheet
        var sIdsHash;
        var i;
        var fnFlushButtonsToActionSheet = function (aButtons) { // helper: moves the buttons in the array to the action sheet
            aButtons.forEach(function (oControl) {
                this._moveButtonToActionSheet(oControl);
            }, this);
        };
        var fnInvalidateIfHashChanged = function (sHash) { // helper: invalidate the toolbar if the signature of the action sheet changed (i.e. buttons moved)
            if (typeof sHash === "undefined" || this._getPopover()._getContentIdsHash() !== sHash) {
                this.invalidate();

                // Preserve focus info
                if (this._getControlsIds().indexOf(sap.ui.getCore().getCurrentFocusedControlId()) !== -1) {
                    this._bControlWasFocused = true;
                }
                if (sap.ui.getCore().getCurrentFocusedControlId() === this._getOverflowButton().getId()) {
                    this._bOverflowButtonWasFocused = true;
                }
            }
        };
        var fnAddOverflowButton = function (iContentSize2) { // helper: show the overflow button and increase content size accordingly, if not shown already
            if (!this._getOverflowButtonNeeded()) {
                iContentSize2 += this._getOverflowButtonSize();
                this._setOverflowButtonNeeded(true);
            }
            return iContentSize2;
        };


        // If _bSkipOptimization is set to true, this means that no controls moved from/to the overflow, but they rather changed internally
        // In this case we can't rely on the action sheet hash to determine whether to skip one invalidation
        if (this._bSkipOptimization) {
            this._bSkipOptimization = false;
        } else {
            sIdsHash = this._getPopover()._getContentIdsHash(); // Hash of the buttons in the action sheet, f.e. "__button1.__button2.__button3"
        }

        // Clean up the action sheet, hide the overflow button, remove flexbox css from controls
        this._resetToolbar();

        // If there are any action sheet only controls, move them to the action sheet first
        if (this._aActionSheetOnlyControls.length) {
            for (i = this._aActionSheetOnlyControls.length - 1; i >= 0; i--) {
                aButtonsToMoveToActionSheet.unshift(this._aActionSheetOnlyControls[i]);
            }

            // At least one control will be in the action sheet, so the overflow button is needed
            iContentSize = fnAddOverflowButton.call(this, iContentSize);
        }

        // If all content fits - put the buttons from the previous step (if any) in the action sheet and stop here
        if (iContentSize <= iToolbarSize) {
            fnFlushButtonsToActionSheet.call(this, aButtonsToMoveToActionSheet);
            fnInvalidateIfHashChanged.call(this, sIdsHash);
            return;
        }

        // Not all content fits
        // If there are buttons that can be moved, start moving them to the action sheet until there is no more overflow left
        if (this._aMovableControls.length) {
            // There is at least one button that will go to the action sheet - add the overflow button, but only if it wasn't added already
            iContentSize = fnAddOverflowButton.call(this, iContentSize);

            // Iterate buttons in reverse, the last one goes in first
            for (i = this._aMovableControls.length - 1; i >= 0; i--) {
                aButtonsToMoveToActionSheet.unshift(this._aMovableControls[i]);
                iContentSize -= this._aControlSizes[this._aMovableControls[i].getId()];

                if (iContentSize <= iToolbarSize) {
                    break;
                }
            }
        }

        // At this point all that could be moved to the action sheet, was moved (action sheet only buttons, some/all movable buttons)
        fnFlushButtonsToActionSheet.call(this, aButtonsToMoveToActionSheet);

        // If content still doesn't fit despite moving all movable items to the action sheet, set the flexbox classes
        if (iContentSize > iToolbarSize) {
            this._checkContents(); // This function sets the css classes to make flexbox work, despite its name
        }

        fnInvalidateIfHashChanged.call(this, sIdsHash);
    };

    /**
     * Resets the toolbar by removing all special behavior from controls, returning it to its default natural state:
     * - all buttons removed from the action sheet and put back to the toolbar
     * - the overflow button is removed
     * - all flexbox classes are removed from items
     * @private
     */
    OverviewToolbar.prototype._resetToolbar = function () {
        // 1. Close the action sheet and remove everything from it (reset overflow behavior)
        // Note: when the action sheet is closed because of toolbar invalidation, we don't want the animation in order to avoid flickering
        this._getPopover().close();
        this._getPopover().getContent().forEach(function (oButton) {
            this._restoreButtonInToolbar(oButton);
        }, this);

        // 2. Hide the overflow button
        this._setOverflowButtonNeeded(false);

        // 3 Remove flex classes (reset shrinking behavior)
        this.getContent().forEach(function (oControl) {
            oControl.removeStyleClass(Toolbar.shrinkClass);
        });
    };

    /**
     * Called for any button that overflows
     * @param oButton
     * @private
     */
    OverviewToolbar.prototype._moveButtonToActionSheet = function (oButton) {
        this._getPopover().addAssociatedContent(oButton);
    };

    /**
     * Called when a button can fit in the toolbar and needs to be restored there
     * @param vButton
     * @private
     */
    OverviewToolbar.prototype._restoreButtonInToolbar = function (vButton) {
        if (typeof vButton === "object") {
            vButton = vButton.getId();
        }
        this._getPopover().removeAssociatedContent(vButton);
    };

    /**
     * Closes the action sheet, resets the toolbar, and re-initializes variables to force a full layout recalc
     * @param bHardReset - skip the optimization, described in _setControlsOverflowAndShrinking
     * @private
     */
    OverviewToolbar.prototype._resetAndInvalidateToolbar = function (bHardReset) {
        this._resetToolbar();

        this._bControlsInfoCached = false;
        this._iPreviousToolbarWidth = null;
        if (bHardReset) {
            this._bSkipOptimization = true;
        }

        this.invalidate();
    };


    /** **************************************SUB-COMPONENTS*****************************************************/


    /**
     * Returns all controls from the toolbar that are not in the action sheet
     * @returns {*|Array.<T>}
     */
    OverviewToolbar.prototype._getVisibleContent = function () {
        var aToolbarContent = this.getContent();
        var aActionSheetContent = this._getPopover().getContent();

        return aToolbarContent.filter(function (oControl) {
            return aActionSheetContent.indexOf(oControl) === -1;
        });
    };

    /**
     * Lazy loader for the overflow button
     * @returns {sap.m.Button}
     * @private
     */
    OverviewToolbar.prototype._getOverflowButton = function () {
        var oOverflowButton;

        if (!this.getAggregation("_overflowButton")) {
            // Create the overflow button
            oOverflowButton = new ToggleButton({
                icon: "sap-icon://overflow",
                press: this._overflowButtonPressed.bind(this),
                ariaLabelledBy: this._sAriaOverflowButtonLabelId,
                tooltip: this._oResourceBundle.getText("LOAD_MORE_DATA"),
                type: sap.m.ButtonType.Transparent
            });

            oOverflowButton.onkeydown = function () {
                // Overwrites onkeydown to avoid double press events
                // - The onkeydown implementation (sap.m.ToggleButton) triggers the ontap event for enter/space
                //   - The ontap event (used by mouse/touch) is firing the press event
                // - When releasing the enter/spacebar key a press event is triggered as well
            };

            this.setAggregation("_overflowButton", oOverflowButton, true);
        }

        return this.getAggregation("_overflowButton");
    };

    /**
     * Shows the action sheet
     * @private
     * @param {sap.ui.base.Event} oEvent Button Press Event
     */
    OverviewToolbar.prototype._overflowButtonPressed = function (oEvent) {
        var oPopover = this._getPopover();
        var sBestPlacement = this._getBestActionSheetPlacement();

        if (oPopover.getPlacement() !== sBestPlacement) {
            oPopover.setPlacement(sBestPlacement);
        }

        if (oPopover.isOpen()) {
            oPopover.close();
        } else {
            oPopover.openBy(oEvent.getSource());
        }
    };

    /**
     * Lazy loader for the popover
     * @returns {sap.m.Popover} Popover
     * @private
     */
    OverviewToolbar.prototype._getPopover = function () {
        var oPopover;

        if (!this.getAggregation("_popover")) {
            // Create the Popover
            oPopover = new OverviewToolbarAssociativePopover(this.getId() + "-popover", {
                showHeader: false,
                modal: false,
                horizontalScrolling: !sap.ui.Device.system.phone,
                contentWidth: sap.ui.Device.system.phone ? "100%" : "auto"
            });
            if (sap.ui.Device.system.phone) {
                // This will trigger when the toolbar is in the header/footer, because the the position is known in advance (strictly top/bottom)
                oPopover.attachBeforeOpen(this._shiftPopupShadow, this);

                // This will trigger when the toolbar is not in the header/footer, when the actual calculation is ready (see the overridden _calcPlacement)
                oPopover.attachAfterOpen(this._shiftPopupShadow, this);
            }

            // This will set the toggle button to "off"
            oPopover.attachAfterClose(this._popOverClosedHandler, this);

            this.setAggregation("_popover", oPopover, true);
        }

        return this.getAggregation("_popover");
    };

    /**
     * On mobile, remove the shadow from the top/bottom, depending on how the popover was opened
     * If the popup is placed on the bottom, remove the top shadow
     * If the popup is placed on the top, remove the bottom shadow
     * If the popup placement is not calculated yet, do nothing
     * @private
     */
    OverviewToolbar.prototype._shiftPopupShadow = function () {
        var oPopover = this._getPopover();
        var sPos = oPopover.getCurrentPosition();

        if (sPos === sap.m.PlacementType.Bottom) {
            oPopover.addStyleClass("sapMOTAPopoverNoShadowTop");
            oPopover.removeStyleClass("sapMOTAPopoverNoShadowBottom");
        } else if (sPos === sap.m.PlacementType.Top) {
            oPopover.addStyleClass("sapMOTAPopoverNoShadowBottom");
            oPopover.removeStyleClass("sapMOTAPopoverNoShadowTop");
        }
    };

    /**
     * Ensures that the overflowButton is no longer pressed when its popOver closes
     * @private
     */
    OverviewToolbar.prototype._popOverClosedHandler = function () {
        this._getOverflowButton().setPressed(false); // Turn off the toggle button
        this._getOverflowButton().$().focus(); // Focus the toggle button so that keyboard handling will work

        // On IE/sometimes other browsers, if you click the toggle button again to close the popover, onAfterClose is triggered first, which closes the popup, and then the click event on the toggle button reopens it
        // To prevent this behaviour, disable the overflow button till the end of the current javascript engine's "tick"
        this._getOverflowButton().setEnabled(false);
        jQuery.sap.delayedCall(0, this, function () {
            this._getOverflowButton().setEnabled(true);

            // In order to restore focus, we must wait another tick here to let the renderer enable it first
            jQuery.sap.delayedCall(0, this, function () {
                this._getOverflowButton().$().focus();
            });
        });
    };

    /**
     * @returns {boolean|*}
     * @private
     */
    OverviewToolbar.prototype._getOverflowButtonNeeded = function () {
        return this._bOverflowButtonNeeded;
    };

    /**
     *
     * @param bValue
     * @returns {OverflowToolbar}
     * @private
     */
    OverviewToolbar.prototype._setOverflowButtonNeeded = function (bValue) {
        if (this._bOverflowButtonNeeded !== bValue) {
            this._bOverflowButtonNeeded = bValue;
        }
        return this;
    };

    /** *************************************AGGREGATIONS AND LISTENERS******************************************/


    OverviewToolbar.prototype.onLayoutDataChange = function () {
        this._resetAndInvalidateToolbar(true);
    };

    OverviewToolbar.prototype.addContent = function (oControl) {
        this._registerControlListener(oControl);
        this._resetAndInvalidateToolbar(false);
        return this._callToolbarMethod("addContent", arguments);
    };


    OverviewToolbar.prototype.insertContent = function (oControl) {
        this._registerControlListener(oControl);
        this._resetAndInvalidateToolbar(false);
        return this._callToolbarMethod("insertContent", arguments);
    };


    OverviewToolbar.prototype.removeContent = function () {
        var vContent = this._callToolbarMethod("removeContent", arguments);
        this._resetAndInvalidateToolbar(false);
        this._deregisterControlListener(vContent);
        return vContent;
    };


    OverviewToolbar.prototype.removeAllContent = function () {
        var aContents = this._callToolbarMethod("removeAllContent", arguments);
        aContents.forEach(this._deregisterControlListener, this);
        this._resetAndInvalidateToolbar(false);
        return aContents;
    };

    OverviewToolbar.prototype.destroyContent = function () {
        this._resetAndInvalidateToolbar(false);

        jQuery.sap.delayedCall(0, this, function () {
            this._resetAndInvalidateToolbar(false);
        });

        return this._callToolbarMethod("destroyContent", arguments);
    };

    /**
     * Every time a control is inserted in the toolbar, it must be monitored for size/visibility changes
     * @param oControl
     * @private
     */
    OverviewToolbar.prototype._registerControlListener = function (oControl) {
        if (oControl) {
            oControl.attachEvent("_change", this._onContentPropertyChangedOverflowToolbar, this);
        }
    };

    /**
     * Each time a control is removed from the toolbar, detach listeners
     * @param oControl
     * @private
     */
    OverviewToolbar.prototype._deregisterControlListener = function (oControl) {
        if (oControl) {
            oControl.detachEvent("_change", this._onContentPropertyChangedOverflowToolbar, this);
        }
    };

    /**
     * Changing a property that affects toolbar content width should trigger a recalculation
     * This function is triggered on any property change, but will ignore some properties that are known to not affect width/visibility
     * @param oEvent
     * @private
     */
    OverviewToolbar.prototype._onContentPropertyChangedOverflowToolbar = function (oEvent) {
        // Listening for property changes is turned off during layout recalculation to avoid infinite loops
        if (!this._bListenForControlPropertyChanges) {
            return;
        }

        var sSourceControlClass = oEvent.getSource().getMetadata().getName();
        var oControlConfig = OverviewToolbarAssociativePopoverControls.getControlConfig(sSourceControlClass);
        var sParameterName = oEvent.getParameter("name");

        // Do nothing if the changed property is in the blacklist above
        if (typeof oControlConfig !== "undefined" &&
            oControlConfig.noInvalidationProps.indexOf(sParameterName) !== -1) {
            return;
        }

        // Trigger a recalculation
        this._resetAndInvalidateToolbar(true);
    };


    /**
     * Returns the size of the overflow button - hardcoded, because it cannot be determined before rendering it
     * @returns {number}
     * @private
     */
    OverviewToolbar.prototype._getOverflowButtonSize = function () {
        var iBaseFontSize = parseInt(sap.m.BaseFontSize, 10);
        var fCoefficient = this.$().parents().hasClass("sapUiSizeCompact") ? 2.5 : 3;

        return parseInt(iBaseFontSize * fCoefficient, 10);
    };


    /**
     * Determines the optimal placement of the action sheet depending on the position of the toolbar in the page
     * For footer and header tags, the placement is hard-coded, for other tags - automatically detected
     * @returns {sap.m.PlacementType}
     * @private
     */
    OverviewToolbar.prototype._getBestActionSheetPlacement = function () {
        var sHtmlTag = this.getHTMLTag();

        // Always open above
        if (sHtmlTag === "Footer") {
            return sap.m.PlacementType.Top;
            // Always open below
        } else if (sHtmlTag === "Header") {
            return sap.m.PlacementType.Bottom;
        }

        return sap.ui.Device.system.phone ? sap.m.PlacementType.Vertical : sap.m.PlacementType.Auto;
    };

    /**
     * Returns an array of the ids of all controls in the overflow toolbar
     * @returns {*|Array}
     * @private
     */
    OverviewToolbar.prototype._getControlsIds = function () {
        return this.getContent().map(function (item) {
            return item.getId();
        });
    };

    /** ************************************************ STATIC ***************************************************/


    /**
     * Returns the optimal width of an element for the purpose of calculating the content width of the OverflowToolbar
     * so that spacers f.e. don't expand too aggressively and take up the whole space
     * @param oControl
     * @returns {*}
     * @private
     */
    OverviewToolbar._getOptimalControlWidth = function (oControl) {
        var iOptimalWidth;

        // For spacers, get the min-width + margins
        if (oControl instanceof ToolbarSpacer) {
            iOptimalWidth = parseInt(oControl.$().css("min-width"), 10) || 0 + oControl.$().outerWidth(true) - oControl.$().outerWidth();
            // For other elements, get the outer width
        } else {
            iOptimalWidth = oControl.$().outerWidth(true);
        }

        return iOptimalWidth;
    };

    return OverviewToolbar;
});
