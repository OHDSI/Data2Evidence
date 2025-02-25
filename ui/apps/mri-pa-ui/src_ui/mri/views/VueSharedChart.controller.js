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
  'sap/viz/ui5/types/VerticalBar',
  'sap/viz/ui5/data/DimensionDefinition',
  'sap/viz/ui5/data/FlattenedDataset',
  'sap/viz/ui5/data/MeasureDefinition'
], function (jQuery, Utils, MriFrontendConfig, FlexBox, Label, Controller, JSONModel, Common,
  StackedVerticalBar, VerticalBar, DimensionDefinition, FlattenedDataset, MeasureDefinition) {
    const SharedChart = Controller.extend('sap.hc.mri.pa.ui.views.VueSharedChart', {
      onInit: function () {
        this.eventBus = sap.ui.getCore().getEventBus();
        this.sharedchart = this.byId('mriSbCohorts');

        this.sharedchart.setHeight('100%');
        this.sharedchart.setWidth('100%');

        this.sharedchart.setPlotArea(new VerticalBar({
          colorPalette: ['#EB7300', '#93C939', '#F0AB00', '#960981', '#EB7396', '#E35500', '#4FB81C', '#D29600', '#760A85', '#C87396', '#BC3618', '#247230', '#BE8200', '#45157E', '#A07396']
        }));
        this.sharedchart.setNoData(new FlexBox({
          height: '100%',
          alignItems: 'Center',
          justifyContent: 'Center',
          items: [new Label({
            text: '{/noDataReason}',
            icon: 'sap-icon://message-information'
          })]
        }).addStyleClass('sapMriChartNoDataPholder'));

        var that = this;

        this.eventBus.subscribe(
          'VUE_SHARED_CHART_UPDATE',
          this.updateChart,
          this);

        this.eventBus.subscribe(
          'VUE_SHARED_CHART_BUSY',
          function () {
            this.setChartBusy(true);
          },
          this);

        this.eventBus.subscribe(
          'VUE_SHARED_CHART_IDLE',
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
          'VUE_SHARED_CHART_UPDATE',
          this.updateChart,
          this);

        this.eventBus.subscribe(
          'VUE_SHARED_CHART_BUSY',
          function () {
            this.setChartBusy(true);
          },
          this);

        this.eventBus.subscribe(
          'VUE_SHARED_CHART_IDLE',
          function () {
            this.setChartBusy(false);
          },
          this);
      },

      setHeight: function (height) {
        this.sharedchart.setHeight(height);
      },

      setWidth: function (width) {
        this.sharedchart.setWidth(width);
      },

      setChartBusy: function (isBusy) {
        this.sharedchart.setBusy(isBusy);
      },

      updateChart: function (sChannelId, sEventId, oEventData) {
        if (oEventData && (oEventData.sharedData)) {
          var mResponse = oEventData.sharedData;
          var noDataReason = oEventData.noDataReason;

          var bHasDummyCategory = false;
          var bHasStackCategory = false;

          var oDataset = this.sharedchart.getDataset();

          if (!oDataset) {
            oDataset = new FlattenedDataset();
            oDataset.setModel(new JSONModel());
            this.sharedchart.setDataset(oDataset);
          }

          oDataset.destroyDimensions();
          oDataset.destroyMeasures();

          var firstData = mResponse[0].data;
          firstData.categories.forEach(function (mCategory) {
            if (mCategory.axis > 1) {
              bHasStackCategory = true;
            }
            oDataset.addDimension(new DimensionDefinition({
              axis: mCategory.axis,
              name: mCategory.name,
              value: mCategory.value
            }));
          });

          var systemCount = 0;
          var meassureVal = "";
          firstData.measures.forEach(function (mMeasure) {
            meassureVal = mMeasure.value.substring(1, mMeasure.value.length - 1);
            for (var idx = 0; idx < mResponse.length; idx += 1) {
              oDataset.addMeasure(new MeasureDefinition({
                group: mMeasure.group,
                name: mMeasure.name + ' (' + mResponse[idx].userName + ')',
                value: '{SYSTEM_' + idx + '}'
              }));
              systemCount += 1;
            }
          });

          var combinedData = { data: [] };
          firstData.data.forEach(function (mData) {
            mData["SYSTEM_0"] = mData[meassureVal];
            for (var ii = 1; ii < mResponse.length; ii += 1) {
              mData["SYSTEM_" + ii] = 0;
            }
            combinedData.data.push(mData);
          });

          for (var idx = 1; idx < mResponse.length; idx += 1) {
            var inProcess = mResponse[idx].data;
            inProcess.data.forEach(function (mData) {
              var meassureValue = mData[meassureVal];
              var dataFound = false;
              for (var i = 0; i < combinedData.data.length; i++) {
                var equalObject = true;
                for (var field in mData) {
                  if (!mData[field] || !combinedData.data[i][field] || mData[field] !== combinedData.data[i][field]) {
                    equalObject = false;
                    break;
                  }
                }
                if (equalObject) {
                  dataFound = true;
                  combinedData.data[i]["SYSTEM_" + idx] = meassureValue;
                  break;
                }
              }
              if (!dataFound) {
                for (var ii = 0; ii < mResponse.length; ii += 1) {
                  mData["SYSTEM_" + ii] = 0;
                }
                mData["SYSTEM_" + idx] = meassureValue;
                combinedData.data.push(mData);
              }
            });
          }

          if (oDataset.getDimensions().length > 0 && oDataset.getMeasures().length > 0) {
            oDataset.bindData('/data');
          }
          oDataset.getModel().setData(combinedData);

          if (noDataReason) {
            this.getView().getModel().setProperty("/noDataReason", noDataReason);
          }
        }
        this.sharedchart.setBusy(false);
      }
    });
    return SharedChart;
  });