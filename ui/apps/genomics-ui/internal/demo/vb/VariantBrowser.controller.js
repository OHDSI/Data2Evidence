jQuery.sap.require("hc.hph.core.ui.Util");
sap.ui.controller('hc.hph.genomics.internal.demo.vb.VariantBrowser', {
    onInit: function () {
        var oView = this.getView();
        var i18nModel = new sap.ui.model.resource.ResourceModel({ bundleUrl: "/hc/hph/genomics/ui/i18n/vb/messagebundle.properties" });
        oView.setModel(i18nModel, "i18n");    // set local favorite model
                                              /*	this.getView().setModel(new sap.ui.model.json.JSONModel({}), "fav");
		this._updateFavoritesModel(true);*/
    },
    onExit: function () {
        if (this._searchPopover) {
            this._searchPopover.destroy();
        }
    },
    //////  SEARCH FUNCTIONALITY  ////////
    handleSearchPopover: function (oEvent) {
        var that = this;
        var oSrc = oEvent.oSource;
        //create global JSON model for search terms
        that.searchTermsModel = new sap.ui.model.json.JSONModel();
        hc.hph.core.ui.Util.ajax({
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            type: "POST",
            url: "/hc/hph/genomics/services/",
            data: JSON.stringify({
                request: "search.searchField.listSearchHistory",
                parameters: {}
            }),
            dataType: "json",
            contentType: "application/json"
        }).done(function (oData) {
            // put the data from backend to JSON model
            that.searchTermsModel.setData(oData.result);
            if (!that._searchPopover) {
                that._searchPopover = sap.ui.xmlfragment('hc.hph.genomics.internal.demo.vb.VariantBrowser-Search', that);
                that._searchPopover.setModel(that.getView().getModel("i18n"), "i18n");
                that.getView().addDependent(that._searchPopover);
                that._searchPopover.setInitialFocus(that._searchPopover.getContent()[0]);
            }
            if (that._searchPopover.isOpen()) {
                that._searchPopover.close();
            } else {
                that._searchPopover.setModel(that.searchTermsModel);
                that._searchPopover.openBy(oSrc);
            }
        }).fail();
    },
    handleSearch: function (oEvent) {
        var sQuery = oEvent.getParameters().query;
        if (!sQuery && oEvent.getParameters().listItem) {
            sQuery = oEvent.getParameters().listItem.getTitle();
        }
        this._searchPopover.close();
        if (sQuery) {
            if (!this.getView().getContent()[0].getContent()[0].goto(sQuery)) {
                sap.m.MessageToast.show('Could not find "' + sQuery.trim() + '"');
            }
        }
    },
    liveTermSearch: function (oEvent) {
        var searchValue = oEvent.getSource().getValue();
        var binding = sap.ui.getCore().byId("searchTermsListID").getBinding("items");
        //"searchTerm" taken from backend service xsjslib
        var oFilter = new sap.ui.model.Filter("searchTerm", sap.ui.model.FilterOperator.Contains, searchValue);
        binding.filter([oFilter]);
    },
    //////  END OF SEARCH FUNCTIONALITY  ////////
    handleSave: function (oEvent) {
        this.getView().getContent()[0].getContent()[0].download();
    },
    handleError: function (oEvent) {
    },
    handleGeneFilter: function (oEvent) {
        sap.m.MessageToast.show(oEvent.getParameter("payload"));
    },
    handleAlleleFilter: function () {
        sap.m.MessageToast.show("it works!");
    }
});