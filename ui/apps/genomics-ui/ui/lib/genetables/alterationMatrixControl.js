sap.ui.define(
    [
        "jquery.sap.global",
        "sap/ui/core/Control",
        "sap/m/Popover"
    ],
    function (jQuery, Control) {
        "use strict";
        jQuery.sap.includeStyleSheet("/hc/hph/genomics/ui/styles/alterationMatrix.css", "hc.hph.genomics.ui.styles.alterationMatrix");
        var AlterationMatrix = Control.extend("hc.hph.genomics.ui.lib.genetables.alterationMatrixControl", {
            metadata:
            {
                properties:
                {
                    width: { type: "sap.ui.core.CSSSize", defaultValue: "100%" },
                    height: { type: "sap.ui.core.CSSSize", defaultValue: "30px" },
                    colors: { type: "string[]", defaultValue: ["#aec7e8", "#1f77b4"] },
                    matrixData: { type: "object" },
                    controlMetadata: { type: "object" },
                    gridHeight: { type: "int", defaultValue: 30 },
                    gridWidth: { type: "int", defaultValue: 10 },
                    gridSpacing: { type: "int", defaultValue: 5 },
                    groupSpacing: { type: "int", defaultValue: 20 },
                    mutationSettings: {
                        type: "object",
                        defaultValue: {
                            "SNV": {
                                "0":{ 
                                "priority": 0,
                                "shape": "square",
                                "color": "rgb(0,176,235)",
                                "name":"Default category"
                                }
                            },
                            "mut_amp": {
                                "priority": 1,
                                "shape": "rectangle",
                                "color": "rgb(255, 0, 0)"
                            },
                            "mut_homdel": {
                                "priority": 1,
                                "shape": "rectangle",
                                "color": "rgb(0, 0, 255)"
                            },
                            "mut_trunc_rec": {
                                "priority": 1,
                                "shape": "square",
                                "color": "rgb(0, 0, 0)"
                            },
                            "mut_trunc": {
                                "priority": 1,
                                "shape": "square",
                                "color": "rgb(0, 0, 0)"
                            },
                            "mut_missense": {
                                "priority": 1,
                                "shape": "sqare",
                                "color": "rgb(0, 128, 0)"
                            },
                            "mut_missense_rec": {
                                "priority": 1,
                                "shape": "sqare",
                                "color": "rgb(0, 128, 0)"
                            },
                            "mrna_down": {
                                "priority": 1,
                                "shape": "rectangle",
                                "color": "rgb(102, 153, 204)"
                            },
                            "mrna_up": {
                                "priority": 1,
                                "shape": "rectangle",
                                "color": "rgb(255, 153, 153)"
                            },
                            "prot_up": {
                                "priority": 1,
                                "shape": "triangle",
                                "type": "up",
                                "color": "rgb(0, 0, 0)"
                            },
                            "prot_down": {
                                "priority": 1,
                                "shape": "triangle",
                                "type": "down",
                                "color": "rgb(0, 0, 0)"
                            },

                            "mut_missense_variant": {
                                "priority": 1,
                                "shape": "sqare",
                                "color": "rgb(0, 128, 0)"
                            },
                            "mut_synonymous_variant": {
                                "priority": 1,
                                "shape": "sqare",
                                "color": "rgb(0, 0, 120)"
                            },
                            "mut_3_prime_UTR_variant": {
                                "priority": 1,
                                "shape": "rectangle",
                                "color": "rgb(255, 153, 153)"
                            },
                            "mut_intergenic_variant": {
                                "priority": 1,
                                "shape": "sqare",
                                "color": "rgb(181, 83, 169)"
                            },
                            "mut_stop_gained": {
                                "priority": 1,
                                "shape": "rectangle",
                                "color": "rgb(85, 123, 0)"
                            }
                        }
                    }
                }
            },

            init: function () {
                //on control init             
            },

            renderer:
            {
                render: function (oRenderManager, oControl) {
                    oRenderManager.write("<div");
                    oRenderManager.writeControlData(oControl);
                    oRenderManager.addClass("sapHcHphAnaAlterationMatrix");
                    oRenderManager.writeClasses();
                    if (oControl.getWidth()) {
                        oRenderManager.addStyle("width", oControl.getWidth());
                    }
                    if (oControl.getHeight()) {
                        oRenderManager.addStyle("height", oControl.getHeight());
                    }
                    oRenderManager.writeStyles();
                    oRenderManager.write(">");

                    //add the inner matrix
                    oRenderManager.write("<svg");
                    oRenderManager.addClass("sapHcHphAnaAlterationMatrixContent");
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");

                    oRenderManager.write("</svg>");

                    //tooltip
                    oRenderManager.write("<div");
                    oRenderManager.addClass("sapHcHphAnaAlterationMatrixContentTooltip");
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");

                    oRenderManager.write("</div>");
                }
            },

            onAfterRendering: function () {
                if (this.getMatrixData()
                    && Object.keys(this.getMatrixData()).length > 0) {
                    this.updateMatrix();
                }

            },
            getI18nData: function (sKey) {
                var oThis = this;
                if (!oThis.getModel("i18n.vb")) {
                    oThis.setModel(new sap.ui.model.resource.ResourceModel({
                        bundleUrl: "/hc/hph/genomics/ui/i18n/vb/messagebundle.hdbtextbundle",
                        bundleLocale: sap.ui.getCore().getConfiguration().getLanguage()
                    }), "i18n.vb");

                }
                return oThis.getModel("i18n.vb").getResourceBundle().getText(sKey);
            },
            updateMatrix: function () {
                var oThis = this;
                var oControl = d3.select("#" + this.getId() + " > svg");
                if (!oThis.oPop) {
                    oThis.oPop = new sap.m.Popover({
                        title: oThis.getI18nData("geneSummary.sampleDetails"),
                        width: "20%"
                    });
                }
                if (oThis.getMatrixData()) {

                    // grid matrix rendering 
                    //loop through the matrix data and render
                    oControl.selectAll(".gridGroup").remove();
                    oControl.selectAll(".gridGroupMatrix").remove();
                    var oGridGroupMatrix = oControl.append("g")
                        .attr("class", ".gridGroupMatrix");

                    var oGridGroup = oControl.append("g")
                        .attr("class", ".gridGroup");

                    oThis._currentSpacing = oThis.getGroupSpacing();

                    var sampleIndex = 0, oDataObj = {};

                    //loop through the sample data and set up a hashmap
                    //loop through the matrix data of cohorts
                    oThis.getMatrixData().forEach(function (aObject, i) {

                        if (!aObject)
                            return;
                        aObject.forEach(function (object, j) {
                            oDataObj = { "mutationObj": object, "sampleIdx": j };

                            oGridGroupMatrix.append("rect")
                                .data([oDataObj])
                                .attr("class", "matrix")
                                .attr("height", oThis.getGridHeight())
                                .attr("width", oThis.getGridWidth())
                                .attr("x", (sampleIndex) * oThis.getGridWidth() + ((sampleIndex) * oThis.getGridSpacing()) + (i * oThis.getGroupSpacing()))
                                .attr("fill", "#d4d6d4")
                                .on("click", function (d) {
                                    oThis._showPopup(d, this);

                                })
                                .on("mouseleave", function (d) {
                                    oThis._hidePopup(d, this);

                                });
                            var aMutationKeys = Object.keys(object);
                            for (var index = 0; index < aMutationKeys.length; index++) {
                                var sMutation = aMutationKeys[index];
                                //object.sId=j;
                                oThis._renderMutation(oThis, oGridGroup, sMutation, oDataObj, sampleIndex, i);
                            }
                            sampleIndex++;
                        });
                    });

                    oThis.setWidth((sampleIndex * oThis.getGridWidth() + oThis._currentSpacing) + "px");
                    oControl.attr("height", oThis.getGridHeight());
                    oControl.attr("width", (sampleIndex * oThis.getGridWidth() + sampleIndex * oThis.getGridSpacing() + (oThis.getMatrixData().length * oThis.getGroupSpacing())));
                }
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

            _renderMutation: function (oThis, oGridGroup, sMutation, object, j, i) {


                var mutation = true;
                var iCategoryIdx = object.mutationObj[sMutation];
                if (isNaN(iCategoryIdx)) {
                    mutation = false;
                }

                var oMutObj = oThis.getMutationSettings()[sMutation][iCategoryIdx];
                switch (sMutation.toLowerCase()) {

                    case "snv":
                        oGridGroup.append("rect")
                            .data([object])
                            .attr("class", "matrix mut " + mutation)
                            .attr("height", (mutation && oMutObj) ? ((oMutObj.shape === "rectangle" && oMutObj.shape !== "triangle") ? oThis.getGridHeight() : oThis.getGridHeight() / 2) : oThis.getGridHeight())
                            .attr("width", oThis.getGridWidth())
                            .attr("fill", (mutation && oMutObj) ? oMutObj.color : "transparent") //#d4d6d4
                            .attr("x", (j * oThis.getGridWidth() + (j * oThis.getGridSpacing()) + (i * oThis.getGroupSpacing())))
                            .attr("y", (mutation && oMutObj) ? ((oMutObj.shape === "rectangle" && oMutObj.shape !== "triangle") ? 0 : oThis.getGridHeight() / 4) : 0)
                            .attr("stroke", "white")
                            .on("click", function (d) {
                                oThis._showPopup(d, this);
                            })
                            .on("mouseleave", function (d) {
                                oThis._hidePopup(d, this);
                            });
                        break;
                    case "disp_cna":
                        oGridGroup.append("rect")
                            .data([object])
                            .attr("class", "matrix cna " + mutation)
                            .attr("height", (mutation && oThis.getMutationSettings()[mutation]) ? ((oThis.getMutationSettings()[mutation].shape === "rectangle" && oThis.getMutationSettings()[mutation].shape !== "triangle") ? oThis.getGridHeight() : oThis.getGridHeight() / 2) : oThis.getGridHeight())
                            .attr("width", oThis.getGridWidth())
                            .attr("stroke", "white")
                            .attr("x", (j * oThis.getGridWidth() + (j * oThis.getGridSpacing()) + (i * oThis.getGroupSpacing())))
                            .attr("y", (mutation && oThis.getMutationSettings()[mutation]) ? ((oThis.getMutationSettings()[mutation].shape === "rectangle" && oThis.getMutationSettings()[mutation].shape !== "triangle") ? 0 : oThis.getGridHeight() / 4) : 0)
                            .attr("fill", (mutation && oThis.getMutationSettings()[mutation]) ? oThis.getMutationSettings()[mutation].color : "transparent");
                        break;

                    case "mut1":
                    case "mut2":
                    case "mut3":
                    case "mut4":
                    case "mut5":
                    case "mut6":
                    case "mut7":
                    case "mut8":
                    case "mut9":
                    case "mut10":
                    case "mut11":
                    case "mut12":
                    case "mut13":
                    case "disp_mut":
                        oGridGroup.append("rect")
                            .data([object])
                            .attr("class", "matrix mut " + mutation)
                            .attr("height", (mutation && oThis.getMutationSettings()[mutation]) ? ((oThis.getMutationSettings()[mutation].shape === "rectangle" && oThis.getMutationSettings()[mutation].shape !== "triangle") ? oThis.getGridHeight() : oThis.getGridHeight() / 2) : oThis.getGridHeight())
                            .attr("width", oThis.getGridWidth())
                            .attr("fill", (mutation && oThis.getMutationSettings()[mutation]) ? oThis.getMutationSettings()[mutation].color : "transparent") //#d4d6d4
                            .attr("x", (j * oThis.getGridWidth() + (j * oThis.getGridSpacing()) + (i * oThis.getGroupSpacing())))
                            .attr("y", (mutation && oThis.getMutationSettings()[mutation]) ? ((oThis.getMutationSettings()[mutation].shape === "rectangle" && oThis.getMutationSettings()[mutation].shape !== "triangle") ? 0 : oThis.getGridHeight() / 4) : 0)
                            .attr("stroke", "white")
                            .on("click", function (d) {
                                oThis._showPopup(d, this);
                            })
                            .on("mouseleave", function (d) {
                                oThis._hidePopup(d, this);
                            });

                        break;

                    case "disp_prot":
                        //                    var mutation = "prot_"+ object[ oMutation.attribute ];
                        //                    
                        //                    var x = ( i*oThis.getGridWidth()+(i * oThis.getGridSpacing() + currentSpace) ) + ( oThis.getGridWidth() / 2 );
                        //                    var y = ( ( mutation && oThis.getMutationSettings()[ mutation ] ) ? ( ( oThis.getMutationSettings()[ mutation ].shape === "triangle" && oThis.getMutationSettings()[ mutation ].type !== "up" ) ? oThis.getGridHeight()/4 : oThis.getGridHeight()*3/4 ) : oThis.getGridHeight()/4 ) 
                        //                    oGridGroup.append("path")
                        //                        .data([object])
                        //                        .attr("class", "matrix prot "+ sample)
                        //                        .attr("d", d3.svg.symbol().type( ( oThis.getMutationSettings()[ mutation ].shape === "triangle" && oThis.getMutationSettings()[ mutation ].type !== "up" ) ? "triangle-up" : "triangle-down" ))
                        //                        .attr("fill", ( mutation && oThis.getMutationSettings()[ mutation ] ) ? oThis.getMutationSettings()[ mutation ].color : "#d4d6d4" )
                        //                        .attr("transform", "translate(" + x + "," + y + ")" ) 
                        //                        //.attr("y",  )
                        //                        .attr("stroke", "white" );
                        ////                      .on("mouseover",function( data ){
                        ////                          oThis._showTooltip( data );
                        ////                      })
                        ////                      .on("mouseout",function( data ){
                        ////                          oThis._hideTooltip( );
                        ////                      });
                        break;

                    case "disp_mrna":

                        //                    var mutation = "mrna_"+ object[ oMutation.attribute ];
                        //                    
                        //                    oGridGroup.append("rect")
                        //                        .data([object])
                        //                        .attr("class", "matrix mrna "+ sample)
                        //                        .attr("height", ( mutation && oThis.getMutationSettings()[ mutation ] ) ? ( ( oThis.getMutationSettings()[ mutation ].shape === "rectangle" && oThis.getMutationSettings()[ mutation ].shape !== "triangle" ) ? oThis.getGridHeight(): oThis.getGridHeight()/2 ) : oThis.getGridHeight())
                        //                        .attr("width", oThis.getGridWidth())
                        //                        .attr("stroke-width", 4)
                        //                        .attr("stroke", ( mutation && oThis.getMutationSettings()[ mutation ] ) ? oThis.getMutationSettings()[ mutation ].color : "#d4d6d4" )
                        //                        .attr("x",(i*oThis.getGridWidth()+(i * oThis.getGridSpacing() + currentSpace) ))
                        //                        .attr("y",  ( mutation && oThis.getMutationSettings()[ mutation ] ) ? ( ( oThis.getMutationSettings()[ mutation ].shape === "rectangle" && oThis.getMutationSettings()[ mutation ].shape !== "triangle" ) ? 0: oThis.getGridHeight()/4 ) : 0)
                        //                        .attr("fill", "none" );
                        ////                      .on("mouseover",function( data ){
                        ////                          oThis._showTooltip( data );
                        ////                      })
                        ////                      .on("mouseout",function( data ){
                        ////                          oThis._hideTooltip( );
                        ////                      });
                        break;

                }
            },
            loadPopupContent: function (oData) {
                var oThis = this;
                var oDetails = oThis.getControlMetadata()[0].samples[oData.sampleIdx];
                var oMData = oData.mutationObj;
                var oVBox = new sap.m.VBox({ width: "100%" });
                oVBox.addStyleClass("sapUiTinyMarginTopBottom").addStyleClass("sapUiMediumMarginBeginEnd");
                //bind the data 
                var aMutList = "-";
                if (Object.keys(oMData).length !== 0) {
                    aMutList = Object.keys(oMData);
                }
                var oItems = [
                    { label: "geneSummary.patientName", value: oDetails.patient.firstName + " " + oDetails.patient.lastName },
                    { label: "common.SampleClass", value: oDetails.interaction.class },
                    { label: "common.MutationType", value: aMutList },
                    { label: "geneSummary.sampleId", value: oDetails.patient.id }];

                for (var i = 0; i < oItems.length; i++) {
                    oVBox.addItem(new sap.m.Label({
                        "text": oThis.getModel("i18n.vb").getResourceBundle().getText(oItems[i].label) + " :",
                        "design": "Bold"
                    }));
                    oVBox.addItem(new sap.m.Text({ "text": oItems[i].value }).addStyleClass("sapUiTinyMarginBottom"));
                }
                oThis.oPop.destroyContent();
                oThis.oPop.addContent(oVBox);
                var oToolbar = new sap.m.Toolbar();
                var oBtn = new sap.m.Button({
                    text: oThis.getModel("i18n.vb").getResourceBundle().getText("geneSummary.viewPatient"),
                    icon: "sap-icon://person-placeholder",
                    press: function (oEvent) {
                        //  console.log(oData);
                        var oPatient = oThis.getControlMetadata()[0].samples[oData.sampleIdx].patient;
                        var oComponentContainer = oThis.getPatientSummaryForSample().getContent()[0].getContent()[0];
                        if (oComponentContainer.getComponentInstance()) {
                            oComponentContainer.getComponentInstance().setPatientId(oPatient.dwid);
                        }
                        else {
                            oThis.getPatientSummaryForSample().getModel().setProperty("/settings/patientId", oPatient.dwid);
                        }
                        oThis.getPatientSummaryForSample().getContent()[0].open();
                    }
                });

                oToolbar.addContent(new sap.m.ToolbarSpacer());
                oToolbar.addContent(oBtn);
                oThis.oPop.setFooter(oToolbar);

            },

            _showPopup: function (oData, oThat) {
                var oThis = this;
                //oThis._hidePopup();
                oThis.loadPopupContent(oData);//,oDetails,oData.mutationObj);
                oThis.oPop.openBy(d3.select(oThat)[0][0]);
            },

            _hidePopup: function () {
                //  var oThis=this;
                // oThis.oPop.close();

            },
            getPatientSummaryForSample: function () {
                var oThis = this;
                if (!oThis.mPatientSummary) {
                    oThis.mPatientSummary = sap.ui.xmlview({ viewName: "hc.hph.genomics.ui.lib.vb.site.PatientSummary", viewData: oThis });
                    oThis.addDependent(oThis.mPatientSummary);
                }
                return this.mPatientSummary;
            }
            /* _showTooltip: function( oData ){
                 var oThis = this;
                 var oControl = $( "#" + this.getId() + " > .sapHcHphAnaAlterationMatrixContentTooltip" );
                 oControl.html("");
                 var str="";
                 for( var key in Object.keys(oData) ){
                     str += (key + " : "+oData[key])+"<br>";
                 }
                 oControl.append("<div class='tooltipText'> "+str+"<div>");
                 
                 //ocontrol.css({"top": d3.event.clientX, "left": d3.event.clientY});
                 oControl.css("left", (d3.event.pageX + d3.event.offsetX)+"px").css("top", (d3.event.pageY)+"px");
                 oControl.show();
                 
             },
              
             _hideTooltip: function(){
                 $(".sapHcHphAnaAlterationMatrixContentTooltip").hide();
             }
             */

        });

        return AlterationMatrix;
    });