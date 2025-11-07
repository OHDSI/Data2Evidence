sap.ui.define([], function () {
    "use strict";

    var DEFAULT_START_VALUE = 0;

    /* eslint-disable no-unused-vars, valid-jsdoc */
    /**
     * "Abstract base class" for key counter object implementing a specific counting strategy.
     *
     * It handles the bookkeepring needed to keep of indices used and i
     * instatiates the start value.
     *
     * @constructor
     * @param {integer} [counterStartValue=DEFAULT_START_VALUE]  - the first value to be returned for each new key
     *
     * @classdesc
     * BaseKeyCounter class
     * @alias sap.hc.mri.pa.ui.lib.utils.BaseKeyCounter
     */
    function BaseKeyCounter(counterStartValue) {
        this._counterStartValue = counterStartValue || DEFAULT_START_VALUE;
        this._valuesGenerated = {};
    }

    /**
    * Get next index for the given key.
    *
    * This method is called BEFORE the newly generated index has been stored
    * in the internal list of indices used.
    *
    * This methods must be overrriden in derived classes, but should not be
    * called directly (only through getNextValueFor()).
    *
    * @protected
    * @param {string} key - key for which new index is needed
    * @returns {integer} next index
    */
    BaseKeyCounter.prototype.getUncheckedNextValueFor = function (key) {
        throw new Error("This function must be implemented!");
    };

    /**
    * Get next index for the given key, storing and checking the generated
    * index.
    *
    * This method is wrapper on getUncheckedNextValueFor() which keeps
    * track of the indices produced and throws an error if a non-released index
    * is about to be handed out a second time.
    *
    * This method should NOT be overrriden, overrride getUncheckedNextValueFor()
    * instead.
    *
    * @param {string} key - key for which new index is needed
    * @returns {integer} next index
    */
    BaseKeyCounter.prototype.getNextValueFor = function (key) {
        var nextValue = this.getUncheckedNextValueFor(key);
        if (!(key in this._valuesGenerated)) {
            this._valuesGenerated[key] = [];
        } else if (this._valuesGenerated[key].indexOf(nextValue) >= 0) {
            throw new Error("Already used the index " + nextValue + " for the key " + key + "!");
        }
        this._valuesGenerated[key].push(nextValue);
        return nextValue;
    };

    /**
    * Set the next index to be handed out to a specified value.
    *
    * This methods must be overrriden in derived classes.
    *
    * @abstract
    * @param {string} key - key for which to reset the next index
    * @param {integer} value - next index value to be handed out
    */
    BaseKeyCounter.prototype.setNextValueFor = function (key, value) {
        throw new Error("This function must be implemented!");
    };

    /**
    * Reset the counter after the release of a given index.
    *
    * This method is called AFTER the index to be released has already been
    * removed from the internal list of used indices.
    *
    * This methods must be overrriden in derived classes, but should not be
    * called directly (only through releaseIndexFor()).
    *
    * @protected
    * @param {string} key - key for which index has been released
    * @param {integer} index - index that was released
    */
    BaseKeyCounter.prototype.resetCounterAfterRelease = function (key, index) {
        throw new Error("This function must be implemented!");
    };

    /**
    * Inform the counter that a given index for a given key has been released.
    *
    * This method wraps resetCounterAfterRelease() and removes
    * the released index from the internal list of used indices.
    *
    * This method should NOT be overrriden, overrride resetCounterAfterRelease()
    * instead.
    *
    * @param {string} key - key for which index has been released
    * @param {integer} index - index that was released
    */
    BaseKeyCounter.prototype.releaseIndexFor = function (key, index) {
        if (!(key in this._valuesGenerated)) {
            throw new Error("Trying to release index for the unknown key " + key + "!");
        } else {
            this._valuesGenerated[key] = this._valuesGenerated[key].filter(function (storedIndex) {
                return storedIndex !== index;
            });
        }
        this.resetCounterAfterRelease(key, index);
    };

    /**
    * Reset the internal counter state after blocking a given index (primarily
    * by ensuring that the next index to generate is set correctly).
    *
    * This method is called AFTER the index to be blocked has already been
    * added to the internal list of used indices.
    *
    * This methods must be overrriden in derived classes, but should not be
    * called directly (only through blockIndexFor()).
    *
    * @protected
    * @param {string} key - key for which index has been blocked
    * @param {integer} index - index that was blocked
    */
    BaseKeyCounter.prototype.resetCounterAfterBlock = function (key, index) {
        throw new Error("This function must be implemented!");
    };

    /**
    * Inform the counter that a given index has been taken. This is used to
    * keep the counter up-to-date when using externally added indices.
    *
    * This method wraps resetCounterAfterBlock() and removes
    * the released index from the internal list of used indices.
    *
    * This method should NOT be overrriden, overrride resetCounterAfterBlock()
    * instead.
    *
    * @param {string} key - key for which index has been blocked
    * @param {integer} index - index that was blocked
    */
    BaseKeyCounter.prototype.blockIndexFor = function (key, index) {
        if (!(key in this._valuesGenerated)) {
            this._valuesGenerated[key] = [];
        } else if (this._valuesGenerated[key].indexOf(index) >= 0) {
            throw new Error("Already used the index " + index + " for the key " + key + "!");
        }
        this._valuesGenerated[key].push(index);
        this.resetCounterAfterBlock(key, index);
    };
    /* eslint-enable no-unused-vars, valid-jsdoc */


    /**
     * Constructor for an AlwaysIncreaseCounter which always increases the
     * index by 1 each time without ever going back (filtercard labelling
     * behavior in FP2).
     *
     * @constructor
     * @param {integer} counterStartValue The first value to be returned for each new key.
     *
     * @classdesc
     * AlwaysIncreaseCounter class
     * @alias sap.hc.mri.pa.ui.lib.utils.AlwaysIncreaseCounter
     */
    function AlwaysIncreaseCounter(counterStartValue) {
        BaseKeyCounter.call(this, counterStartValue);
        this._counterMap = {};
    }

    AlwaysIncreaseCounter.prototype = Object.create(BaseKeyCounter.prototype);
    AlwaysIncreaseCounter.prototype.constructor = AlwaysIncreaseCounter;

    AlwaysIncreaseCounter.prototype.getUncheckedNextValueFor = function (key) {
        var nextValue = this._counterMap[key] || this._counterStartValue;
        this._counterMap[key] = nextValue + 1;
        return nextValue;
    };

    AlwaysIncreaseCounter.prototype.setNextValueFor = function (key, value) {
        this._counterMap[key] = value;
    };

    AlwaysIncreaseCounter.prototype.resetCounterAfterRelease = function () {
        // Does not do anything.
    };

    AlwaysIncreaseCounter.prototype.resetCounterAfterBlock = function (key, index) {
        /* Update if key is new or the new index is larger than what we
        already have generated */
        if (!(key in this._counterMap) || this._counterMap[key] < index + 1) {
            this._counterMap[key] = index + 1;
        }
    };

    /**
     * Constructor for a new IncreaseFromMaxAvailableCounter, the strategy of
     * always picking the highest free index for each key (filtercard
     * labelling behavior in FP3).
     *
     * @constructor
     * @param {integer} counterStartValue The first value to be returned for each new key.
     *
     * @classdesc
     * IncreaseFromMaxAvailableCounter class
     * @alias sap.hc.mri.pa.ui.lib.utils.IncreaseFromMaxAvailableCounter
     */
    function IncreaseFromMaxAvailableCounter(counterStartValue) {
        BaseKeyCounter.call(this, counterStartValue);
        this._counterMap = {};
    }

    IncreaseFromMaxAvailableCounter.prototype = Object.create(BaseKeyCounter.prototype);
    IncreaseFromMaxAvailableCounter.prototype.constructor = IncreaseFromMaxAvailableCounter;

    IncreaseFromMaxAvailableCounter.prototype.getUncheckedNextValueFor = function (key) {
        var nextValue = this._counterMap[key] || this._counterStartValue;
        this._counterMap[key] = nextValue + 1;
        return nextValue;
    };

    IncreaseFromMaxAvailableCounter.prototype.setNextValueFor = function (key, value) {
        this._counterMap[key] = value;
    };

    IncreaseFromMaxAvailableCounter.prototype.resetCounterAfterRelease = function (key) {
        /* We reset so that the next generated value is 1 above the highest,
        unreleased value generated so far */
        if (this._valuesGenerated[key].length === 0) {
            this._counterMap[key] = this._counterStartValue;
        } else {
            this._counterMap[key] = Math.max.apply(null, this._valuesGenerated[key]) + 1;
        }
    };

    IncreaseFromMaxAvailableCounter.prototype.resetCounterAfterBlock = function (key, index) {
        /* We reset so that the next generated value is 1 above the highest,
        unreleased value generated so far */
        if (!(key in this._counterMap) || this._counterMap[key] < index + 1) {
            this._counterMap[key] = index + 1;
        }
    };

    /**
    * Object holding all possible strategies.
    *
    * The key "default" acts as an alias for another strategy to allow
    * swapping the default everywhere; this key should always be present.
    */
    var ALLOWED_STRATEGIES = Object.freeze({
        default: IncreaseFromMaxAvailableCounter,
        alwaysIncrease: AlwaysIncreaseCounter,
        increaseFromMaxAvailable: IncreaseFromMaxAvailableCounter
    });

    var factory = {
        /**
        * Get a list of the names of all allowed strategies.
        *
        * @returns {string[]} - list of strategy names
        */
        getAllowedStrategies: function () {
            return Object.keys(ALLOWED_STRATEGIES);
        },

        /**
         * Factory function for counter strategies (implemented as KeyCounter objects).
         *
         * @param {string} strategyName Name (key) for the chosen satrategy
         * @param {integer} counterStartValue The first value to be returned for each new key. Defaults to 0;
         * @returns {BaseKeyCounter} key counter obejct implementing required strategy
         */
        getKeyCountingStrategy: function (strategyName, counterStartValue) {
            if (strategyName in ALLOWED_STRATEGIES) {
                return new ALLOWED_STRATEGIES[strategyName](counterStartValue);
            } else {
                throw new Error("No counting strategy named '" + strategyName + "' - possible strategies are:\n'" + Object.keys(ALLOWED_STRATEGIES));
            }
        }
    };


    return factory;
});
