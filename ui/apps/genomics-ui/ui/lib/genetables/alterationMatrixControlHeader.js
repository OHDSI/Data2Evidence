sap.ui.define(
    [
        "jquery.sap.global",
        "sap/ui/core/Control",
        "sap/m/HBox",
        "sap/m/Label"
    ],
    function (jQuery, Control, HBox, sapLabel) {
        "use strict";

        jQuery.sap.includeStyleSheet("/hc/hph/genomics/ui/styles/alterationMatrixControlHeader.css", "hc.hph.genomics.ui.styles.alterationMatrixControlHeader");

        var AlterationMatrixHeader = Control.extend("hc.hph.genomics.ui.lib.genetables.AlterationMatrixControlHeader", {

            metadata:
            {
                properties:
                {
                    width: { type: "sap.ui.core.CSSSize", defaultValue: "100%" },
                    height: { type: "sap.ui.core.CSSSize", defaultValue: "100%" },
                    colors: { type: "string[]", defaultValue: ["#aec7e8", "#1f77b4"] },
                    matrixData: { type: "object", defaultValue: [] },
                    controlMetadata: { type: "object", defaultValue: {} },
                    gridHeight: { type: "int", defaultValue: 30 },
                    gridWidth: { type: "int", defaultValue: 10 },
                    gridSpacing: { type: "int", defaultValue: 5 },
                    text: { type: "string", defaultValue: "" },
                    groupSpacing: { type: "int", defaultValue: 20 },
                    showGroup: { type: "boolean", defaultValue: false },
                    sampleAttr: { type: "string", defaultValue: "" },
                    groupAttr: { type: "string", defaultValue: "" }

                },
                aggregations: {

                    _oHBox: {
                        type: 'sap.m.HBox',
                        multiple: false
                    }
                }

            },

            init: function () {
                this.updateMatrix();
                // this.setAggregation('_label', new Label({ text: this.getProperty('label') }));

            },

            renderer:
            {
                render: function (oRenderManager, oControl) {
                    oRenderManager.write('<div');
                    oRenderManager.writeControlData(oControl);
                    oRenderManager.writeClasses();
                    oRenderManager.write('>');
                    oRenderManager.renderControl(oControl.getAggregation("_oHBox"));
                    oRenderManager.write("</div>");

                    /*oRenderManager.write( "<label" );
                    oRenderManager.writeControlData( oControl );
                    oRenderManager.addClass( "sapHcHphAnaAlterationMatrixHeader" );
                    oRenderManager.writeClasses();
                    if ( oControl.getWidth() )
                    {
                         oRenderManager.addStyle( "width", oControl.getWidth() );
                    }
                    if ( oControl.getHeight() )
                    {
                         oRenderManager.addStyle( "height", oControl.getHeight() );
                    }
                    oRenderManager.writeStyles();
                    oRenderManager.write( ">" );
                                                                    
                         //label
                         oRenderManager.write( "<label" );
                         oRenderManager.addClass( "sapHcHphAnaAlterationMatrixHeaderLabel" );
                         oRenderManager.writeClasses();
                         oRenderManager.write( "></label>" );
                         
                    oRenderManager.write( "</label>" );*/
                }
            },

            onAfterRendering: function () {
                this._groupObj = undefined;
                //this.updateMatrix();
            },
            updateMatrix: function () {
                var oThis = this;
                var oHBox = new HBox();
                var nextSpace = 0, oLabel;
                if (oThis.getMatrixData()) {

                    oThis.getMatrixData().forEach(function (object) {
                        oLabel = new sapLabel({ text: object.name, tooltip: object.name });
                        oLabel.$().css('left-margin', nextSpace + oThis.getGroupSpacing() + 'px!important');
                        jQuery("#" + oLabel.getId()).css('left-margin', nextSpace + oThis.getGroupSpacing() + 'px!important');
                        oLabel.addStyleClass('AltMatrixColumnHeaderBold');
                        //calculate the space for the next label
                        nextSpace = object.samples.length * (oThis.getGridSpacing() + oThis.getGridWidth());
                        //set width for the current label too 
                        oLabel.setWidth(nextSpace + oThis.getGroupSpacing() + 'px');
                        oHBox.addItem(oLabel);

                    });
                }
                this.setAggregation('_oHBox', oHBox);
            },

            updateMatrixDeprecated: function () {
                var oThis = this;
                var oControl = $("#" + this.getId() + " > .sapHcHphAnaAlterationMatrixHeaderLabel");

                //           oControl.html( this.getText() );

                //get the metadata
                var oMetadata = oThis.getControlMetadata();
                var bSorting = oMetadata.enableSorting;
                var bGrouping = oMetadata.enableGrouping;

                //           aData = aData.sort(function(obj1,obj2){ return ( obj1.patient === obj2.patient ) ? 0 : obj1.patient < obj2.patient ? -1 : 1 });
                if (oThis.getMatrixData()) {

                    oThis.getMatrixData().forEach(function (object, i) {

                        var groupedAttr = object[oThis.getGroupAttr()] ? object[oThis.getGroupAttr()] : "group";
                        if (!oThis._groupObj) {
                            oThis._groupObj = [];
                            oThis._currentSpacing = 0;
                            oThis._spacing = -30;
                        }



                        if (!oThis._groupObj[object[oThis.getGroupAttr()]]) {
                            oThis._groupObj[object[oThis.getGroupAttr()]] = oThis._currentSpacing;

                            oThis._currentSpacing += oThis.getGroupSpacing();

                            //add the label
                            if (oThis.getGroupAttr()) {
                                var oLabel = $("<label class='groupLabel'></label>").text(object[oThis.getGroupAttr()]);
                                oLabel.css({ "left": (oThis._spacing + oThis._currentSpacing + 20) + "px" });
                                oControl.append(oLabel);
                            }
                        }

                        object.samples.forEach(function (sampleObject, i) {

                            //for each sample
                            oThis._spacing += (oThis.getGridWidth() + oThis.getGridSpacing());
                            if (oThis.getSampleAttr()) {

                                var sPath, aPaths = oThis.getSampleAttr().split(".");
                                sPath = sampleObject[aPaths[0]];
                                for (var idx = 1; idx < aPaths.length; idx++) {
                                    sPath = sPath[aPaths[idx]];

                                }
                                //var sample = sampleObject[ oThis.getSampleAttr() ];
                                var sample = sPath;
                                var sSample = (sample.length > 8) ? sample.substring(0, 8) + ".." : sample.substring(0, 8);
                                oLabel = $("<label class='sampleLabel'></label>").attr("title", sample).text(sSample);
                                oLabel.css({ "left": (oThis._spacing + oThis._currentSpacing) + "px" });
                                oControl.append(oLabel);
                            }
                        });


                        var currentSpace = oThis._groupObj[object[oThis.getGroupAttr()]];

                    });

                }

            },

            setText: function (sValue) {
                this.setProperty("text", sValue, false);
            },

            setMatrixData: function (aData) {
                if (aData) {
                    this.setProperty("matrixData", aData, false);
                    this.updateMatrix();
                }
            },

            setWidth: function (iWidth) {
                if (iWidth) {
                    this.setProperty("width", iWidth, false);
                }
            },

            setSampleAttr: function (sValue) {
                this.setProperty("sampleAttr", sValue, false);
                //           this.setHeight("30px");
            },

            setGroupAttr: function (sValue) {
                this.setProperty("groupAttr", sValue, false);
                //           this.setHeight("100px");
            }


        });

        return AlterationMatrixHeader;
    });