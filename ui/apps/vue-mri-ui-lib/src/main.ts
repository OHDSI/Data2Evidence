import BootstrapVue from 'bootstrap-vue'
import { createApp, Component } from 'vue'
import datetimePicker from 'vue-bootstrap-datetimepicker'
import Multiselect from 'vue-multiselect'
import { applyPolyfills, defineCustomElements } from '@d4l/web-components-library/dist/loader'

import App from './App.vue'
import clickFocus from './directives/clickFocus'
import focus from './directives/focus'
import mouseScroll from './directives/mouseScroll'
import positionCenter from './directives/positionCenter'
import resizeTable from './directives/resizeTable'
import appButtonVue from './lib/ui/app-button.vue'
import appDateRangeVue from './lib/ui/app-date-range.vue'
import appDatetimeRangeVue from './lib/ui/app-datetime-range.vue'
import appLabelVue from './lib/ui/app-label.vue'
import appRangeVue from './lib/ui/app-range.vue'
import appVariantRangeVue from './lib/ui/app-variant-range.vue'
import appSingleSelect from './lib/ui/app-single-select.vue'
import appTagInputVue from './lib/ui/app-tag-input.vue'
import store from './store'

const app = createApp(App as unknown as Component)

app.use(store)
app.use(BootstrapVue)
app.component('app-label', appLabelVue)
app.component('app-tag-input', appTagInputVue)
app.component('app-range', appRangeVue)
app.component('app-variant-range', appVariantRangeVue)
app.component('app-button', appButtonVue)
app.component('app-date-range', appDateRangeVue)
app.component('app-datetime-range', appDatetimeRangeVue)
app.component('app-single-select', appSingleSelect)
app.component('multiselect', Multiselect)
app.component('datetime-picker', datetimePicker)
app.directive('focus', focus)
app.directive('click-focus', clickFocus)
app.directive('position-center', positionCenter)
app.directive('mouse-scroll', mouseScroll)
app.directive('resize-table', resizeTable)

app.config.errorHandler = () => null
app.config.warnHandler = () => null
app.config.compilerOptions.isCustomElement = tag => tag.startsWith('d4l-')

// Bind the custom elements to the window object
applyPolyfills().then(() => {
  defineCustomElements()
})

app.mount('.vue-main')
