sap.ui.define([
    "jquery.sap.global",
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
	"hc/hph/cdw/config/ui/lib/BackendLinker"
], function (jQuery, ConfigUtils, BackendLinker) {
    "use strict";

/**
 * Constructor for a new configuration instance
 *
 * @classdesc
 * Document me!
 * 
 * @constructor
 * @public 
 * @name        hc.hph.cdw.config.ui.lib.Config
 */

var Config = function() {
this._config = null;	
};
	
	Config.prototype.load = function(configId, configVersion) {

	// changed - starting to align to one config service
	this._config = BackendLinker.getBEConfigSync(configId, configVersion, true, false, true);
	return this._config;
};


Config.prototype.getData = function() {
	return this._config;
};

Config.prototype.getAttributeDefinition = function(sAttributeKey) {
	var aMatches = (/([\w\.]+)\.(\d)\.attributes\.(\w+)/g).exec(sAttributeKey);
	if (aMatches) {
		sAttributeKey = [aMatches[1], "attributes", aMatches[3]].join(".");
	}
	return ConfigUtils.getPropertyByPath(this._config, sAttributeKey);
};

Config.prototype.isCategoryAttribute = function(sAttributeKey) {
	var oAttributeDef = this.getAttributeDefinition(sAttributeKey);
	
	if (oAttributeDef) {
		return oAttributeDef.hasOwnProperty("expression");
	}
	return false;
};

Config.prototype.isMeasureAttribute = function(sAttributeKey) {
	var oAttributeDef = this.getAttributeDefinition(sAttributeKey);
	
	if (oAttributeDef) {
		if (oAttributeDef.hasOwnProperty("type")) {
			return oAttributeDef.type === "num";
		} else {
			return false;
		}
			
	} else {
		return false;
	}
};

Config.prototype.getNameForAttribute = function(sAttributeKey) {
	ConfigUtils.logDebug("Config.getNameForAttribute", sAttributeKey);
	var that = this;
	
	if (typeof sAttributeKey === "undefined") { return "undefined"; }

	/*
	 * patient.conditions.COND.interactions.INT.X.attributes.ATT
	 * patient.conditions.COND.interactions.INT
	 * patient.conditions.COND.interactions.INT.X
	 * patient.interactions.INT.X.attributes.ATT
	 * patient.interactions.INT
	 * patient.attributes.ATT
	 */
	var aRegExps = [ //                   1                    2      3                  4
		{ regexp: /patient\.conditions\.(\w+)\.interactions\.(\w+)\.(\w+)\.attributes\.(\w+)/g,
		  longLabel:  function(aMatches) { return [ that._config.patient.conditions[aMatches[1]].interactions[aMatches[2]].name, " ", aMatches[3], ": ", that._config.patient.conditions[aMatches[1]].interactions[aMatches[2]].attributes[aMatches[4]].name].join(""); },
		  shortLabel: function(aMatches) { return   that._config.patient.conditions[aMatches[1]].interactions[aMatches[2]].attributes[aMatches[4]].name; }
		}, //                             1                    2                  3
		{ regexp: /patient\.conditions\.(\w+)\.interactions\.(\w+)\.attributes\.(\w+)/g,
			  longLabel:  function(aMatches) { return [ that._config.patient.conditions[aMatches[1]].interactions[aMatches[2]].name, ": ", that._config.patient.conditions[aMatches[1]].interactions[aMatches[2]].attributes[aMatches[3]].name].join(""); },
			  shortLabel: function(aMatches) { return   that._config.patient.conditions[aMatches[1]].interactions[aMatches[2]].attributes[aMatches[3]].name; }
		}, //                             1                    2      3
		{ regexp: /patient\.conditions\.(\w+)\.interactions\.(\w+)\.(\w+)/g,
			  longLabel:  function(aMatches) { return [ that._config.patient.conditions[aMatches[1]].interactions[aMatches[2]].name, " ", aMatches[3] ].join(""); },
			  shortLabel: function(aMatches) { return [ that._config.patient.conditions[aMatches[1]].interactions[aMatches[2]].name, " ", aMatches[3] ].join(""); }
		}, //                             1                    2
		{ regexp: /patient\.conditions\.(\w+)\.interactions\.(\w+)/g,
			  longLabel:  function(aMatches) { return   that._config.patient.conditions[aMatches[1]].interactions[aMatches[2]].name; },
			  shortLabel: function(aMatches) { return   that._config.patient.conditions[aMatches[1]].interactions[aMatches[2]].name; }
		}, 
		{ regexp: /patient\.interactions\.(\w+)\.(\w+)\.attributes\.(\w+)/g, 
			  longLabel:  function(aMatches) { return [ that._config.patient.interactions[aMatches[1]].name, " ", aMatches[2], ": ", that._config.patient.interactions[aMatches[1]].attributes[aMatches[3]].name].join(""); },
			  shortLabel: function(aMatches) { return   that._config.patient.interactions[aMatches[1]].attributes[aMatches[3]].name; }
		}, 
		{ regexp: /patient\.interactions\.(\w+)\.attributes\.(\w+)/g, 
			  longLabel:  function(aMatches) { return [ that._config.patient.interactions[aMatches[1]].name, ": ", that._config.patient.interactions[aMatches[1]].attributes[aMatches[2]].name].join(""); },
			  shortLabel: function(aMatches) { return   that._config.patient.interactions[aMatches[1]].attributes[aMatches[2]].name; }
		}, 
		{ regexp: /patient\.interactions\.(\w+)/g, 
			  longLabel:  function(aMatches) { return that._config.patient.interactions[aMatches[1]].name; },
			  shortLabel: function(aMatches) { return that._config.patient.interactions[aMatches[1]].name; }
		},		
		{ regexp: /patient\.attributes\.(\w+)/g, 
			  longLabel:  function(aMatches) { return [ConfigUtils.getText("MENUITEM_INTERACTIONS_GENERAL"), ": ", that._config.patient.attributes[aMatches[1]].name].join(""); },
			  shortLabel: function(aMatches) { return that._config.patient.attributes[aMatches[1]].name; }
		}
	];

	var mAttributeName = { shortName: "unknown", longName: "unknown" };
	$.each(aRegExps, function(i, e) {
		var aMatches = e.regexp.exec(sAttributeKey);
		if (aMatches) {
			mAttributeName.shortName = e.shortLabel(aMatches);
			mAttributeName.longName  = e.longLabel(aMatches);
			return false; // break;
		}
	});
	
	return mAttributeName; 
};

Config.prototype.isValidAttribute = function(sAttributeKey, bCategory, bMeasure, sScope) {

	/*
	 * Check whether attribute is in scope before further testing for measure or category.
	 */
	if (typeof sScope === "undefined") { sScope = ""; }
	
	var aMatches = (/([\w\.]+)\.(\d)\.attributes\.(\w+)/g).exec(sAttributeKey);
	if (aMatches) {
		sAttributeKey = [aMatches[1], "attributes", aMatches[3]].join(".");
	}
	var oAttributeDesc = ConfigUtils.getPropertyByPath(this._config, sAttributeKey);
	if (oAttributeDesc) {
		if (oAttributeDesc.hasOwnProperty("scope")) {
			if (sScope !== "") {
				if (oAttributeDesc.scope.hasOwnProperty(sScope) && !oAttributeDesc.scope[sScope] ) {
					return false;
				}
			}
		}
	} else {
		// no config path found for sAttributeKey
		return false;
	}
	
	/*
	 * If we arrive here we passed the scope test. Now check for measure or category.
	 */
	var nMask = ((this.isCategoryAttribute(sAttributeKey)?1:0) << 1) | (this.isMeasureAttribute(sAttributeKey)?1:0);
	return (nMask & (((bCategory?1:0)<<1) | (bMeasure?1:0)))  !== 0;
};
	
	return Config;
});


