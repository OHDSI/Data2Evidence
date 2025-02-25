// tslint:disable:max-classes-per-file
const chartIdToRawConfigMap = {
  stacked: {
    className: 'hc.mri.pa.ui.lib.StackedBarChart',
    icon: 'app-icon://vertical-bar-chart',
    tooltip: '{i18n>MRI_PA_TOOLTIP_CHARTTYPE_STACKED}',
    urlKey: 'stacked',
    keyCode: 119, // F8
  },
  km: {
    className: 'hc.mri.pa.ui.lib.KaplanMeierChart',
    icon: 'app-icon://MRI/km-chart',
    tooltip: '{i18n>MRI_PA_TOOLTIP_CHARTTYPE_KAPLAN}',
    urlKey: 'km',
    keyCode: 121, // F10
  },
  list: {
    className: 'hc.mri.pa.ui.lib.PatientListChart',
    icon: 'app-icon://list',
    tooltip: '{i18n>MRI_PA_TOOLTIP_CHARTTYPE_PATIENT_LIST}',
    urlKey: 'list',
    keyCode: 123, // F12
  },
}

class ChartConfig {
  public mriFrontendConfig: any
  public id: any
  public chartConfig: any
  constructor(mriFrontendConfig, id, chartConfig) {
    this.mriFrontendConfig = mriFrontendConfig
    this.id = id
    this.chartConfig = chartConfig
  }

  public getChartId() {
    return this.id
  }

  public getClassName() {
    return this.chartConfig.className
  }

  public getIcon() {
    return this.chartConfig.icon
  }

  public getDataURL() {
    return this.chartConfig.dataURL
  }

  public getTooltip() {
    return this.chartConfig.tooltip
  }

  public getUrlKey() {
    return this.chartConfig.urlKey
  }

  public isVisible() {
    return this.mriFrontendConfig.isChartVisible(this.id)
  }

  public isCollectionEnabled() {
    return this.mriFrontendConfig.isChartCollectionEnabled(this.id)
  }

  public isDownloadEnabled() {
    return this.mriFrontendConfig.isChartDownloadEnabled(this.id)
  }

  public getKeyCode() {
    return this.chartConfig.keyCode
  }
}

export default class ChartConfigService {
  public chartIdToConfigWrapperMap: any
  public mriFrontendConfig: any
  constructor(mriFrontendConfig) {
    this.mriFrontendConfig = mriFrontendConfig
    this.chartIdToConfigWrapperMap = {}
    this.init()
  }

  public init() {
    Object.keys(chartIdToRawConfigMap).forEach(id => {
      const chartConfig = new ChartConfig(this.mriFrontendConfig, id, chartIdToRawConfigMap[id])

      this.chartIdToConfigWrapperMap[id] = chartConfig
    })
  }

  public getAllChartConfigs() {
    const chartConfigs = Object.keys(this.chartIdToConfigWrapperMap).map(key => this.chartIdToConfigWrapperMap[key])

    return chartConfigs
  }

  public getChartConfigFor(id) {
    return this.chartIdToConfigWrapperMap[id]
  }
}
