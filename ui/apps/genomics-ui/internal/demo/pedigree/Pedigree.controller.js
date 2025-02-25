sap.ui.controller('hc.hph.genomics.internal.demo.pedigree.Pedigree', {
    onInit: function () {
        this.getAllPatients(this);
    },
    onSearch: function (oEvent) {
        var aFilters = [];
        var filterMain;
        var list = this.getView().byId('ProductList');
        var binding = list.getBinding('items');
        var sQuery = oEvent.getSource().getValue();
        if (sQuery === null || sQuery === '') {
            filterMain = [];
        } else {
            if (sQuery && sQuery.length > 0) {
                var filterName = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sQuery);
                var filterDob = new sap.ui.model.Filter("dob", sap.ui.model.FilterOperator.Contains, sQuery);
                var filterDod = new sap.ui.model.Filter("dod", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filterName);
                aFilters.push(filterDob);
                aFilters.push(filterDod);
            }
            filterMain = new sap.ui.model.Filter({
                filters: aFilters,
                and: false
            });
        }
        binding.filter(filterMain, 'Application');
    },
    getAllPatients: function (pointer) {
        jQuery.sap.registerModulePath("hc.hph.core", "/hc/hph/core");
        jQuery.sap.require('hc.hph.core.ui.Util');
        hc.hph.core.ui.Util.ajax({
            url: "/hc/hph/genomics/internal/demo/pedigree/lib/getData.xsjs",
            method: 'GET',
            async: false,
            dataType: 'text',
            contentType: "application/json",
            success: function (result) {
                var oModel = new sap.ui.model.json.JSONModel();
                oModel.setData(JSON.parse(result));
                pointer.getView().byId("master").setModel(oModel);
            }
        });
    },
    callPatientData: function (patientId, pointer) {
        jQuery.sap.registerModulePath("hc.hph.core", "/hc/hph/core");
        jQuery.sap.require('hc.hph.core.ui.Util');
        hc.hph.core.ui.Util.ajax({
            url: "/hc/hph/genomics/internal/demo/pedigree/lib/getData.xsjs?id=" + patientId,
            method: 'GET',
            async: false,
            dataType: 'text',
            contentType: "application/json",
            success: function (result) {
                var oModel = new sap.ui.model.json.JSONModel();
                oModel.setData(JSON.parse(decodeURI(result)));
                pointer.byId("PedigreeTree").setModel(oModel);
            }
        });
    },
    handleSwitchTree: function () {
        this.byId('PedigreeContainerPage').to(this.createId('TreeViewPage'), 'flip');
        this.byId('SwitchTreeButton').setVisible(false);
        this.byId('SwitchListButton').setVisible(true);
    },
    handleSwitchList: function () {
        this.byId('PedigreeContainerPage').to(this.createId('ListViewPage'), 'flip');
        this.byId('SwitchTreeButton').setVisible(true);
        this.byId('SwitchListButton').setVisible(false);
    },
    handlePress: function (oEvent) {
        var patientId = oEvent.getSource().getBindingContext().getObject().patientId;
        this.callPatientData(patientId, this);
    }
});