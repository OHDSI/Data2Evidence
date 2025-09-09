<template>
  <div class="app-date-range">
    <appDate
      :date="fromDate"
      :text="getText('MRI_PA_DATE_FROM_LABEL')"
      @update="updateFrom"
      :config="dateControlConfig"
      :config-format="dateControlConfig.format"
      :placeholder="dateFormatPlaceholder"
      datetype="from"
      :errMsg="errTextFrom"
    ></appDate>
    <appDate
      :date="toDate"
      :text="getText('MRI_PA_DATE_TO_LABEL')"
      @update="updateTo"
      :config="dateControlConfig"
      :config-format="dateControlConfig.format"
      :placeholder="dateFormatPlaceholder"
      datetype="to"
      :errMsg="errTextTo"
    ></appDate>
  </div>
</template>
<script lang="ts">
import { mapGetters, mapActions } from 'vuex'
import DateUtils from '../../utils/DateUtils'
import appDate from './app-date.vue'
import moment from 'moment'

export default {
  name: 'app-date-range',
  props: ['model'],
  data() {
    return {
      errTextFrom: '',
      errTextTo: '',
      fromDate: '',
      toDate: '',
    }
  },
  watch: {
    'model.props.fromDate.value': {
      handler(newValue) {
        this.fromDate = newValue
      },
      immediate: true,
    },
    'model.props.toDate.value': {
      handler(newValue) {
        this.toDate = newValue
      },
      immediate: true,
    },
  },
  computed: {
    ...mapGetters(['getText', 'getConstraint', 'getMriFrontendConfig']),
    dateControlConfig() {
      try {
        const configFormat = this.getMriFrontendConfig?._internalConfig?.panelOptions?.settings?.dateFormat
        return {
          format: configFormat || 'YYYY-MM-DD',
        }
      } catch (error) {
        console.warn('Could not access MRI frontend config for date format, using default:', error)
        return {
          format: 'YYYY-MM-DD',
        }
      }
    },
    dateFormatPlaceholder() {
      try {
        const configFormat =
          this.getMriFrontendConfig?._internalConfig?.panelOptions?.settings?.dateFormat || 'YYYY-MM-DD'
        // Use September 30, 2025 - makes it clear which is month (09) vs day (30)
        const exampleDate = moment('2025-09-30')
        const formattedExample = exampleDate.format(configFormat)
        return `eg: ${formattedExample}`
      } catch (error) {
        console.warn('Could not access MRI frontend config for date format, using default:', error)
        return 'eg: 2025-09-30'
      }
    },
  },
  methods: {
    ...mapActions(['updateDateConstraintValue']),

    updateFrom(val) {
      if (val) {
        const payload = {
          constraintId: this.model.id,
          fromDateValue: val.date,
          toDateValue: '',
          isUTC: false,
        }
        if (this.toDate) {
          if (new Date(this.toDate) < new Date(val.date)) {
            this.errTextFrom = this.getText('MRI_PA_TIMERANGE_INVALID')
          } else {
            this.errTextFrom = ''
            payload.toDateValue = this.toDate
            this.updateDateConstraintValue(payload)
          }
        } else {
          this.errTextFrom = ''
          this.updateDateConstraintValue(payload)

          this.toDate = ''
        }
        // if enter is triggered with no value it should display blank
        // else it will set to the entered value
        if (!val.isEmpty) {
          this.fromDate = val.date
        } else {
          this.fromDate = ''
        }
        this.errTextTo = ''
      }
    },
    updateTo(val) {
      if (val) {
        const payload = {
          constraintId: this.model.id,
          fromDateValue: '',
          toDateValue: val.date,
          isUTC: false,
        }
        if (this.fromDate) {
          if (new Date(val.date) < new Date(this.fromDate)) {
            this.errTextTo = this.getText('MRI_PA_TIMERANGE_INVALID')
          } else {
            this.errTextTo = ''
            payload.fromDateValue = this.fromDate
            this.updateDateConstraintValue(payload)
          }
        } else {
          this.errTextTo = ''
          this.updateDateConstraintValue(payload)
          this.fromDate = ''
        }
        if (!val.isEmpty) {
          this.toDate = val.date
        } else {
          this.toDate = ''
        }
        this.errTextFrom = ''
      }
    },
  },
  components: {
    appDate,
  },
}
</script>
