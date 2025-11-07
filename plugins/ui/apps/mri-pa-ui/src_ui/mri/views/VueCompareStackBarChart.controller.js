sap.ui.define([
  'jquery.sap.global',
  'sap/hc/mri/pa/ui/Utils',
  'sap/hc/mri/pa/ui/lib/MriFrontendConfig',
  'sap/m/FlexBox',
  'sap/ui/commons/Label',
  'sap/ui/core/mvc/Controller',
  'sap/ui/model/json/JSONModel',
  'sap/viz/ui5/controls/common/feeds/FeedItem',
  'sap/viz/ui5/data/DimensionDefinition',
  'sap/viz/ui5/data/FlattenedDataset',
  'sap/viz/ui5/data/MeasureDefinition',
  'sap/viz/ui5/format/ChartFormatter',
  'sap/viz/ui5/api/env/Format',
], function (jQuery, Utils, MriFrontendConfig, FlexBox, Label, Controller, JSONModel,
  FeedItem, DimensionDefinition, FlattenedDataset, MeasureDefinition, ChartFormatter, Format) {
  var ColumnBarChart = Controller.extend('sap.hc.mri.pa.ui.views.VueCompareStackBarChart', {
    onInit: function () {
      this.eventBus = sap.ui.getCore().getEventBus();
      this.columnbarchart = this.byId('mriSbCompareCohorts');
      Format.numericFormatter(ChartFormatter.getInstance());
      var formatPattern = ChartFormatter.DefaultPattern;

      this.eventBus.subscribe(
        'VUE_SB_COMPARE_CHART_UPDATE',
        this.updateChart,
        this);

      this.eventBus.subscribe(
        'VUE_SB_COMPARE_CHART_BUSY',
        function () {
          this.setChartBusy(true);
        },
        this);

      this.eventBus.subscribe(
        'VUE_SB_COMPARE_CHART_IDLE',
        function () {
          this.setChartBusy(false);
        },
        this);

      this.eventBus.subscribe(
        'VUE_BAR_COMPARE_CHART_DOWNLOAD',
        this.downloadChart,
        this
      );


      this.oPopOver = new sap.viz.ui5.controls.VizTooltip({});
      this.oPopOver.connect(this.columnbarchart.getVizUid());
      this.oPopOver.setFormatString(formatPattern.STANDARDFLOAT);
    },
    downloadChart: function () {

      var oVizFrame = this.byId('mriSbCompareCohorts');
      var sSVG = oVizFrame.exportToSVGString({
        width: 1050,
        height: 675
      });
      var oCanvasHTML = document.createElement("canvas");
      //add SVG chart content to canvas using library "canvg"

      sSVG = sSVG.replace(/translate /gm, "translate");
      canvg(oCanvasHTML, sSVG);
      // STEP 3: Get dataURL for content in Canvas as PNG/JPEG
      var sImageData = oCanvasHTML.toDataURL("image/png");

    },
    updateChart: function (sChannelId, sEventId, oEventData) {
      var data = oEventData.data;
      this.columnbarchart.removeAllFeeds();
      var settingsModel = {
        valueAxis: {
          title: {
            visible: false
          }
        },
        categoryAxis: {
          title: {
            visible: false
          }
        },
        title: {
          visible: false
        },
        plotArea: {
          dataPointStyle: {}
        },
        tooltip: {
          visible: true
        },
        interaction: {
          behaviorType: null
        },
      };

      var colorPalette = [
        "sapUiChartPaletteQualitativeHue1",
        "sapUiChartPaletteQualitativeHue2",
        "sapUiChartPaletteQualitativeHue3",
        "sapUiChartPaletteQualitativeHue4",
        "sapUiChartPaletteQualitativeHue5",
        "sapUiChartPaletteQualitativeHue6",
        "sapUiChartPaletteQualitativeHue7",
        "sapUiChartPaletteQualitativeHue8",
        "sapUiChartPaletteQualitativeHue9",
        "sapUiChartPaletteQualitativeHue10",
        "sapUiChartPaletteQualitativeHue11"
      ];
      var rules = [];
      data.legend.forEach(function (item, i) {
        rules.push({
          "dataContext": {
            "Cohorts": item
          },
          "properties": {
            "color": colorPalette[i]
          },
          "displayName": item
        });
      });
      settingsModel.plotArea.dataPointStyle.rules = rules;
      this.columnbarchart.setVizProperties(settingsModel);
      var dataset = {
        measures: [],
        dimensions: [{
          name: "Cohorts",
          value: "{cohortName}"
        }],
        data: {
          path: "/data"
        }
      };
      var measureName = "";
      if (data.measures && Array.isArray(data.measures) && data.measures.length > 0) {
        dataset.measures.push({
          name: data.measures[0].name,
          value: data.measures[0].value
        });
        measureName = data.measures[0].name;
      }
      var categoryName = "";
      if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
        data.categories.forEach(function (category) {
          if (category.id !== "cohortId") {
            dataset.dimensions.push({
              name: category.name,
              value: category.value
            });
            categoryName = category.name;
          }
        });
      }

      // create multiple Feed Item for X axis with and then attach the cohort at the end
      var oDataset = new FlattenedDataset(dataset);

      this.columnbarchart.setModel(new JSONModel(data));
      this.columnbarchart.setDataset(oDataset);
      var feedValueAxis = new FeedItem({
        "uid": "valueAxis",
        "type": "Measure",
        "values": [measureName]
      });
      this.columnbarchart.addFeed(feedValueAxis);

      if (categoryName) {
        var feedCategoryAxis1 = new FeedItem({
          "uid": "categoryAxis",
          "type": "Dimension",
          "values": [categoryName]
        });
        this.columnbarchart.addFeed(feedCategoryAxis1);
      }

      var feedCategoryAxis = new FeedItem({
        "uid": "categoryAxis",
        "type": "Dimension",
        "values": ["Cohorts"]
      });
      this.columnbarchart.addFeed(feedCategoryAxis);
    },

    setChartBusy: function (isBusy) {
      this.stackbarchart.setBusy(isBusy);
    },

    onExit: function () {
      this.eventBus.unsubscribe(
        'VUE_SB_COMPARE_CHART_UPDATE',
        this.updateChart,
        this);

      this.eventBus.subscribe(
        'VUE_SB_COMPARE_CHART_BUSY',
        function () {
          this.setChartBusy(true);
        },
        this);

      this.eventBus.subscribe(
        'VUE_SB_COMPARE_CHART_IDLE',
        function () {
          this.setChartBusy(false);
        },
        this);

      this.eventBus.subscribe(
        'VUE_BAR_COMPARE_CHART_DOWNLOAD',
        this.downloadChart,
        this);

    }

  });
  return ColumnBarChart;
});