// tslint:disable:variable-name
const sap = {
  hc: {
    mri: {
      pa: {
        ui: {
          lib: {
            Selection: {
              Invalid: 'n/a',
              NoBinning: '',
            },
            CDMAttrType: {
              Text: 'text',
              Number: 'num',
              Date: 'time', // legacy type "time" means date in fact
              Datetime: 'datetime',
            },
          },
        },
      },
    },
  },
}

const MRIChartDimensions = {
  Count: 5,
  X1: 0,
  X2: 1,
  X3: 2,
  StackAttribute: 3,
  Y: 4,
}

const MRIChartProperties = {
  Count: 3,
  Sort: 0,
  KMStartEvent: 1,
  KMEndEvent: 2,
}

const CDMAttrType = {
  Text: 'text',
  Number: 'num',
  Date: 'time', // legacy type "time" means date in fact
  Datetime: 'datetime',
}

/**
 * Events used by MRI PA.
 * @enum {string}
 */
const events = {
  CHANNEL: 'medexplorer',
  EVENT_ERROR: 'ERROR',
  EVENT_ADD_ATTRIBUTE: 'ADD_ATTRIBUTE',
  EVENT_FILTER_ON_GENE: 'FILTER_ON_GENE',
}

/**
 * Models used by MRI PA.
 * @enum {string}
 */
const models = {
  SELECTIONS: 'selections',
  LOCATIONS: 'locations',
  RESULTS: 'results',
  STATUS: 'status',
  FILTERBAR_DATA: 'filterbar_data',
}

const valuesMergeMode = {
  APPEND: 'APPEND',
  OVERRIDE: 'OVERRIDE',
}

const AxisIcons = {
  X1: '&#xf005;',
  X2: '&#xf003;',
  X3: '&#xf002;',
  Y: '&#xf006;',
}

const AxisId = {
  X: 1,
  Y: 2,
}

const chartInfo = {
  stacked: {
    name: 'stacked',
    icon: '',
    iconGroup: 'app-icons',
    keyCode: 120,
    tooltip: 'MRI_PA_TOOLTIP_CHARTTYPE_STACKED',
  },
  list: {
    name: 'list',
    icon: '',
    iconGroup: 'app-icons',
    keyCode: 124,
    tooltip: 'MRI_PA_TOOLTIP_CHARTTYPE_PATIENT_LIST',
  },
  // vb: {
  //   name: 'vb',
  //   icon: '',
  //   iconGroup: 'app-MRI-icons',
  //   keyCode: 123,
  //   tooltip: 'MRI_PA_TOOLTIP_CHARTTYPE_VB',
  // },
  sac: {
    name: 'sac',
    icon: '',
    iconGroup: 'app-icons',
    keyCode: 126,
    tooltip: 'MRI_PA_CFG_SAC_CHART_VISIBLE_TOOLTIP',
  },
}

// in mm size
const PDFPage = {
  a4: {
    name: 'MRI_PA_PAPERSIZE_A4',
    height: 210,
    width: 297,
  },
  a3: {
    name: 'MRI_PA_PAPERSIZE_A3',
    height: 297,
    width: 420,
  },
  letter: {
    name: 'MRI_PA_PAPERSIZE_LETTER',
    height: 215.9,
    width: 279.4,
  },
  legal: {
    name: 'MRI_PA_PAPERSIZE_LEGAL',
    height: 215.9,
    width: 355.6,
  },
}

const PDFConsts = {
  pageLeftMargin: 8.5,
  pageRightMargin: 8.5,
  pageTopMargin: 20,
  pageBottomMargin: 10,

  pageTitleFont: 12,
  pageTitleMargin: 0.5,

  iconFont: 14,
  iconWidth: 4.6,
  iconHeight: 4.6,
  iconHMargin: 1,
  iconVMargin: 1,

  footerFont: 8,
  footerColor: { R: 0, G: 0, B: 0, HEX: '#000000' },
  footerBottomMargin: 6.5,
  foorterRightMargin: 5,

  chartFont: 8,
  chartFontHeight: 2.3,

  sectionHeaderFont: 10,
  sectionHeaderFontHeight: 3.5,
  sectionHeaderIconMargin: 1.5,
  sectionHeaderTopLineMargin: 2.5,
  sectionHeaderBottomLineMargin: 3,
  sectionFooterBottomMargin: 5.5,

  detailsFont: 8,
  filterCardsFont: 8,

  tableMargin: 2,
  tableFont: 8,
  tableFontHeight: 2.3,
  tableColor: { R: 0, G: 143, B: 227, HEX: '#008fd3' },
  tableBorderColor: { R: 170, G: 170, B: 170, HEX: '#aaaaaa' },
  largeBoxMargin: 2.5,
  largeBoxMarginInternal: 3,
  largeBoxHeaderMargin: 3.4,
  smallBoxMargin: 2,

  filterCardBorderColor: { R: 100, G: 100, B: 100, HEX: '#646464' },
  filterCardTitleMargin: 1.2,
  filterCardPerRow: 4,
  filterCardBottomMargin: 8,
  filterCardFontHeight: 2.3,
  filterCardNextLineHeight: 1,
  filterCardHeaderBottomMargin: 3.4,
  filterCardColor: { R: 0, G: 143, B: 227, HEX: '#008fd3' },
  filterCardHeaderFontColor: { R: 255, G: 255, B: 255, HEX: '#ffffff' },
  filterCardFirstAttribute: 4.5,
  filterCardFirstAttributeLarge: 5.4,
  filterCardBetweenAttribute: 4,
  filterCardBetweenAttributeLarge: 4.5,
  filterCardBetweenAttributeConstraint: 2.7,
  filterCardBetweenAttributeConstraintLarge: 4,

  constraintMinLength: 8,
  constraintNextLine: 2.5,

  axisInfoFont: 8,
  axisInfoFontHeight: 2.3,
  axisInfoHeaderBottomMargin: 3.4,
  axisIconHmargin: 1.5,
  axisInfoMarginBetween: 3,
  axisInfoMarginBetweenCat: 8,

  kmLegendWidth: 30,
  kmLegendMaxHeight: 10000,
  kmLegendFont: '12px Arial',
  kmLegendColor: '#000000',
  kmLegendMargin: 10,
  kmLegendTextMargin: 2,
  kmLegendBox: 12,
  mm: 3.75,

  boxplotHeaderBorderColor: { R: 0, G: 0, B: 0, HEX: '#000000' },

  tableBGHeader: { R: 69, G: 125, B: 170, HEX: '#457daa' },
  tableBGSubheader: { R: 247, G: 247, B: 247, HEX: '##f7f7f7' },
  tableContentText: { R: 102, G: 102, B: 102, HEX: '#666666' },
  tableHeaderTitleText: { R: 255, G: 255, B: 255, HEX: '#ffffff' },
  tableDivBorderColor: { R: 225, G: 225, B: 225, HEX: '#e1e1e1' },

  plHeaderColor: { R: 245, G: 245, B: 245, HEX: '#f5f5f5' },
  plFont: 8,
}

