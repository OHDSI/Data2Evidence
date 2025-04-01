sap.ui.define([
    'jquery.sap.global',
    'sap/hc/mri/pa/ui/Utils',
    'sap/hc/hph/core/ui/AjaxUtils',
    'sap/m/MessageToast',
    'sap/ui/core/mvc/Controller',
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/bookmarks/BMv2Parser",
    "sap/hc/mri/pa/ui/lib/ifr/ChartableCardsVisitor",
    "sap/hc/mri/pa/ui/lib/ifr/IFR2Request",
    "sap/ui/model/resource/ResourceModel",
    'sap/ui/model/json/JSONModel',
    "sap/ui/unified/Menu",
    "sap/ui/unified/MenuItem",
    "sap/hc/mri/pa/ui/lib/MenuButton",
    "sap/ui/unified/MenuTextFieldItem",
    "sap/hc/mri/pa/ui/lib/AttributeMenuButton",
    "sap/hc/mri/pa/ui/lib/VariantValidator"
    
], function (jQuery, Utils,AjaxUtils, MessageToast, Controller, MriFrontendConfig, BMv2Parser, ChartableCardsVisitor, IFR2Request, ResourceModel, JSONModel,Menu,MenuItem,MenuButton,MenuTextFieldItem,AttributeMenuButton, VariantValidator) {
    Controller.extend('sap.hc.mri.pa.ui.views.VueVariantBrowserContainer', {
        onInit: function () {
            jQuery.sap.includeStyleSheet( "/sap/hc/hph/genomics/ui/styles/alterationMatrix.css", "sap.hc.hph.genomics.ui.styles.alterationMatrix" );
            this.eventBus = sap.ui.getCore().getEventBus();
            var variantFilterCardModel = new JSONModel({
                filterCards: [{ key: 'All', text: 'All' }]
            });
            this.getView().setModel(variantFilterCardModel, "variantFilterCardModel");

            this.variantSelection = this.byId('variantSelection');
            this.sessionID = '';

            if (!this.genomicsView) {
                this.genomicsView = sap.ui.xmlview({ type: sap.ui.core.mvc.ViewType.XML, viewName: "sap.hc.mri.pa.ui.views.MriVariantBrowser" });
            }
            this.getView().setModel(new ResourceModel({
                bundleUrl: "/sap/hc/hph/genomics/ui/i18n/vb/messagebundle.properties"
            }), 'i18n.vb_vue');
            this.getView().setModel(new ResourceModel({
                bundleUrl: "/sap/hc/hph/genomics/ui/i18n/vb/messagebundle.properties"
            }), 'i18n.vb');
            this.getView().setModel(new ResourceModel({
                bundleUrl: "/sap/hc/hph/genomics/ui/i18n/vb/messagebundle.properties"
            }), 'i18n.vb_vue');
            this.vbObj = this.genomicsView.byId('mriVbCohorts');
            this._oSessionModel=this.genomicsView.getModel("SessionModel");  //* 
            this._oIFRModel=this.genomicsView.getModel("oIFRModel");
            this._drawDropDown();
            this.genomicsViewContainer = this.getView().byId("genomicsComponent");
            this.genomicsViewContainer.addContent(this.genomicsView);

            this._sampleInteractionPath = MriFrontendConfig.getFrontendConfig().getInterHavingAttrAnnotation("genomics_sample_id")[0];
            this._variantInteractionPath = MriFrontendConfig.getFrontendConfig().getInterHavingAttrAnnotation("genomics_variant_location")[0];
            if (this._variantInteractionPath) {
                this._variantLocationAttribute = MriFrontendConfig.getFrontendConfig().getFilterCardByPath(this._variantInteractionPath)
                    .getAttributesWithAnnotation("genomics_variant_location")[0];
            }

            

            this.getView().setModel(new JSONModel({
                colorPalette: ['#EB7300', '#93C939', '#F0AB00', '#960981', '#EB7396', '#E35500', '#4FB81C', '#D29600', '#760A85', '#C87396', '#BC3618', '#247230', '#BE8200', '#45157E', '#A07396'],
                referenceName: MriFrontendConfig.getFrontendConfig().getChartOptions('vb').referenceName
            }), 'settingsModel');

            this.genomicsView.setModel(new JSONModel({
                colorPalette: ['#EB7300', '#93C939', '#F0AB00', '#960981', '#EB7396', '#E35500', '#4FB81C', '#D29600', '#760A85', '#C87396', '#BC3618', '#247230', '#BE8200', '#45157E', '#A07396'],
                referenceName: MriFrontendConfig.getFrontendConfig().getChartOptions('vb').referenceName
            }), 'settingsModel');
            this.getView().setModel(new sap.ui.model.json.JSONModel(),"_ifrModel");
            this.getView().setModel(new ResourceModel({
                bundleUrl: jQuery.sap.getModulePath("sap.hc.mri.pa.ui") + "/i18n/text.properties"
            }), 'i18n');
            this.getView().setModel(new ResourceModel({
                bundleUrl: jQuery.sap.getModulePath("sap.hc.mri.pa.config") + "/i18n/text.properties"
            }), 'i18n.mri_config');
            this._configErrorMsg=Utils.getText("MRI_PA_CFG_ERROR_DEPENDENT_CDW_CONFIG_NOT_FOUND");

            this.searchTermsModel = new sap.ui.model.json.JSONModel( { terms: [], selectedLocations: [] } );

            this.unsubscribeAllEvents();
            this.eventBus.subscribe(
                'VUE_VB_CHART_UPDATE',
                this.updateChart,
                this);
                this.eventBus.subscribe(
                    'VUE_SET_IFR',
                    this.getIFRValue,
                    this);
            this.eventBus.subscribe(
                'EVENT_VB_SEARCH_CLICK',
                this.handleSearchPopover,
                this);

            this.eventBus.subscribe(
                'SET_VARIANT_FILTER_CARD',
                this.handleVariantFilterCardChange,
                this);

            this.eventBus.subscribe(
                'VUE_VB_CHART_RERENDER',
                this._rerenderChart,
                this);

            this.eventBus.subscribe(
                Utils.events.CHANNEL,
                Utils.events.EVENT_FILTER_ON_GENE,
                this._filterOnGene,
                this
            );
        },

       
        onExit: function () {
            this.unsubscribeAllEvents();
        },
        unsubscribeAllEvents:function(){
            this.eventBus.unsubscribe(
                'VUE_VB_CHART_UPDATE',
                this.updateChart,
                this);

            this.eventBus.unsubscribe(
                'EVENT_VB_SEARCH_CLICK',
                this.handleSearchPopover,
                this);

            this.eventBus.unsubscribe(
                'SET_VARIANT_FILTER_CARD',
                this.handleVariantFilterCardChange,
                this);

            this.eventBus.unsubscribe(
                Utils.events.CHANNEL,
                Utils.events.EVENT_FILTER_ON_GENE,
                this._filterOnGene,
                this
            );

            this.eventBus.unsubscribe(
                'VUE_VB_CHART_RERENDER',
                this._rerenderChart,
                this);
        },
        getIFRValue:function(sChannelId, sEventId, oEventData) {
        },   
        handleGeneticFilterSelect:function(oEvent,sKey) {
            var that = this;
            var oList = oEvent.getSource();
            var sKey = oList.data().sKey;
            if(!sKey){
                sKey='All';
            }
            //call update and pass the selected Key ;
            this._oIFRModel.oData._currentKey= (sKey==='All'?null:sKey);
            this._oIFRModel.oData.instance=sKey;
            this._setMenuValue(oList.getText(),sKey);
            
            that.genomicsView.getController().update();   
        },   
        handleVariantFilterCardChange: function (sChannelId, sEventId, oEventData) {
            if (oEventData) {
                var variantFilterCards = oEventData.variantFilterCards;
                var newFilterCards = [{ key: 'All', text: 'All' }];
                var sKey = this._oMenuKey;
                var sText = null;

                variantFilterCards.forEach(function (element) {
                    var bHasLocationFilter = element.attributes.content.reduce( function ( anyLocationFilter, attribute )
                        {
                            if ( attribute.configPath && ( attribute.configPath === "patient.interactions.ga_mutation.attributes.location" ) && attribute.constraints && attribute.constraints.content && ( attribute.constraints.content.length > 0 ) )
                            {
                                return true;
                            }
                            else
                            {
                                return anyLocationFilter;
                            }
                        },
                        false
                    );
                    if ( bHasLocationFilter )
                    {
                        if ( element.instanceID === sKey )
                        {
                            sText = element.name;
                        }
                        newFilterCards.push({ key: element.instanceID, text: element.name });
                    }
                }, this);
                
                if ( ! sText )
                {
                    sKey = null;
                }

                var aSelectedLocations = variantFilterCards.reduce(
                    function (locations, element) {
                        element.attributes.content
                            .filter( function ( attribute ) { return attribute.configPath && ( attribute.configPath === "patient.interactions.ga_mutation.attributes.location" ); } )
                            .forEach( function ( attribute )
                                {
                                    if ( attribute.constraints && attribute.constraints.content )
                                    {
                                        for ( var termIndex in attribute.constraints.content )
                                        {
                                            if ( attribute.constraints.content.hasOwnProperty( termIndex ) && attribute.constraints.content[ termIndex ].value )
                                            {
                                                locations.push( { text: JSON.parse( attribute.constraints.content[ termIndex ].value ).text } );
                                            }
                                        }
                                    }
                                }
                            );
                        return locations;
                    },
                    []
                );
                this.searchTermsModel.setData($.extend({}, this.searchTermsModel.getData(), { selectedLocations: aSelectedLocations }));
              

                var variantFilterCardModel = new JSONModel({
                    filterCards: newFilterCards
                });
                this.getView().setModel(variantFilterCardModel, "variantFilterCardModel");
                this._addMenuItems();
                this._setMenuValue(sText, sKey);
                 
            }
        },
        updateChart: function (sChannelId, sEventId, oEventData) {
            var that=this;
            if (oEventData && oEventData.data) {
                const bookmark = oEventData.data;
                var ifr = BMv2Parser.convertBM2IFR(bookmark.filter);
                // var aFilterCardNames = ChartableCardsVisitor.getChartableCards(ifr);
                var request = IFR2Request(ifr);
                //set values for dev mode 
               if(!oEventData.geneAlterationCategory){
                    oEventData.geneAlterationCategory=false;
                }
                this.genomicsView.getModel("oDevModel").oData={
                    "geneAlterationCategory":oEventData.geneAlterationCategory,
                    "geneAlterationXAxis":oEventData.geneAlterationXAxis,
                    "geneSummaryXAxis":oEventData.geneSummaryXAxis
                };
                //if dev mode off hide button
                this.getView().byId("btnGenomicsCategory").setVisible(oEventData.geneAlterationCategory);
                
                //call the filter card 
                var fData=oEventData.data.filter;
                if(!this._oMenuKey){
                    fData.instance="All";
                } else{
                    fData.instance=this._oMenuKey;
                        if(this._oMenuKey!=='All'){
                        fData._currentKey=this._oMenuKey;
                    }
                }
                this.genomicsView.getModel("oIFRModel").oData=fData;

                var axes = bookmark.axisSelection;
                var aRequests = request.map(function (oFilter) {
                 
                    var oNewFilter = jQuery.extend({}, oFilter);
                    var oQueryObject;

                    for (var i = 0; i < 3; i += 1) {
                        if (axes[i].attributeId !== 'n/a') {
                            oQueryObject = Utils.getPropertyByPath(oNewFilter, axes[i].attributeId);
                            if (!oQueryObject) {
                                // filter object does not contain current selection: add it to the object
                                oQueryObject = [{}];
                                Utils.createPathInObject(oNewFilter, axes[i].attributeId, oQueryObject);
                            }
                            oQueryObject[0].xaxis = i + 1; // annotate category attribute (with position i+1)
                            oQueryObject[0].binsize = axes[i].binsize;
                        }
                    }

                    var jsonWalk = Utils.getJsonWalkFunction(oNewFilter);
                    var walkResult = jsonWalk(this._sampleInteractionPath);

                    var locationAttributes = jsonWalk("patient.interactions.ga_mutation.*.attributes.location");
                    if(locationAttributes.length){
                        locationAttributes.map(function (o){
                            if(o.hasOwnProperty('obj') && o.obj.length) {
                                o.obj[0].filter = o.obj[0].filter.map(function(f) {
                                    var locationVal = JSON.parse(f.value);
                                    // assuming that location exists in the cache
                                    // TODO: this should be handled at the backend
                                    var geneObj = VariantValidator.validateFromCache(locationVal.text);
                                    return {
                                        and: [
                                            {
                                                op: ">=",
                                                value: geneObj.positionStart
                                            }, {
                                                op: "<=",
                                                value: geneObj.positionEnd
                                            }
                                        ],
                                        tagText: locationVal.text
                                    };
                                });
                            }
                        });
                    }

                    if (walkResult.length === 0) {
                        // create an empty sample "filter card"
                        var sInstancePath = this._sampleInteractionPath.concat(".1");
                        Utils.createPathInObject(oNewFilter, sInstancePath, {
                            attributes: {},
                            isFiltercard: true
                        });
                    }

                    return oNewFilter;
                }, this);
                //category config button 
                if(oEventData.geneAlterationCategory){
                    this.getView().byId("btnGenomicsCategory").setVisible(true);
                }else{
                    this.getView().byId("btnGenomicsCategory").setVisible(false); 
                }


                const that = this;
                this.genomicsView.setBusy(true);
               
                if (this.SessionID) {
                    Utils.ajax({
                        type: 'POST',
                        url: '/sap/hc/hph/genomics/services/',
                        contentType: 'application/json;charset=utf-8',
                        data: JSON.stringify({
                            request: 'mri.SessionSamples.cleanUp',
                            parameters: {
                                sessionId: this.SessionID // send the previous session id for cleaning
                            },
                            directResult: true
                        })
                    }).fail(function (xhr, textStatus) {
                        jQuery.sap.log.error('VariantBrowserChart' + textStatus, xhr.responseText, 'hc.mri.pa');
                    });
                }

                this.setSessionId(this.generateSessionId());
                this._currentRequest = Utils.ajax({
                    type: 'POST',
                    url: '/sap/hc/hph/genomics/services/',
                    contentType: 'application/json;charset=utf-8',
                    data: JSON.stringify({
                        request: 'mri.SessionSamples.createCohorts',
                        parameters: {
                            requestContent: aRequests,
                            sessionId: that.sessionID,
                            configData: {
                                configId: MriFrontendConfig.getFrontendConfig().getPaConfigId(),
                                configVersion: MriFrontendConfig.getFrontendConfig().getPaConfigVersion()
                            }
                        },
                        directResult: true
                    })
                }).done(function () {
                    const parameters = {
                        configData: {
                            configId: MriFrontendConfig.getFrontendConfig().getPaConfigId(),
                            configVersion: MriFrontendConfig.getFrontendConfig().getPaConfigVersion()
                        }
                    };
                    var gController= that.genomicsView.getController();
                    var aKey = [ gController.mVariantConfig, gController.mSampleConfig ];
                    gController.setGeneticFilterCardConfig(fData);
                    gController.setValidationParams(parameters);
                    var oSession = that.genomicsView.getModel("oSessionModel").getData();
                    oSession.validationParams= parameters;
                    oSession.geneticFilterCardConfig=fData;
                    if (!gController.fRenderOnce){
                        AjaxUtils.ajax({
                            url: '/sap/hc/hph/genomics/services/',
                            contentType: 'application/json;charset=utf-8',
                            method: 'POST',
                            data: JSON.stringify({
                                request: "vb.General.getBrowserConfiguration",
                                directResult: false,
                                parameters: {
                                    application: gController.getApplication(),
                                    config: aKey
                                }
                            }),
                        }).done( function( oData ){
                            
                            oSession.variantConfiguration = oData.result;
                            gController.fRenderOnce=true;
                            gController.onIconTabBarSelect(undefined,true);//noChange-true
                            that.genomicsView.setBusy(false);   
                        });    
                    
                }else{
                    that.genomicsView.getController().update();
                    that.genomicsView.setBusy(false);   
                  }
                 //code to enable gene navigation from column
                  /* if(genomicsController._setCallbackGeneLink){
                    genomicsController._setCallbackGeneLink=false;  
                    genomicsController._VBTabObj.goto(genomicsController._callBackGeneValue);
                  }*/
                }).fail(function (xhr, textStatus) {
                    jQuery.sap.log.error('VariantBrowserChart ' + textStatus, xhr.responseText, 'hc.mri.pa');
                    if(xhr.responseText === "MRI_PA_CFG_ERROR_DEPENDENT_CDW_CONFIG_NOT_FOUND"){
                        that.showCDWConfigNoFoundMessage(xhr.responseText);
                    }
                    that.genomicsView.setBusy(false); 
                });
            }
        },
          //show config error 
          showCDWConfigNoFoundMessage:function(sMsg){
            var that=this;
            //using alternative msgKey as Text bundle is unavailable MRI_PA_BOOKMARK_AXIS_NOT_AVAILABLE_UNDER_CURRENT_CONFIG
            var sMsgText=  that.getView().getModel("i18n").getResourceBundle().getText("MRI_PA_BOOKMARK_AXIS_NOT_AVAILABLE_UNDER_CURRENT_CONFIG"); 
            var sError= that.getView().getModel("i18n").getResourceBundle().getText("MRI_PA_CONFIG_ADMIN_ERROR");
            sap.m.MessageBox.show(sMsgText, {
                  icon: sap.m.MessageBox.Icon.WARNING,
                  title: sError,
                  actions: [sap.m.MessageBox.Action.OK] 
                }
            );
          },  



          // SEARCH SECTION
          handleSearchPopover: function (element) {
            
                       var that = this;
                       //create global JSON model for search terms
            
                        if ( ! this._searchPopover )
                        {
                            this._searchPopover = sap.ui.xmlfragment('sap.hc.mri.pa.ui.views.MriVariantBrowserSearch', this);
                            this._searchPopover.setModel(  this.getView().getModel( "i18n.vb" ), "i18n.vb" );
                            this.getView().addDependent(this._searchPopover);
                            this._searchPopover.setInitialFocus( this._searchPopover.getContent()[ 0 ] );
                        }

                        if ( this._searchPopover.isOpen() )
                        {
                            this._searchPopover.close();
                        }
                        else
                        {
                            this._searchPopover.setModel(this.searchTermsModel);
                            this._searchPopover.openBy(document.getElementById("vb-searchPopover"));
                        }

                       Utils.ajax({
                                headers: {
                                    "Accept": "application/json",
                                },
                                type: "POST",
                                url: "/sap/hc/hph/genomics/services/",
                                contentType: "application/json; charset=UTF-8",
                                data: JSON.stringify({
                                    request: "search.searchField.listSearchHistory",
                                    parameters: {}
                                }),
                                dataType: "json",
                                contentType: "application/json"
                            }).done(function(oData) {
                                    // put the data from backend to JSON model
                                    that.searchTermsModel.setData($.extend({}, that.searchTermsModel.getData(), oData.result));
                            }).fail();
                   },
            
                   handleSearch: function (oEvent) {
            
                       var sQuery = oEvent.getParameters().query;
                       if ( ( ! sQuery ) && oEvent.getParameters().listItem )
                       {
                           sQuery = oEvent.getParameters().listItem.getTitle();
                       }
                       this._searchPopover.close();
                       if ( sQuery )
                       {
                           var oTabBar = this.getView().byId( "genomicsComponent" ).getContent()[ 0 ].byId( "idIconTabBarForGenomics" );
                           oTabBar.setSelectedKey( "_VBTab" );
                           if ( ! sap.ui.getCore().byId( "mriVbCohorts" ).goto( sQuery ) )
                           {
                               sap.m.MessageToast.show( 'Could not find "' + sQuery.trim() + '"' );
                           }
                       }
                   },
            
                   liveTermSearch: function(oEvent) { 
                       
                       var searchValue = oEvent.getSource().getValue();
                       var binding = sap.ui.getCore().byId("searchTermsListID").getBinding("items");
                       //"searchTerm" taken from backend service xsjslib
                       var oFilter = new sap.ui.model.Filter("searchTerm", sap.ui.model.FilterOperator.Contains, searchValue);
                       binding.filter( [oFilter] );
                               
                   },
                   // END OF SEARCH SECTION

       setSessionId: function (sNewSessionId) {
            this.sessionID = sNewSessionId;
            this.vbObj=this.genomicsView.getController()._VBTabObj;
            if(this.vbObj){
                const parameters = this.vbObj.getParameters();
                parameters.sessionId = sNewSessionId;
                this.vbObj.setProperty('parameters', parameters, true);
                if(parameters.annotationConfig!== this.genomicsView.getModel("oSessionModel").getData().variantConfiguration){
                    this.genomicsView.getModel("oSessionModel").variantConfiguration = parameters.annotationConfig;
                }
            }  
            
            this.genomicsView.getModel("oSessionModel").getData().SessionId=sNewSessionId;
            this.genomicsView.getController().setSessionId(sNewSessionId);
        },

        generateSessionId: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : r & 0x3 | 0x8;
                return v.toString(16);
            });
        },

        onAfterRendering: function () {
            /*
            var $this = this.getDomRef();
            var that = this;
    
            sap.ui.core.ResizeHandler.register($this, jQuery.proxy(function () {
                // relocate attribute selection buttons after resize
                that._resizeChart();
            }, this));
            */
        },

        _rerenderChart: function () {
            //this.vbObj.rerender();
            this.genomicsView.getController().rerender();
        },

        _filterOnGene: function (sChannelId, sEventId, oParameter) {
            // only add a gene attribute if such an attribute is available in the config
            if (this._variantInteractionPath && this._variantLocationAttribute) {
                sap.ui.getCore().getEventBus().publish(
                    "VUE_ADD_GENETIC_FILTERCARD_WITH_GENE",
                    {
                        geneNames: [oParameter.gene]
                    }
                );
            }
        },
        onAddColumnSelectorPress:function(oEvent,key){
         alert(key);
        },
        _addMenuOpenFunction:function(oButton,oMenu){
            oMenu.open(true, oButton.getFocusDomRef(), sap.ui.core.Popup.Dock.BeginTop, sap.ui.core.Popup.Dock.BeginBottom, oButton);
        },
        _addMenuItems:function(oMenu){
            var that=this;
            if(!oMenu){
                oMenu=that._oMenu;
            }
            var aList=this.getView().getModel("variantFilterCardModel").oData.filterCards;
            oMenu.removeAllItems();
            var oItem;
            for(var i=0;i<aList.length;i++){
                var sListKey=aList[i].key;
                oItem=new MenuItem({
                    text: aList[i].text
                });
                oItem.attachSelect(function(oEvent){
                    that.handleGeneticFilterSelect(oEvent);
                });
                oItem.data("sKey",sListKey);
                oMenu.addItem(oItem); 
                
            }

           // oMenu.open(true, oButton.getFocusDomRef(), sap.ui.core.Popup.Dock.BeginTop, sap.ui.core.Popup.Dock.BeginBottom, oButton);
        },
        _setMenuValue : function(sValue,sKey){
            if(!sValue){
                sValue='All';
            }
            if(this._oMenuButton){
                this._oMenuButton.setText(sValue);//set all as default value
            }
            this._oMenuKey=(!sKey)?sValue:sKey;
        },
        _drawDropDown: function(){
            var that =this;
           if(!this._ddGenomics){
            this._oMenu = new Menu();//,{title:"{i18n>ADD_COLUMNS}"});
            this._oMenu.setModel(this.getView().getModel("variantFilterCardModel"));
            var oMenuItem1 = new MenuItem({text:"{text}"});
            this._oMenu.bindAggregation("items",{path: "{filterCards}", template:oMenuItem1});
            this._oMenu.bindElement("{variantFilterCardModel>filterCards}");
             
            that._addMenuItems(this._oMenu);
           this._oMenuButton = new MenuButton({
             text: "{}",
             tooltip: "{i18n>}",
             press: [function (oEvent) {
                var oButton = oEvent.getSource();
                that._addMenuOpenFunction(oButton,that._oMenu) ;
            }, this]
         });
         this._oMenuButton.addDependent(this._oMenu);
         this._oMenuButton.addStyleClass("sapMriPaAttributeMenuButton");
         this._oMenuButton.addStyleClass("genomicBtnMenu");
         this._oMenuButton.addDependent(this._oMenu);
         this._setMenuValue('All');
         this._ddGenomics=this._oMenuButton;
         var btn1 = that.getView().byId("btnGenomicsCategory");
          btn1.attachPress(function(){
                  var oDialog = sap.ui.xmlview( { viewName: 'sap.hc.hph.genomics.ui.lib.vb.browserConfig.view.BrowserConfig', viewData: that.genomicsView.getController()} );
                 that.getView().addDependent( oDialog );
                 oDialog.getContent()[ 0 ].open();
              }
          );
          btn1.addStyleClass("sapMriPaAttributeMenuButton");
          btn1.addStyleClass("top_btn");
          var oHLayout=this.getView().byId("idGenomicsVL");
          oHLayout.addContent(this._oMenuButton);
          oHLayout.addStyleClass("top_space");
          
        }
    }

    });
});