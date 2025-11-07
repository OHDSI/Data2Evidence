sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control",
    "sap/ui/core/ListItem",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Panel",
    "sap/m/Toolbar",
    "sap/m/ToolbarSpacer",
    "sap/m/Text",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/List",
    "sap/m/CustomListItem",
    "sap/ui/core/Icon",
    "sap/m/Popover",
    "sap/ui/commons/DropdownBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/hc/mri/pa/ui/Utils",
    "./HelpText"
], function (jQuery, Control, Item, VBox, HBox, Panel, Toolbar, ToolbarSpacer, Text, Input, Button, List, CustomListItem, Icon, Popover, Select, JSONModel, Filter, Utils, HelpText) {

    var AdvancedTimeFilter = Control.extend("sap.hc.mri.pa.ui.lib.AdvancedTimeFilter", {
        metadata: {
            properties: {
                filterCardId: { type: "string"},
                filterCardName: { type: "string"},
                timeFilterTitle: {type: "string"}
            },
            aggregations: {
                controlBox: { type: "sap.m.VBox", multiple: false, visibility: "hidden" }
            },
            events: {
                filterCleared: {},
                changeEvent: {}
            }
        },
        renderer: function (oRenderManager, oControl) {
            oRenderManager.write("<div style='width:100%'");
            oRenderManager.writeControlData(oControl);
            oRenderManager.writeClasses(oControl);
            oRenderManager.write(">");
            oRenderManager.renderControl(oControl.getAggregation("controlBox"));
            oRenderManager.write("</div>");
        },
        init: function () {

            var that = this;
            this._controlBox = new VBox();
            this._controlBox.addStyleClass("sapUiSizeCompact");
            
            this.timeFilterPanel = new Panel({expandable:true, expanded:true});
            this.timeFilterPanel.addStyleClass("sapMriPaTimeFilterPanel");
            this.timeFilterToolbar = new Toolbar({
                active:true,
                press:function(){
                    that.timeFilterPanel.setExpanded(!that.timeFilterPanel.getExpanded());
                }
            });
            
             this.timeFilterToolbarTitle = new Text({
                 maxLines: 1
             });
            /*
            this.timeFilterToolbarTitle = new Text().bindText({
                path: "timeFilterModel>/timeFilters/length",
                formatter: function(value){
                     return that.getFilterCardName() + " > " + value;
                }
            });
            */
            
            this.timeFilterToolbarTitle.getTooltip = function() {
                return that.getProperty("timeFilterTitle");
            };
            
            //_titleFormatter
            this.timeFilterToolbarButton = new Button({
                type:"Transparent", 
                icon:"sap-icon://add",
                press:function(){
                    that.addTimeFilter();
                } 
            }).addStyleClass("sapMriPaTimeFilterToolbarButton");
            
            this.timeFilterToolbar.addContent(this.timeFilterToolbarTitle);
            this.timeFilterToolbar.addContent(new ToolbarSpacer());
            this.timeFilterToolbar.addContent(this.timeFilterToolbarButton);
            
            this.timeFilterPanel.setHeaderToolbar(this.timeFilterToolbar);
            
            //var targetInteractionilter = new Filter("key", sap.ui.model.FilterOperator.NE, that.getFilterCardId());
            //targetInteractionilter.fnTest = function (value) {
            //    return value.toUpperCase() !== that.getFilterCardId().toUpperCase();
            //};
            
            var targetInteractionilter = new Filter({
                path: "key",
                test: function (value) {
                    return value.toUpperCase() !== that.getFilterCardId().toUpperCase();
                }
            });
            
            this.timeFilterList = new List().bindItems({
                path:"timeFilterModel>/timeFilters",
                factory: function(sId, oContext){
                    var customItemList = new CustomListItem(sId);
                    customItemList.setBindingContext("timeFilterModel",oContext.getPath());
                    
                    var verticalLayout = new VBox().addStyleClass("sapMriPaTimeFilterListVBox");
                    var horizontalLayout1 = new HBox().addStyleClass("sapMriPaTimeFilterListHBoxFirst");
                    var targetInteraction;
                    var originSelection = new Select().addStyleClass("sapMriPaConstraint").addStyleClass("sapMriPaTimeFilterSelect");
                    originSelection.addItem(new Item({key:"start", text:"{i18n>MRI_PA_TEMPORAL_FILTER_START}"}));
                    originSelection.addItem(new Item({key:"end", text:"{i18n>MRI_PA_TEMPORAL_FILTER_END}"}));
                    originSelection.addItem(new Item({key:"overlap", text:"{i18n>MRI_PA_TEMPORAL_FILTER_OVERLAP}"}));
                    originSelection.bindProperty("selectedKey","timeFilterModel>originSelection");
                    var days = new Input({
                        width: "5rem",
                        visible: "{= ${timeFilterModel>originSelection} !== 'overlap'}"
                    });
                    days.bindValue("timeFilterModel>days");
                    
                    if(oContext.getObject() && !that._validateText(oContext.getObject().days)){
                        days.addStyleClass("invalidFormat"); 
                    }
                    
                    days.attachChange(function(){
                        var valu = days.getValue();
                        if(targetInteraction && targetInteraction.getSelectedKey && targetInteraction.getSelectedKey()){
                            that.fireChangeEvent();    
                        }
                    });
                    
                    days.attachLiveChange(function(){
                        var valu = days.getValue();
                        if(that._validateText(valu)) {
                            days.removeStyleClass("invalidFormat");                            
                        } else {
                            days.addStyleClass("invalidFormat"); 
                        }
                    });
                    
                    var daysText = new Text({
                        text:"{i18n>MRI_PA_TEMPORAL_FILTER_DAYS}",
                        visible: "{= ${timeFilterModel>originSelection} !== 'overlap'}"
                    });
                    
                    var popOver;
                    var icon = new Icon({
                        src: "sap-icon://sys-help",
                        visible: "{= ${timeFilterModel>originSelection} !== 'overlap'}",
                        press: function () {
                            popOver.openBy(icon);
                        }
                    });                                        
                    
                    var popOverContent = new HelpText({
                        firstline: Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_VALUE"),
                        list: [
                            Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_GT_LT", ["&gt;", "&lt;"]),
                            Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_GEQ_LEQ", ["&gt;=", "&lt;="]),
                            Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_INTERVAL", ["[x-y]", "]x-y["])
                        ],
                        stringsToHighlight: ["&gt;=", "&lt;=", "&gt;", "&lt;", "[", "]", "-"]
                    });
                    
                    popOver = new Popover({
                        placement: sap.m.PlacementType.Top,
                        title: Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_HEADER"),
                        content: [popOverContent],
                        beforeOpen: function(){
                            icon.addStyleClass("sapMriPaHelpIconActive");
                        },
                        afterClose: function(){
                           icon.removeStyleClass("sapMriPaHelpIconActive");
                        }
                    });
                    popOver.addStyleClass(Utils.getContentDensityClass());
                    
                    icon.addStyleClass("sapMriPaHelpIcon");
                    icon.addStyleClass("sapMriPaHidden");
                    
                    customItemList.addEventDelegate({
                        onmouseover: function () {
                            icon.removeStyleClass("sapMriPaHidden");
                        },
                        onmouseout: function () {
                            icon.addStyleClass("sapMriPaHidden");
                        }
                    });
                    
                   
                    var horizontalLayout2 = new HBox().addStyleClass("sapMriPaTimeFilterListHBox");
                    var targetSelection = new Select({
                        selectedKey: "{timeFilterModel>targetSelection}",
                        visible: "{= ${timeFilterModel>originSelection} !== 'overlap'}"
                    }).addStyleClass("sapMriPaTimeFilterSelect");
                    targetSelection.addItem(new Item({key:"before_start", text:"{i18n>MRI_PA_TEMPORAL_FILTER_BEFORE_START}"}));
                    targetSelection.addItem(new Item({key:"after_start", text:"{i18n>MRI_PA_TEMPORAL_FILTER_AFTER_START}"}));
                    targetSelection.addItem(new Item({key:"before_end", text:"{i18n>MRI_PA_TEMPORAL_FILTER_BEFORE_END}"}));
                    targetSelection.addItem(new Item({key:"after_end", text:"{i18n>MRI_PA_TEMPORAL_FILTER_AFTER_END}"}));
                    //targetSelection.bindProperty("selectedKey","timeFilterModel>targetSelection");
                    
                    targetSelection.attachChange(function(){
                        if(targetInteraction && targetInteraction.getSelectedKey && targetInteraction.getSelectedKey()){
                            that.fireChangeEvent();    
                        }
                    });
                    var ofText = new Text({
                        text:"{i18n>MRI_PA_TEMPORAL_FILTER_OF}",
                        visible: "{= ${timeFilterModel>originSelection} !== 'overlap'}"
                    });
                    
                    var horizontalLayout3 = new HBox().addStyleClass("sapMriPaTimeFilterListHBox");
                    targetInteraction = new Select().addStyleClass("sapMriPaTimeFilterSelect");
                    targetInteraction.bindItems({
                        path:"/items",
                        filters: [targetInteractionilter],
                        factory: function(){
                        return new Item({
                            key: "{key}",
                            text: "{text}"
                        });
                    }});
                    targetInteraction.bindProperty("selectedKey","timeFilterModel>targetInteraction");
                    targetInteraction.attachChange(function(){
                        that.fireChangeEvent();
                    });
                    
                    
                    var deleteButton = new Button({
                       icon: "sap-icon://delete",
                       text: "{i18n>MRI_PA_TEMPORAL_FILTER_REMOVE}",
                       press: function(){
                           that.deleteTimeFilter(oContext.getPath());
                       },
                       visible: "{= ${timeFilterModel>/timeFilters/length} > 1}"
                    }).addStyleClass("sapMriPaTimeFilterItemButton");
                    
                    originSelection.attachChange(function(){
                        if(targetInteraction && targetInteraction.getSelectedKey && targetInteraction.getSelectedKey()){
                            that.fireChangeEvent();    
                        }
                    });
                    
                    horizontalLayout1.addItem(originSelection);
                    horizontalLayout1.addItem(days);
                    horizontalLayout1.addItem(daysText);
                    horizontalLayout1.addItem(icon);
                    verticalLayout.addItem(horizontalLayout1);
                    
                    horizontalLayout2.addItem(targetSelection);
                    horizontalLayout2.addItem(ofText);
                    verticalLayout.addItem(horizontalLayout2);
                    
                    horizontalLayout3.addItem(targetInteraction);
                    verticalLayout.addItem(horizontalLayout3);
                    
                    verticalLayout.addItem(deleteButton);
                    
                    customItemList.addContent(verticalLayout);
                    return customItemList;
                }
            }).addStyleClass("sapMriPaTimeFilterList");
            
            this.timeFilterPanel.addContent(this.timeFilterList);
            this._controlBox.addItem(this.timeFilterPanel);

            this.setAggregation("controlBox", this._controlBox);
        },
        
        addTimeFilter: function() {
            var timeFilterData = this.getModel("timeFilterModel").getData();
            timeFilterData.timeFilters.push({
                originSelection: "start",
                targetSelection: "before_start",
                targetInteraction: "",
                days:""
            });
            this.getModel("timeFilterModel").setData(timeFilterData);
            this._updateTitleBinding(timeFilterData.timeFilters.length);
        },
        
        deleteTimeFilter: function(sPath) {
            var timeFilterData = this.getModel("timeFilterModel").getData();
            var param = sPath.split("/");
            var deleteIndex = param[param.length-1];
            var removedItem;
            if(deleteIndex || deleteIndex === 0){
                removedItem = timeFilterData.timeFilters.splice(deleteIndex,1);
            }
            this.getModel("timeFilterModel").setData(timeFilterData);
            this._updateTitleBinding(timeFilterData.timeFilters.length);
            if(removedItem && removedItem[0] && removedItem[0].targetInteraction){
                this.fireChangeEvent();
            }
        },
        
        clearAllTimeFilter: function() {
            var timeFilterData = this.getModel("timeFilterModel").getData().timeFilters;
            var activeFilter = false;
            for(var i=0;i<timeFilterData.length;i++){
                if(timeFilterData[i] && timeFilterData[i].targetInteraction){
                    activeFilter = true;
                }
            }
            
            this.getModel("timeFilterModel").setData({
                timeFilters: []
            });
            
            if(activeFilter){
                this.fireChangeEvent();
            }
        },
        
        getAdvancedTimeFilterModel: function() {
            return this.getModel("timeFilterModel").getData().timeFilters;
        },
        
        setAdvancedTimeFilterModel: function(timeFilterDataRequest) {
            var timeFilterArray = timeFilterDataRequest.filters;
            var timeFilters = [];
            
             for(var i=0;i<timeFilterArray.length;i++){
                if(timeFilterArray[i].this === "overlap"){
                    timeFilters.push({
                        originSelection: timeFilterArray[i].this,
                        targetSelection: "before_start",
                        targetInteraction: timeFilterArray[i].value,
                        days:""
                    });
                } else {
                    timeFilters.push({
                        originSelection: timeFilterArray[i].this,
                        targetSelection: timeFilterArray[i].after_before + "_" + timeFilterArray[i].other,
                        targetInteraction: timeFilterArray[i].value,
                        days: timeFilterArray[i].operator
                    });
                }
             }
            
            var timeFilterData = {timeFilters: timeFilters};
            this.getModel("timeFilterModel").setData(timeFilterData);
            this.setProperty("timeFilterTitle",timeFilterDataRequest.title);
            this._updateTitleBinding(timeFilterData.timeFilters.length);
        },
        
        getIFR: function() {
            var that = this;
            var timeFilterData = this.getModel("timeFilterModel").getData().timeFilters;
            var timeFilterDataObject = [];
            
            var rangeRegex = /^(\[|\])\s?(0|[1-9][0-9]*)\s?\-\s?(0|[1-9][0-9]*)\s?(\[|\])$/g;
            var operatorRegex = /^(\=|\>|\<|\>\=|\<\=)\s?(0|[1-9][0-9]*)$/g;
            var numRegex = /^(0|[1-9][0-9]*)$/g;            
            
            for(var i=0;i<timeFilterData.length;i++){
                var data = timeFilterData[i];
                rangeRegex.lastIndex = 0;
                operatorRegex.lastIndex = 0;
                numRegex.lastIndex = 0;
                
                if(!data.targetInteraction) {
                    continue; //Nothing set as Target Interaction Yet
                }
                
                if(data.originSelection!== "overlap" && !this._validateText(data.days)){
                    continue; //Invalid Text in days textbox
                }
                
                if(data.originSelection === "overlap"){
                    timeFilterDataObject.push({
                        "value": data.targetInteraction,
                        "this": "overlap",
                        "other": "overlap",
                        "after_before": "",
                        "operator": ""
                    });
                } else {
                    timeFilterDataObject.push({
                        "value": data.targetInteraction,
                        "this": data.originSelection,
                        "other": ((data.targetSelection === "before_start") || (data.targetSelection === "after_start")?"start":"end"),
                        "after_before": ((data.targetSelection === "before_start") || (data.targetSelection === "before_end")?"before":"after"),
                        "operator": data.days
                    });
                }
                
            }
            
            var objIFR = {filters: timeFilterDataObject, request: that.getRequest() ,title: that._constructTitle()}; //Temporary workaround for FilterBinding
            return objIFR;
            
            
        },
        
        getRequest: function(){
            var timeFilterData = this.getModel("timeFilterModel").getData().timeFilters;
            var timeFilterDataObject = [];
            
            var rangeRegex = /(\[|\])\s?(0|[1-9][0-9]*)\s?\-\s?(0|[1-9][0-9]*)\s?(\[|\])/g;
            var operatorRegex = /(\=|\>|\<|\>\=|\<\=)\s?(0|[1-9][0-9]*)/g;
            var numRegex = /(0|[1-9][0-9]*)/g;
            
            for(var i=0;i<timeFilterData.length;i++){
                var data = timeFilterData[i];
                rangeRegex.lastIndex = 0;
                operatorRegex.lastIndex = 0;
                numRegex.lastIndex = 0;
                if(!data.targetInteraction) {
                    continue;
                }
                if(data.originSelection!== "overlap" && !this._validateText(data.days)){
                    continue;
                }
                if(data.originSelection === "overlap"){
                    var thisContainThat = {
                        "value": data.targetInteraction,
                        "filter": [{
                            "this": "start",
                            "other": "start",
                            "and":[{
                                "op": "<",
                                "value": 0
                            }]
                        },{
                            "this": "end",
                            "other": "end",
                            "and":[{
                                "op": ">",
                                "value": 0
                            }]
                        }]
                    };
                    var thatContainThis = {
                        "value": data.targetInteraction,
                        "filter": [{
                            "this": "start",
                            "other": "start",
                            "and":[{
                                "op": ">",
                                "value": 0
                            }]
                        },{
                            "this": "end",
                            "other": "end",
                            "and":[{
                                "op": "<",
                                "value": 0
                            }]
                        }]
                    };
                    var thisBeforeThat = {
                        "value": data.targetInteraction,
                        "filter": [{
                            "this": "end",
                            "other": "start",
                            "and":[{
                                "op": ">",
                                "value": 0
                            }]
                        },{
                            "this": "end",
                            "other": "end",
                            "and":[{
                                "op": "<",
                                "value": 0
                            }]
                        }]
                    };
                    var thatBeforeThis = {
                        "value": data.targetInteraction,
                        "filter": [{
                            "this": "start",
                            "other": "start",
                            "and":[{
                                "op": ">",
                                "value": 0
                            }]
                        },{
                            "this": "start",
                            "other": "end",
                            "and":[{
                                "op": "<",
                                "value": 0
                            }]
                        }]
                    };
                    timeFilterDataObject.push({"or":[thisContainThat,thatContainThis,thisBeforeThat,thatBeforeThis]});
                    
                } else {
                    var otherObject = {
                        "value": data.targetInteraction,
                        "filter": []
                    };    
                    var existingObjectIndex = -1;
                    for(var ii=0;ii<timeFilterDataObject.length;ii++){
                        if(!(timeFilterDataObject[ii].or) && timeFilterDataObject[ii].value){
                            if(timeFilterDataObject[ii].value === data.targetInteraction){
                                existingObjectIndex = ii;
                            }
                        }
                    }
                    
                    var filterObj = {
                        "this": data.originSelection,
                        "other": (data.targetSelection==="before_start" || data.targetSelection==="after_start"?"start":"end"),
                        "and":[]
                    };
                    
                    rangeRegex.lastIndex = 0;
                    operatorRegex.lastIndex = 0;
                    numRegex.lastIndex = 0;
                    
                    if(rangeRegex.test(data.days)){
                        rangeRegex.lastIndex = 0;
                        var rangeOp = rangeRegex.exec(data.days);
                        var operator1 = rangeOp[1]==="]"?">":">=";
                        var value1 =  parseInt(rangeOp[2]);
                        var operator2 = rangeOp[4]==="["?"<":"<=";
                        var value2 =  parseInt(rangeOp[3]);
                        if(data.targetSelection==="after_start" || data.targetSelection==="after_end"){
                            operator1 = operator1.replace(">","<");
                            operator2 = operator2.replace("<",">");
                            value1 = value1 * -1;
                            value2 = value2 * -1;
                        }
                        filterObj.and.push({
                           "op": operator1,
                           "value": value1
                        });
                        filterObj.and.push({
                           "op": operator2,
                           "value": value2
                        });
                    } else if(operatorRegex.test(data.days)) {
                        operatorRegex.lastIndex = 0;
                        var opOp = operatorRegex.exec(data.days);
                        var operator1 = opOp[1];
                        var value1 =  parseInt(opOp[2]);
                        if(data.targetSelection === "after_start" || data.targetSelection === "after_end"){
                            operator1 = operator1.replace(">","*");
                            operator1 = operator1.replace("<",">");
                            operator1 = operator1.replace("*","<");
                            value1 = value1 * -1;
                        }
                        filterObj.and.push({
                           "op": operator1,
                           "value": value1
                        });
                    } else if(numRegex.test(data.days)) {
                        numRegex.lastIndex = 0;
                        var value1 = parseInt(numRegex.exec(data.days)[0]);
                        var operator1 = ">=";
                        var operator2 = "<=";
                        
                        if(data.targetSelection==="after_start" || data.targetSelection==="after_end"){
                            value1 = value1 * -1;
                        }
                        filterObj.and.push({
                           "op": operator1,
                           "value": value1
                        });
                        filterObj.and.push({
                           "op": operator2,
                           "value": value1
                        });
                    } else {
                        filterObj.and.push({
                           "op": ((data.targetSelection === "before_start" || data.targetSelection === "before_end")?">":"<"),
                           "value": 0
                        });
                    }
                    
                    if(existingObjectIndex>=0){
                        timeFilterDataObject[existingObjectIndex].filter.push(filterObj);
                    } else {
                        otherObject.filter.push(filterObj);
                        timeFilterDataObject.push(otherObject);
                    }
                }
            }
            
            return [{and: timeFilterDataObject}];
        },
        
        _updateTitleBinding: function(filterNum) {
            var that = this;
            var partsArray = [];
            for(var i=0;i<filterNum;i++){
                partsArray.push("timeFilterModel>/timeFilters/"+i+"/targetInteraction");
            }
            
            this.timeFilterToolbarTitle.bindText({
                parts: partsArray,
                formatter: function(partsArray){
                    
                    var timeFilterTitle = that.getFilterCardName() + " >";
                    
                    if(that.getModel() && that.getModel().getData() && that.getModel().getData().items 
                        && this.getModel("timeFilterModel") && this.getModel("timeFilterModel").getData() && this.getModel("timeFilterModel").getData().timeFilters) {
                        timeFilterTitle = that._constructTitle();
                    } else {
                        timeFilterTitle = that.getProperty("timeFilterTitle");
                    }
                    that.setProperty("timeFilterTitle",timeFilterTitle);
                    
                    return timeFilterTitle;
                }
            });
        },
        
        _constructTitle: function() {
            var that = this;
            var timeFilterTitle = that.getFilterCardName() + " >";
            
            var filterCardLookup = that.getModel().getData().items;
            var count = 0;
            var realData = this.getModel("timeFilterModel").getData().timeFilters;
            var targetInteractionList = [];
            for(var i=0;i<realData.length;i++){
                if(realData[i].targetInteraction){
                    
                    if(targetInteractionList.indexOf(realData[i].targetInteraction)>=0){
                        continue;
                    } else {
                        targetInteractionList.push(realData[i].targetInteraction);    
                    }
                    
                    if(count>0) {timeFilterTitle = timeFilterTitle + ",";}
                    var filterCardName = realData[i].targetInteraction;
                    for(var ii=0;ii<filterCardLookup.length;ii++){
                        if(filterCardLookup[ii].key === realData[i].targetInteraction) {
                            filterCardName = filterCardLookup[ii].text;
                            break;
                        }
                    }
                    timeFilterTitle = timeFilterTitle + " " + filterCardName;
                    count++;
                }
            }
            
            return timeFilterTitle;
        },
        
        _validateText: function(valu) {
            var rangeRegex = /^(\[|\])\s?(0|[1-9][0-9]*)\s?\-\s?(0|[1-9][0-9]*)\s?(\[|\])$/g;
            var operatorRegex = /^(\=|\>|\<|\>\=|\<\=)\s?(0|[1-9][0-9]*)$/g;
            var numRegex = /^(0|[1-9][0-9]*)$/g;

            if(!valu || rangeRegex.test(valu) || operatorRegex.test(valu) || numRegex.test(valu)) {
                return true;
            } else {
                return false;
            }
        },

        /*
        Bind Method Overrides
        */
        _callMethodInManagedObject: function (sFunctionName, sAggregationName) {
            var aArgs = Array.prototype.slice.call(arguments);

            //if (sAggregationName === "filterCards") {
            //    var mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') return x.replace("filterCards", "items"); else return x; });

                // Find is there another way to obtain the model name
            //    this._dataModelItemsModelName = mArgs[2].model;
            //    return this.filterCardsDropdown[sFunctionName].apply(this.filterCardsDropdown, mArgs.slice(1));
            //} else {
                return sap.ui.base.ManagedObject.prototype[sFunctionName].apply(this, aArgs.slice(1));
            //}
        },

        bindAggregation: function () {
            var args = Array.prototype.slice.call(arguments);
            this._callMethodInManagedObject.apply(this, ["bindAggregation"].concat(args));
            return this;
        }
    });
        
    return AdvancedTimeFilter;
});