const PDFColorConstOpacity = [
  { originR: 235, originG: 115, originB: 0, newR: 246, newG: 199, newB: 165 },
  { originR: 147, originG: 201, originB: 57, newR: 212, newG: 233, newB: 176 },
  { originR: 240, originG: 171, originB: 0, newR: 250, newG: 222, newB: 153 },
  { originR: 150, originG: 9, originB: 129, newR: 214, newG: 153, newB: 205 },
  { originR: 235, originG: 115, originB: 150, newR: 248, newG: 198, newB: 213 },
  { originR: 227, originG: 85, originB: 0, newR: 245, newG: 187, newB: 153 },
  { originR: 79, originG: 184, originB: 28, newR: 183, newG: 227, newB: 153 },
  { originR: 210, originG: 150, originB: 0, newR: 237, newG: 213, newB: 153 },
  { originR: 118, originG: 10, originB: 133, newR: 201, newG: 153, newB: 207 },
  { originR: 200, originG: 115, originB: 150, newR: 234, newG: 199, newB: 213 },
  { originR: 188, originG: 54, originB: 24, newR: 229, newG: 174, newB: 156 },
  { originR: 36, originG: 114, originB: 48, newR: 165, newG: 199, newB: 171 },
  { originR: 190, originG: 130, originB: 0, newR: 229, newG: 205, newB: 153 },
  { originR: 69, originG: 21, originB: 126, newR: 181, newG: 158, newB: 204 },
  { originR: 160, originG: 115, originB: 150, newR: 217, newG: 199, newB: 213 },
]

const PlotlyFont = {
  color: '#000080',
  family: "'GT-America', sans-serif",
}
const PlotlyConsts = {
  layout: {
    barmode: 'stack',
    bargap: 0.5,
    clickmode: 'event+select',
    colorway: [
      '#FDA2A2',
      '#000E7E',
      '#A2FDCD',
      '#FF5E59',
      '#CCDEF1',
      '#2599A7',
      '#FFC4AD',
      '#999FCB',
      '#EBF0C8',
      '#CE7AEB',
      '#69BBF6',
      '#FDEEA2',
      '#9215BC',
      '#9FC5E8',
      '#FFD9A5',
    ],
    dragmode: 'select',
    font: PlotlyFont,
    hoverlabel: {
      align: 'left',
      bgcolor: '#f9f9f9',
      bordercolor: '#dedede',
      font: PlotlyFont,
    },
    margin: {
      l: 60,
      r: 20,
      t: 30,
      b: 50,
    },
    xaxis: {
      automargin: true,
      tickson: 'boundaries',
      ticks: 'outside',
      type: 'multicategory', // Dynamically toggled with "category" while converting data into Plotly traces
    },
    yaxis: {
      showline: true,
      ticks: 'outside',
    },
  },
  config: {
    displaylogo: false,
    displayModeBar: false,
    responsive: true,
  },
}

const CohortEntryExit = {
  ENTRY: 'Entry',
  EXIT: 'Exit',
  ENTRY_ICON: '&#xE058;',
  EXIT_ICON: '&#xE069;',
  ENTRY_KEY: 'isEntry',
  EXIT_KEY: 'isExit',
}

export default {
  sap,
  events,
  models,
  valuesMergeMode,
  CDMAttrType,
  chartInfo,
  MRIChartDimensions,
  MRIChartProperties,
  PDFColorConstOpacity,
  PDFConsts,
  PDFPage,
  PlotlyConsts,
  AxisIcons,
  AxisId,
  CohortEntryExit,
}
