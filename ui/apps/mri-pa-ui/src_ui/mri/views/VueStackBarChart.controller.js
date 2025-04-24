sap.ui.define([
  'jquery.sap.global',
  'sap/hc/mri/pa/ui/Utils',
  'sap/hc/mri/pa/ui/lib/MriFrontendConfig',
  'sap/m/FlexBox',
  'sap/ui/commons/Label',
  'sap/ui/core/mvc/Controller',
  'sap/ui/model/json/JSONModel',
  'sap/viz/ui5/types/legend/Common',
  'sap/viz/ui5/types/StackedVerticalBar',
  'sap/viz/ui5/data/DimensionDefinition',
  'sap/viz/ui5/data/FlattenedDataset',
  'sap/viz/ui5/data/MeasureDefinition'
], function (jQuery, Utils, MriFrontendConfig, FlexBox, Label, Controller, JSONModel, Common,
  StackedVerticalBar, DimensionDefinition, FlattenedDataset, MeasureDefinition) {
    const StackBarChart = Controller.extend('sap.hc.mri.pa.ui.views.VueStackBarChart', {
      onInit: function () {
        this.eventBus = sap.ui.getCore().getEventBus();
        this.stackbarchart = this.byId('mriSbCohorts');

        this.stackbarchart.setHeight('100%');
        this.stackbarchart.setWidth('100%');
        this.stackbarchart.setLegend(new Common({
          isScrollable: true,
          visible: false
        }));
        this.stackbarchart.setPlotArea(new StackedVerticalBar({
          colorPalette: ['#EB7300', '#93C939', '#F0AB00', '#960981', '#EB7396', '#E35500', '#4FB81C', '#D29600', '#760A85', '#C87396', '#BC3618', '#247230', '#BE8200', '#45157E', '#A07396']
        }));
        this.stackbarchart.setNoData(new FlexBox({
          height: '100%',
          alignItems: 'Center',
          justifyContent: 'Center',
          items: [new Label({
            text: '{/noDataReason}',
            icon: 'sap-icon://message-information'
          })]
        }).addStyleClass('sapMriChartNoDataPholder'));

        var that = this;
        this.stackbarchart.attachSelectData(function () {
          var selection = that.getSelectedData();
          that.eventBus.publish('VUE_SB_SELECTION', selection);
        });

        this.stackbarchart.attachDeselectData(function () {
          var selection = that.getSelectedData();
          that.eventBus.publish('VUE_SB_SELECTION', selection);
        });

        this.eventBus.subscribe(
          'VUE_SB_CHART_UPDATE',
          this.updateChart,
          this);

        this.eventBus.subscribe(
          'VUE_SB_CHART_BUSY',
          function () {
            this.setChartBusy(true);
          },
          this);

        this.eventBus.subscribe(
          'VUE_SB_CHART_IDLE',
          function () {
            this.setChartBusy(false);
          },
          this);

        var model = new JSONModel({
          noDataReason: ''
        });
        this.getView().setModel(model);

        this.updateChart();
      },

      onExit: function () {
        this.eventBus.unsubscribe(
          'VUE_SB_CHART_UPDATE',
          this.updateChart,
          this);

        this.eventBus.subscribe(
          'VUE_SB_CHART_BUSY',
          function () {
            this.setChartBusy(true);
          },
          this);

        this.eventBus.subscribe(
          'VUE_SB_CHART_IDLE',
          function () {
            this.setChartBusy(false);
          },
          this);
      },

      setHeight: function (height) {
        this.stackbarchart.setHeight(height);
      },

      setWidth: function (width) {
        this.stackbarchart.setWidth(width);
      },

      getSelectedData: function () {
        var aSelectedData = [];
        var aCategories = this.stackbarchart.getDataset().getModel().getProperty("/categories");

        this.stackbarchart.selection().forEach(function (oDatapoint) {
          aCategories.forEach(function (mCategory) {
            var dataValue = oDatapoint.data[mCategory.name];

            // format date categories
            var oAttributeConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(mCategory.id);
            if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date || oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime) {
              var dDate;
              if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date) {
                dDate = Utils.parseDate(oDatapoint.data[mCategory.name], true);
              } else {
                dDate = Utils.parseDateTime(oDatapoint.data[mCategory.name], true);
              }
              if (dDate) {
                dataValue = Utils.formatISODate(dDate);
              }
            }
            aSelectedData.push({
              id: mCategory.id,
              value: dataValue
            });
          });
        });
        return aSelectedData;
      },

      setChartBusy: function (isBusy) {
        this.stackbarchart.setBusy(isBusy);
      },

      updateChart: function (sChannelId, sEventId, oEventData) {
        if (oEventData && oEventData.data) {
          var mResponse = oEventData.data;
          var bHasDummyCategory = false;
          var bHasStackCategory = false;

          var oDataset = this.stackbarchart.getDataset();

          if (!oDataset) {
            oDataset = new FlattenedDataset();
            oDataset.setModel(new JSONModel());
            this.stackbarchart.setDataset(oDataset);
          }

          oDataset.destroyDimensions();
          oDataset.destroyMeasures();

          mResponse.categories.forEach(function (mCategory) {
            if (mCategory.axis > 1) {
              bHasStackCategory = true;
            }
            oDataset.addDimension(new DimensionDefinition({
              axis: mCategory.axis,
              name: mCategory.name,
              value: mCategory.value
            }));
          });
          mResponse.measures.forEach(function (mMeasure) {
            return oDataset.addMeasure(new MeasureDefinition({
              group: mMeasure.group,
              name: mMeasure.name,
              value: mMeasure.value
            }));
          });

          if (bHasStackCategory) {
            this.stackbarchart.getLegend().setVisible(true);
          } else {
            this.stackbarchart.getLegend().setVisible(false);
          }

          if (oDataset.getDimensions().length > 0 && oDataset.getMeasures().length > 0) {
            oDataset.bindData('/data');
          }
          oDataset.getModel().setData(mResponse);

          if (mResponse.noDataReason) {
            this.getView().getModel().setProperty("/noDataReason", mResponse.noDataReason);
          }
        }
        this.stackbarchart.setBusy(false);
      }
    });
    return StackBarChart;
  });