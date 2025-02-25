sap.ui.define([
    "sap/ui/base/ManagedObject",
    "sap/m/Link"
], function (ManagedObject, Link) {
    "use strict";
    var LinkGenerator = ManagedObject.extend("hc.hph.genomics.ui.lib.vb.site.LinkGenerator", {
        metadata: {
            properties: {
                target: {
                    type: 'string',
                    multiple: false,
                    defaultValue: '_blank'
                },
                href: {
                    type: 'string',
                    multiple: false
                },
                text: { type: 'string' },
                pattern: {
                    type: 'string',
                    defaultValue: '^.+$'
                },
                source: {
                    type: 'any',
                    defaultValue: []
                }
            }
        },
        _replace: function (sText, aMatches) {
            return aMatches.reduce(function (sReplacedText, sMatch, iMatch) {
                if (iMatch < 10) {
                    var oRegExp = new RegExp("\\\\" + iMatch, "g");
                    return sReplacedText.replace(oRegExp, sMatch);
                } else {
                    return sReplacedText;
                }
            }, sText);
        },
        _generateLink: function (oPattern, sSource) {
            var aMatches = oPattern.exec(sSource);
            if (aMatches !== null) {
                return new Link({
                    text: this._replace(this.getText(), aMatches),
                    href: this._replace(this.getHref(), aMatches),
                    target: this.getTarget()
                });
            } else {
                return null;
            }
        },
        generateLinks: function () {
            var that = this;
            var aLinks = [];
            var oLink = null;
            var oPattern = new RegExp(this.getPattern());
            if (typeof this.getSource() === "string") {
                oLink = that._generateLink(oPattern, this.getSource());
                if (oLink) {
                    aLinks.push(oLink);
                }
            } else if (Array.isArray(this.getSource())) {
                var oLinks = {};
                this.getSource().forEach(function (sSource) {
                    oLink = that._generateLink(oPattern, sSource);
                    if (oLink) {
                        oLinks[oLink.getHref()] = oLink;
                    }
                });
                aLinks = Object.keys(oLinks).map(function (sHref) {
                    return oLinks[sHref];
                });
            }
            return aLinks;
        }
    });
    return LinkGenerator;
});