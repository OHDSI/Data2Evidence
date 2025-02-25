sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    'sap/hc/hph/core/ui/AjaxUtils',
    "sap/ui/core/mvc/Controller",
    "sap/hc/hph/genomics/ui/lib/VariantBrowser",
    "sap/hc/hph/genomics/ui/lib/genetables/geneTable",
    "sap/hc/hph/genomics/ui/lib/genetables/alterationMatrixControl",
    "sap/hc/hph/genomics/ui/lib/genetables/alterationMatrixControlHeader",
    "sap/ui/unified/Menu",
    "sap/ui/unified/MenuItem",
    "sap/hc/mri/pa/ui/lib/MenuButton" 
    
], function (jQuery, Utils,AjaxUtils, Controller,variantBrowser,geneTable,alterationMatrix,alterationMatrixHeader,Menu,MenuItem,MenuButton) {
    "use strict";
    var MriVbController = Controller.extend("sap.hc.mri.pa.ui.views.MriVariantBrowser");
     
    MriVbController.prototype.onInit = function () {
        //Construct the Icon Tab bar filters 
        this.fRenderOnce=false;
        this.oSessionModel = new sap.ui.model.json.JSONModel({"SessionId":''});
        this.oIFRModel = new sap.ui.model.json.JSONModel({});
        this.oDevModel = new sap.ui.model.json.JSONModel({});
        this.getView().setModel(this.oSessionModel,"oSessionModel");
        this.getView().setModel(this.oIFRModel,"oIFRModel");
        this.getView().setModel(this.oDevModel,"oDevModel");
        this.mRequestContent = null;
        this.mRequest = null;
        this.mUpdateFlag = false;
        
        this._oIconTabBar=this.getView().byId("idIconTabBarForGenomics");
        this._oIconTabBar.addStyleClass("classIconTabBarForGenomics");
        this._IconTabInfo={
            "_VBTab":"variant_browser",
            "_GATab":"gene_summary",
            "_AMTab":"gene_alteration",
			"_GCTab":"gene_correlation"
        };
        this.getView().setModel( new sap.ui.model.resource.ResourceModel( {
             bundleUrl: "/sap/hc/hph/genomics/ui/i18n/vb/messagebundle.properties",
             bundleLocale: sap.ui.getCore().getConfiguration().getLanguage()
         } ), "i18n.vb" );
       
         this.mSampleConfig = "sampleConfig";
         this.mVariantConfig = "groupConfig";
         this.mTrackConfig = "trackConfig";
         this.preferredColors = [ '#F34235', '#E91D62', '#9C26AF', '#6739B7', '#3E50B5', '#2095F3', '#02A9F4', '#00BCD4', '#009688', '#4BAF4F', '#8AC349', '#CDDC38', '#FFEB3A',
                                 '#FFC106', '#FF9800', '#FF5721', '#795447', '#9D9D9D', '#607D8B' ];
      };
      
      MriVbController.prototype.setValidationParams=function(parameters){
            if(!parameters){
                parameters= this.getView().getModel("oSessionModel").getData().validationParams;
            }
             if(this._VBTabObj){
                  this._VBTabObj.setProperty("validationParameters", parameters, true);
             }
           if (this._sKey==='_VBTab'){
            this._VBTabObj.setProperty("validationParameters", parameters, true);
            
            }
    };  
    
    MriVbController.prototype.setGeneticFilterCardConfig=function(parameters){
            if(!parameters){
                parameters= this.getView().getModel("oSessionModel").getData().geneticFilterCardConfig;
            }
             if(this._VBTabObj){
                   this._VBTabObj.setProperty("geneticFilterCardConfig", parameters, true);
             }
           if (this._sKey==='_VBTab'){
            this._VBTabObj.setProperty("geneticFilterCardConfig", parameters, true);
            
            }
    };

    MriVbController.prototype.setVariantConfiguration=function(parameters){
        if (this._sKey==='_VBTab'){
            if(!parameters){
                parameters= this.getView().getModel("oSessionModel").getData().variantConfiguration;
            }
            this._VBTabObj.setProperty("variantConfiguration", parameters, true);
            this.getView().getModel("oSessionModel").getData().variantConfiguration = parameters;
            
        }
            else{
                this.getView().getModel("oSessionModel").getData().variantConfiguration = parameters;
                if(this._VBTabObj){
                     this._VBTabObj.setProperty("variantConfiguration", parameters, true);
                }
                
            }
    };    
  
    MriVbController.prototype.getApplication=function(){
        return "sap.hc.mri.pa";
     };  
     
     MriVbController.prototype.getI18nModel=function(){
        return  this.getView().getModel( "i18n.vb" );
     };
     
     MriVbController.prototype.getPreferredColors=function(){
        var preferredColors= this.getView().getModel("oSessionModel").getData().prefferedColors;
         if(!preferredColors){
             preferredColors = this.preferredColors;
         }
         return preferredColors;
       };            
       
       
     MriVbController.prototype.getVariantConfiguration=function(){
           
           var parameters= this.getView().getModel("oSessionModel").getData().variantConfiguration;
           if(!parameters){
               parameters={};
               this.getView().getModel("oSessionModel").getData().variantConfiguration=parameters;
           }
         return parameters;    
       };  
       
            
     MriVbController.prototype.setSessionId=function(sNewSessionId){
           if(!sNewSessionId) {  
                   sNewSessionId = this.getView().getModel("oSessionModel").getData().SessionId;
                   }
           var oControlObj = this[this._sKey+'Obj']; 
            if(oControlObj){
                var parameters = this.getParameters(oControlObj); 
                if (this._sKey==='_VBTab')
				{
                    parameters.sessionId = sNewSessionId;
                }
                if (this._sKey !== '_GCTab') {
                    oControlObj.setProperty("parameters",parameters,true);
                }
            }
       };
       
     MriVbController.prototype.getParameters= function (oControlObj) {
               var oParams = {};
               if(oControlObj){
                    if(this._sKey==='_VBTab'){
                      oParams = this._VBTabObj.getParameters();  
                    }
				   
               if ( this._sKey === '_GCTab' ) {
				   return oParams;
			   }

               $.extend( oParams, oControlObj.getProperty( "parameters" ) );
               
               if( oParams.annotationConfig ){
                   oParams.annotationConfig = undefined;
               }
               var oConfigParams = this.getConfigParameters();
                  if( !$.isEmptyObject( oConfigParams ) ){
                  oParams.annotationConfig = oConfigParams; 
                        }
                   
            }
            return oParams;    
           };

     MriVbController.prototype.getConfigParameters= function(){
            var oConfig = {};
            var that=this;
            //read categories from VB now since UI is off
            
            var oBrowserConfig = this.getVariantConfiguration();
            var fdevMode=this.getView().getModel("oDevModel").oData.geneAlterationCategory;
             if(!fdevMode && this._VBTabObj){//read config from VB when dev mode switched off
                if( !$.isEmptyObject(this._VBTabObj.getVariantConfiguration())){
                oBrowserConfig= this._VBTabObj.getVariantConfiguration();
                that.getView().getModel("oSessionModel").oData.variantConfiguration=this._VBTabObj.getVariantConfiguration();
               }
            }
            var oAnnotation = {};
            
            function retrieveCategories( aCategories ){
                for( var n = 0; n < aCategories.length; n++ ){
                    if( aCategories[ n ].enabled ){
                        var aMappedCategories = {};
                        aMappedCategories.values = aCategories[ n ].values.map( function( d ){ return d.value; } );
                        aMappedCategories.name =  aCategories[ n ].categoryName;
                        oAnnotation.categories.push( aMappedCategories );
                    }
                }
                oConfig[ sConfig ] = oAnnotation;
            }
            
            for( var sConfig in oBrowserConfig ){
                if( oBrowserConfig[ sConfig ][ 0 ] ){
                    switch( sConfig ){
                        case this.mVariantConfig:
                            oAnnotation = { table: oBrowserConfig[ sConfig ][0].table, attribute: oBrowserConfig[ sConfig ][0].attribute, categories: [], binSize: this.mArcBinSize };
                            break;
                            
                        case this.mSampleConfig:
                            oAnnotation = { sampleCategory: oBrowserConfig[ sConfig ][0].sampleCategory, categories: [] };
                            break;
                        default :
                            oAnnotation={};    
                    }
                    retrieveCategories( oBrowserConfig[ sConfig ][0].categories, sConfig );
                }
            }
            return oConfig;
        };
    
     MriVbController.prototype.rerender=function(){
            if (this._sKey==='_VBTab'){
                    this._VBTabObj.rerender();
            }
        };
     MriVbController.prototype.onIconTabBarSelect = function(oEvent,fNoChange){
            var sKey=this._oIconTabBar.getSelectedKey();
            var that=this;
            this._sKey=sKey;
            var oTab= that.getView().byId(sKey);
            var eventBus=sap.ui.getCore().getEventBus();
            if(!fNoChange){//publish event always except when no change 
                //publish an event to indicate tab change 
                eventBus.publish('GENOMICS_TAB_CHANGE', {
                newTab: {"selectedTab": that._IconTabInfo[sKey] }//example "variant_browser"||"gene_summary"||"gene_alteration"
                });
            }    
            //load the content of the tab depending on the key 
           switch(sKey){
               case '_GATab':
                  
                if (oTab.getContent().length===0){
                  var oGA= new geneTable("mriGeneTable",{columnSelector:true});
                   oGA.addStyleClass("matrixTableContainer");
                   oGA.getTable().setNoData(" ");
                   oGA.getTable().setVisibleRowCountMode("Auto");
                   oGA.getTable().setFixedColumnCount(1);    
                   //changes  to enable backend sort for normal Mode ***
                   if(!this._sortedColumnObject){
                        this._sortedColumnObject = {};
                    }
                    this._sortedColumnObject[this._sKey] = {  "column": "gene", "sortType": "ASC" };
                    this._attachSortPropertyOnce_GA = false;
                   //end of Changes ***

                   var oData = that.loadGeneTableData(oGA, ["genetables.GeneSummary.getGeneSummaryData","genetables.GeneSummary.returnFinalResult"],false);
                   //oGA.getTable().attachSort(oGA,this.sortGeneTable,this);
                   this._GATabObj=oGA;

                                      
                   //changes to enable backend sort for normal Mode ***
                   //Sorting shouldnot happen for dev mode
                    var fDevMode = that.getView().getModel("oDevModel").oData.geneAlterationCategory;
                    
                    var aTableParam = ["genetables.GeneSummary.getGeneSummaryData","genetables.GeneSummary.returnFinalResult"];
                    var fTableFeatures = false;
                    var fRemoveTableFilter = true;
                    that.handleTableSortProperty( fDevMode, oGA.getTable(), oGA, aTableParam, that, fTableFeatures, fRemoveTableFilter);
                    //end of Changes ***
                    
                    //load data and initialize table 
                    oTab.addContent(oGA);
                }
                break;
               case '_VBTab': 
                    if (oTab.getContent().length===0){
                        //add a new instance of the control 
                        var oParameters ={reference:this.getView().getModel("settingsModel").getData().referenceName,
                        dataset:'session:*'} ;
                        var fEnableSettings = !(that.getView().getModel("oDevModel").oData.geneAlterationCategory);
                        var oVB = new variantBrowser("mriVbCohorts",{ 
                            preRequestPlugin:"mri.SessionSamples.prepareCohorts",
                            validationPlugin:"mri.SessionSamples",
                            enableSettings:fEnableSettings,
                            parameters: oParameters,
                            karyotype:"male",
                            autoResize:false,
                            application:"sap.hc.mri.pa",
                            error: [ this.handleError, this ]
                        });
                        that._VBTabObj=oVB;
                        this.setSessionId();
                        this.setValidationParams();
                        this.setVariantConfiguration();
                        oTab.addContent(oVB);
                    }
                    if (!this._VBTabObj){
                        this._VBTabObj= sap.ui.getCore().byId("mriVbCohorts");
                    }
                    //set gene navigate callback 
                    if (that._setCallbackGeneLink){
                        this._VBTabObj._setCallbackGeneLink=true;
                        that._VBTabObj._callBackGeneValue=that._callBackGeneValue;
                    }
                   break;
            case "_AMTab" :
                if (oTab.getContent().length===0){
                 var oAM= new geneTable("mriAMatrixTable",{"columnSelector":false});
                 oAM._autoResize=false;
                 this._AMTabObj=oAM;

                //changes to enable backend sort for normal Mode ***
                if(!this._sortedColumnObject){
                    this._sortedColumnObject = {};
                }
                this._sortedColumnObject[this._sKey] = {  "column": "geneName", "sortType": "ASC" };
                this._attachSortPropertyOnce_AM = false;
                //end of Changes ***

                 var oData = that.loadGeneTableData(oAM, ["genetables.GeneAlteration.getAlterationMatrixData","genetables.GeneAlteration.returnFinalResult"],false,that.addAMTableFeatures);
                
                 //changes to enable backend sort for normal Mode ***
                 //Sorting shouldnot happen for dev mode
                 var fDevMode = that.getView().getModel("oDevModel").oData.geneAlterationCategory;                 
                
                 var aTableParam = ["genetables.GeneAlteration.getAlterationMatrixData","genetables.GeneAlteration.returnFinalResult"];
                 var fTableFeatures = true;
                 var fRemoveTableFilter = true;
                 that.handleTableSortProperty( fDevMode, oAM.getTable(), oAM, aTableParam, that, fTableFeatures, fRemoveTableFilter);
                 //end of changes ***

                oTab.addContent(oAM); 
                var chart = that.byId('tableMatrix');
                 }	
                break;
			   case "_GCTab":
				   this._GCTabObj = {};
				   var geneCorrelationContr = this.getView().byId("geneCorrelationView").getController();
                   this.setSessionId();
            	   this.setGeneticFilterCardConfig();
				   var tmp_oData = this.getView().getModel("oSessionModel").getData();
				   geneCorrelationContr.handleLoad(tmp_oData, this.getView().getModel("settingsModel").getData().referenceName);
				   break;
             default : 
             this._oIconTabBar.setSelectedKey('_GATab');
             this.onIconTabBarSelect();

           } 
         };
        

     MriVbController.prototype.handleTableSortProperty = function(fDevMode, oTable, oControl, aTableParam, that, fTableFeatures,fRemoveTableFilter) {
        if(fDevMode){
            // hide the sortable menu
            oTable.addDelegate({ 
               onAfterRendering: function() {
                   var cols = oTable.getColumns();   
                   if( cols.length > 0 && !that._attachSortPropertyOnce_AM ){
                       that._attachSortPropertyOnce_AM = true;
                       for(var i=0;i<cols.length;i++){
                           cols[i].getMenu().setVisible(false);
                       }
                   }                  
               }
           });
        } else {
           //enable backend sorting
           that._backendSort = true;
            oTable.addDelegate({ 
               onAfterRendering: function() {
                   var cols = oTable.getColumns(); 
                   // if( cols.length > 0 && !that._attachSortPropertyOnce_AM ){
                       
                       for(var i=0;i<cols.length;i++){
                           
                            //remove filter
                            if(fRemoveTableFilter){
                                cols[i].setShowFilterMenuEntry(false);
                            }
                        
                            //on sort selection fire backend, bring new data
                            cols[i].getMenu().attachItemSelect( function(oEvent){                                
                                if(that._backendSort === true){
                                   var oSource = oEvent.getSource();
                                   var sourceCol = oSource.getParent().getSortProperty();
                                   
                                   var strAD = "";
                                   if( oEvent.getParameter("item").getId().toUpperCase().indexOf("ASC") >= 0 ){
                                       strAD =  "ASC";
                                   } else if( oEvent.getParameter("item").getId().toUpperCase().indexOf("DESC") >= 0 ) {
                                       strAD = "DESC";
                                   }
                                   that._sortedColumn = sourceCol;
                                   that._sortedType = strAD;         
                                   
                                   that._sortedColumnObject[that._sKey] = {  "column": sourceCol, "sortType": strAD };
                                   if(fTableFeatures){
                                        that.loadGeneTableData(oControl, aTableParam ,false,that.addAMTableFeatures);
                                   } else {
                                        that.loadGeneTableData(oControl, aTableParam ,false);
                                   }
                                   
                               }                                    
                           });
                       }                                                       
               }
           });
        }
     };

     MriVbController.prototype.update = function (fRenderFirst) { //load with variant config
            var that= this;
            this.setSessionId();
            this.setValidationParams();
            this.setGeneticFilterCardConfig();
            var eventBus=sap.ui.getCore().getEventBus();
            var oControlObj = this[this._sKey+'Obj'];
            if(this.getView().getModel("oSessionModel").oData.SessionId && oControlObj){           
              switch (this._sKey){
                  case '_VBTab' :
                       //publish an event to indicate tab change 
                   eventBus.publish('VUE_TOGGLE_DISPLAY_TOTAL_GUARDED_PATIENT_COUNT', {
                    isDisplay: false
                    });
                  that._VBTabObj.update(true);    
                  break;
                  case '_AMTab':
                    eventBus.publish('VUE_TOGGLE_DISPLAY_TOTAL_GUARDED_PATIENT_COUNT', {
                    isDisplay: true
                    }); 
                   that.loadGeneTableData(that._AMTabObj, ["genetables.GeneAlteration.getAlterationMatrixData","genetables.GeneAlteration.returnFinalResult"],false,that.addAMTableFeatures);
                  break; 
                  case '_GATab':
                    eventBus.publish('VUE_TOGGLE_DISPLAY_TOTAL_GUARDED_PATIENT_COUNT', {
                        isDisplay: false
                        }); 
                    that.loadGeneTableData(that._GATabObj,["genetables.GeneSummary.getGeneSummaryData","genetables.GeneSummary.returnFinalResult"],false);     
                    break;  
				   case '_GCTab':
					   var geneCorrelationContr = that.getView().byId("geneCorrelationView").getController();
					   var tmp_oData = this.getView().getModel("oSessionModel").getData();
					   geneCorrelationContr.handleLoad(tmp_oData, this.getView().getModel("settingsModel").getData().referenceName);
					  break;
                  default: 
                  that.loadGeneTableData(that._GATabObj,["genetables.GeneSummary.getGeneSummaryData","genetables.GeneSummary.returnFinalResult"],false);      
                }
            }     
        };
    
    
     MriVbController.prototype.addAMTableFeatures=function(oGenetable,oData,oController){
        var that=oController;
        //set default settings
        var oMutationSettings={ "SNV": {
            "0":{ 
            "priority": 0,
            "shape": "square",
            "color": "rgb(0,176,235)",
            "name":"Default category"
              }
            }
        };
        var color ="rgb(0,176,235)";
        var oBtn= new sap.m.Button({icon:"sap-icon://color-fill",text:"Default"});
        var cssClass= color.replace(/[\(\)]/g, "");
        cssClass = cssClass.replace(/,/g,"_");
        oBtn.addStyleClass(cssClass);
        var aMutObj=[];


        oGenetable.getTable().setFixedColumnCount(2);  
        oGenetable.getTable().addStyleClass("alterationTable");  
        oGenetable.addStyleClass("matrixTableContainer");
        oGenetable.getTable().setVisibleRowCountMode("Auto");
        var aCategories=that.getVariantConfiguration();
        var oOverflowBar= new sap.m.OverflowToolbar();
        oOverflowBar.addContent(new sap.m.ToolbarSpacer());
        //add mutationSettings
        var oCatObj,oMutObj,oGrpObj,oMutObj={"SNV":{}};
        if(aCategories && aCategories.groupConfig ){
            if($.isArray(aCategories.groupConfig)){
                oGrpObj=aCategories.groupConfig[0];
            }else{
                oGrpObj = aCategories.groupConfig;
            }
            var sAttributeType = oGrpObj.attribute;
                
            for(var i = 0;i< oGrpObj.categories.length;i++){
                oCatObj=oGrpObj.categories[i]; 
                if(oCatObj.enabled){
                    aMutObj.push({
                        "priority": 0,
                        "shape": "square",
                        "color": oCatObj.color,
                        "name":oCatObj.categoryName
                    });
                
                oBtn= new sap.m.Button({icon:"sap-icon://color-fill",text:oCatObj.categoryName});
                cssClass= oCatObj.color.replace(/[\(\)]/g, "");
                cssClass = cssClass.replace(/,/g,"_");
                cssClass = cssClass.replace(/ /g,"");
                oBtn.addStyleClass(cssClass);
                $("#"+oBtn.getId()).find("span").css("color", oCatObj.color);
                oOverflowBar.addContent(oBtn);
                }
            }
       
        }
    if(aMutObj.length===0){//default case is true
        oOverflowBar.addContent(oBtn);
      }else{
        oMutObj.SNV = $.extend({}, aMutObj);
        oMutationSettings = JSON.parse(JSON.stringify(oMutObj));  
      }
  that._altMatrix.setMutationSettings(oMutationSettings);
  oGenetable.getTable().setFooter(oOverflowBar);
  oGenetable.getTable().autoResizeColumn(2);
};

MriVbController.prototype.returnAlterationMatrixTemplate = function (oColumnData,oController){ //columnData
   var that = this;
    var altMatrix = new alterationMatrix("oAltMatrixControl",{
     matrixData:"{variants}",
     controlMetadata:that._dataSet.cohorts
    });
  //<controls:alterationMatrixControl xmlns="sap.m" matrixData="{mutations}" controlMetadata="{metadata}"> </controls:alterationMatrixControl>
  that._altMatrix= altMatrix;
  return altMatrix; 
};

MriVbController.prototype.returnColumnHeaderAlterationMatrix = function (columnData,oColumn){ //columnData
    var that =this;
    var oLabel=new sap.m.Label({text:that.getI18nModel().getResourceBundle().getText(columnData.display_name)});
    oColumn.addMultiLabel(oLabel);
    oColumn.addMultiLabel(new alterationMatrixHeader({
      height:"80px",
      groupAttr:"name",
      showSample:false,
      showGroup:true,
      matrixData:"{/cohorts}"
   }) );
    oColumn.addMultiLabel(new alterationMatrixHeader({
      height:"100px", 
      sampleAttr:"patient.id",
      showSample:true,
      showGroup:false,
      matrixData:"{/cohorts}"
  }) );
    
return oLabel;
  
};

MriVbController.prototype.handleGeneLinkPress = function (oEvent) {
    var that= this;
    var sGeneName=oEvent.getSource().getText();
    that._oIconTabBar.setSelectedKey("_VBTab");
    that._setCallbackGeneLink=true;
    that._callBackGeneValue=sGeneName;
    that.onIconTabBarSelect();
   
  
};
     
MriVbController.prototype.constructGeneTableData = function (metadata,oGeneTable) {
    var that = this;
    var aVisibleCols = metadata.visibleColumns;
    var oTable = oGeneTable.getTable();
    if(oTable.getColumns().length > 1){
        oTable.destroyColumns();
    }
    var oColumn,oLabel;
    for (var i =0;i< aVisibleCols.length;i++){
       oColumn =  new sap.ui.table.Column(
       aVisibleCols[i].prop);
       
       var oLabelText= that.getI18nModel().getResourceBundle().getText(aVisibleCols[i].display_name); 
        if(aVisibleCols[i].hasOwnProperty("label")){
           oLabel =  oGeneTable.getLabel(aVisibleCols[i],oColumn,that);
            
        }else{
            if(aVisibleCols[i].prefix && aVisibleCols[i].prefix!==""){
               oLabelText=aVisibleCols[i].prefix+"."+oLabelText;
            }
           oLabel = new sap.m.Label({text: oLabelText});     
           oColumn.setLabel(oLabel);    
            
        }

        var tooltip = (aVisibleCols[i].hasOwnProperty("title"))?(oLabelText + "-"+ that.getI18nModel().getResourceBundle().getText(aVisibleCols[i].title)):oLabelText;
        if(oLabel){oLabel.setTooltip(tooltip);}
        oColumn.setTemplate(oGeneTable.getTemplate(aVisibleCols[i],that));    
       
      oTable.addColumn(oColumn);
    } 
   oGeneTable._autoResize=false; 
};


MriVbController.prototype.getDataFromRequest = function (oData,sLevel){
 
 switch(sLevel){
     case 1: oData = oData[1].result;
      break;
     case 2 :oData = oData[2].result;
     break;
     case 1.5 : oData = oData[0].result;
      break ;
     default : oData = oData; 
 }
 this._dataSet=oData;
 return oData;
};

MriVbController.prototype.loadGeneTableData = function (oGeneTable,sPath,fUpdateFlag,fCallback) {
   var that =this;
   var oThis =this;
   var sLevel=1;
   var sReference=that.getView().getModel("settingsModel").oData.referenceName;
   var sSessionId = this.getView().getModel("oSessionModel").oData.SessionId;
   var oIFRData=this.getView().getModel("oIFRModel").oData;
   var validationParams=this.getView().getModel("oSessionModel").oData.validationParams;
   oGeneTable.getTable().setNoData(" ");
   var eventBus=sap.ui.getCore().getEventBus();
   var oParameters = {
        "tab" : that._skey, 
        "dataset" : "session:*",
        "sessionId" : sSessionId,
        "reference" : sReference, 
        "sort": that._sortedColumnObject[that._sKey]
     };
   //only add category data when dev mode is on  
    $.extend( oParameters,oGeneTable.getParameters());//add category config values
   
   
   
    var data ={	"initRequests" : [{
            "name": "mri.SessionSamples.prepareCohorts",
            "parameters": {"sessionId" : sSessionId},
            "suppressResult": true,
            "exceptionsFatal": true
        }],
            "validationPlugin" : "mri.SessionSamples",
            "validationParameters" :validationParams,//{"configData":{"configId":"PatientAnalyticsInitialCI","configVersion":"A"}},
            "parameters": oParameters,
            "sessionId":sSessionId,
            "requests":[]
    };

    var oTrackParams;
    if(oIFRData.instance&&oIFRData.instance!=='All')
    {
        oTrackParams= { "filterCardQuery" :oIFRData };   
        $.extend( oTrackParams,oParameters);
    }else{
        oTrackParams = oParameters;
    }   

   sLevel=1.5;   
   var oGroupData = {"groupsRequest" : "vb.TrackGroups.getSessionGroups",
   "groupsParameters" : oParameters,
   "trackRequest": sPath[0],
   "trackParameters":oTrackParams,
   "maxCount":2,
   "mergeGroup":true,
   "mergeGroupPlugin":sPath[1]
   };
    var oParams = $.extend({}, oParameters,oGroupData);
    data.requests.push({  "name" : "vb.TrackGroups.load",
       "parameters" :   oParams});
    oGeneTable.setBusy(true);
    if ( this.mRequest )
    {
        this.mRequest.abort();
    }
    this.mRequestContent = JSON.stringify( data );
    this.mUpdateFlag = this.mUpdateFlag && fUpdateFlag;
    this.mRequest = AjaxUtils.ajax({
               url: '/sap/hc/hph/genomics/services/',
               method: 'POST',
               cache: false,
               contentType: 'application/json; charset=UTF-8',
               data: this.mRequestContent,
               dataType: 'json',
               delay: 500
           }).done(function (oData) {
               if ( that.mRequestContent === this.data )
               {
                   that.mRequestContent = null;
                   that.mRequest = null;
               }
               else
               {
                   return;
               }
              oData=that.getDataFromRequest(oData,sLevel);
               if ( ( ! oData ) || oData.message )
               {
                   var sErrorCode = "error.NoData";
                   if ( oData && oData.message )
                   {
                       sErrorCode = oData.message;
                   }
                   var sMessage = that.getView().getModel( "i18n.vb" ).getResourceBundle().getText( sErrorCode );
                   if ( sMessage === sErrorCode )
                   {
                       sMessage = that.getView().getModel("i18n.vb").getResourceBundle().getText( "error.Unknown" );
                       console.error( sMessage + ": " + sErrorCode );
                   }
                   oGeneTable.getTable().setNoData( sMessage );
                   oGeneTable.getTableModel().setData( {} );
                   oGeneTable.getTable().destroyColumns();
                   oGeneTable.setBusy( false );
               } else {
                   if(!that.mUpdateFlag){
                       that.constructGeneTableData(oData.metadata,oGeneTable);
                       that.mUpdateFlag = true;
                   }
                   if(that._sKey==='_AMTab'){
                    var iGuardedPatientCount= 0;
                      if(oData.hasOwnProperty("guardedPatients") && !(isNaN(oData.guardedPatients))) {
                        iGuardedPatientCount=oData.guardedPatients;
                       }
                    //publish an event to indicate the count for alt matrix tab 
                     eventBus.publish('VUE_GENOMICS_COUNT', {
                     currentPatientCount: iGuardedPatientCount
                       });
                      }  
                    
                    // Enable alteration matrix control features
                    if(fCallback) {
                        fCallback(oGeneTable, oData, that);
                    }

                   oGeneTable.getTableModel().setData(oData);
                   oGeneTable.getTable().addDelegate({ 
                   onAfterRendering: function() {
                   if(oGeneTable.hasOwnProperty("_autoResize") && !oGeneTable._autoResize){
                       var cols = oGeneTable.getTable().getColumns(); 
                        for(var i=0;i<cols.length;i++){ 
                           oGeneTable.getTable().autoResizeColumn(i);
                           oGeneTable._autoResize = true;
                                   }
                               }    
                           }
                       });
                    var cols = oGeneTable.getTable().getColumns(); 
                        for(var i=0;i<cols.length;i++){ 
                           oGeneTable.getTable().autoResizeColumn(i);
                           //oGeneTable._autoResize = true;
                                   }
                   if(fCallback){
                        fCallback(oGeneTable,oData,that);
                        oGeneTable.setBusy(false);

                        // Enable horizontal scroll bar after rendering Gene Alteration Matrix table
                        var width = (15 * oData.guardedPatients) + 20;
                        // var table = sap.ui.getCore().byId('mriAMatrixTable').getTable();
                        var table = oGeneTable.getTable();
                        table.getColumns()[0].setWidth("100px");
                        table.getColumns()[1].setWidth("200px");
                        var parentWidth = table.getParent().$().width() - 340;
                        
                        if(parentWidth < width) {    
                            table.getColumns()[2].setWidth(width+"px");
                        } else {
                            table.getColumns()[2].setWidth(parentWidth+"px");
                        }

                       }else{
                   oGeneTable.setBusy(false);
                   }
                   oGeneTable.getTable().bindRows("/"+oData.metadata.dataLabel);
           
                   return oData;
                   
               }
           
           }).fail(function(oResponse, sReason) {
               if ( that.mRequestContent === this.data )
               {
                   that.mRequestContent = null;
                   that.mRequest = null;
               }
               else
               {
                   return;
               }

               if ( sReason !== "abort" )
               {
                   var oError = {
                       errorCode: "error.HTTP",
                       parameters: [ oResponse.status, oResponse.statusText ],
                       message: oResponse.responseText 
                   };
                   var sMessage = that.getView().getModel( "i18n.vb" ).getResourceBundle().getText( oError.errorCode, oError.parameters );
                   if ( sMessage === oError.errorCode )
                   {
                       sMessage = that.getView().getModel("i18n.vb").getResourceBundle().getText( "error.Unknown" );
                       console.error( sMessage + ": " + oError.message );
                   }
                   oGeneTable.getTable().setNoData( sMessage );
                   oGeneTable.getTableModel().setData( {} );
                   oGeneTable.setBusy( false );
               }
           });
};

        /**
     * Handler for VariantBrowser Error.
     * We catch the event to prevent the VariantBrowser from opening a MessageBox.
     * @param {sap.ui.base.Event} oEvent VariantBrowser error event
     */
    MriVbController.prototype.handleError = function (oEvent) {
        oEvent.preventDefault();
        jQuery.sap.log.error("VariantBrowser Error", oEvent.getParameter("message"), "hc.mri.pa");
    };

    /**
     * Handler for GeneFilter event.
     * Catch the select event and send a MRI event with the name of the gene.
     * @param {sap.ui.base.Event} oEvent The ButtonDetailsTrack "press" event
     */
    MriVbController.prototype.onGeneFilter = function (oEvent) {
        var genename = oEvent.getParameter("payload");
        sap.ui.getCore().getEventBus().publish(Utils.events.CHANNEL, Utils.events.EVENT_FILTER_ON_GENE,
            {gene: genename});
    };

    /**
     * Handler for AlleleFilter event.
     * Catch the select event and send a MRI event with the correctly formatted position filter.
     * @param {sap.ui.base.Event} oEvent The ButtonDetailsTrack "press" event
     */
    MriVbController.prototype.onAlleleFilter = function (oEvent) {
        var position = oEvent.getParameter("payload");
        sap.ui.getCore().getEventBus().publish(Utils.events.CHANNEL, Utils.events.EVENT_FILTER_ON_GENE,
            {gene: position});
    };

    /**
     * Encode the string for inclusion into an URL parameter
     * @param {String} sParam The string to be used as parameter
     * @returns {String} The URL encoded parameter
     */
    MriVbController.prototype.encodeUrlParameter = function (sParam) {
        if (sParam) {
            return jQuery.sap.encodeURL(sParam);
        }
        return "";
    };
});