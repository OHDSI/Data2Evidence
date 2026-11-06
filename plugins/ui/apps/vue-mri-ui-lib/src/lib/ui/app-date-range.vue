<template>
  <div class="app-date-range">
    <D2eDatePicker
      :model-value="toPickerDate(fromDate, dateControlConfig.format)"
      :label="getText('MRI_PA_DATE_FROM_LABEL')"
      :format="dateControlConfig.format"
      :placeholder="dateFormatPlaceholder"
      :error-messages="errTextFrom || undefined"
      :invalid-date-text="getText('MRI_PA_INVALID_DATE')"
      clearable
      @update:model-value="updateFrom(toDateUpdate($event))"
    />
    <D2eDatePicker
      :model-value="toPickerDate(toDate, dateControlConfig.format)"
      :label="getText('MRI_PA_DATE_TO_LABEL')"
      :format="dateControlConfig.format"
      :placeholder="dateFormatPlaceholder"
      :error-messages="errTextTo || undefined"
      :invalid-date-text="getText('MRI_PA_INVALID_DATE')"
      clearable
      @update:model-value="updateTo(toDateUpdate($event))"
    />
  </div>
</template>
<script lang="ts">
import { mapGetters, mapActions } from 'vuex'
import DateUtils from '../../utils/DateUtils'
import { D2eDatePicker } from '@d2e/ui'
import { toDateUpdate, toPickerDate } from '../../utils/datePickerValue'
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
        return `e.g., ${formattedExample}`
      } catch (error) {
        console.warn('Could not access MRI frontend config for date format, using default:', error)
        return 'e.g., 2025-09-30'
      }
    },
  },
  methods: {
    ...mapActions(['updateDateConstraintValue']),
    toPickerDate,
    toDateUpdate,

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
    D2eDatePicker,
  },
}
</script>
