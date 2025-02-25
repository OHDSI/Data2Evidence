sap.ui.controller('hc.hph.genomics.internal.demo.vb-ubc.VariantBrowser', {
    onExit: function () {
        if (this._searchPopover) {
            this._searchPopover.destroy();
        }
    },
    handleSearchPopover: function (oEvent) {
        if (!this._searchPopover) {
            this._searchPopover = sap.ui.xmlfragment('hc.hph.genomics.internal.demo.vb-ubc.VariantBrowser-Search', this);
            this._searchPopover.setInitialFocus(this._searchPopover.getContent()[0]);
        }
        if (this._searchPopover.isOpen()) {
            this._searchPopover.close();
        } else {
            this._searchPopover.openBy(oEvent.oSource);
        }
    },
    handleSearch: function (oEvent) {
        var sQuery = oEvent.getParameters().query;
        this._searchPopover.close();
        if (sQuery) {
            if (!this.getView().getContent()[0].getContent()[0].goto(sQuery)) {
                sap.m.MessageToast.show('Could not find "' + sQuery.trim() + '"');
            }
        }
    },
    handleSave: function (oEvent) {
        this.getView().getContent()[0].getContent()[0].download();
    },
    handleError: function (oEvent) {
    }
});