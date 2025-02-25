<template>
  <div class="app-date form-group">
    <app-label :text="text"></app-label>
    <span class="errortext" v-if="!isValid || errMsg">{{ errMsg }}</span>
    <div
      class="d-flex form-control form-control-sm date-container"
      :class="{ invalidDate: !isValid || errMsg, MriHilite: isActive }"
    >
      <input
        tabindex="0"
        class="mr-auto"
        :placeholder="placeholder"
        v-model="inputDate"
        @keyup.enter="onKeyEnter"
        @focus="onFocus"
        @blur="onBlur"
      />
      <div ref="calendarButton" class="app-date-icon" @click="openCalendar">
        <appIcon icon="calendar"></appIcon>
      </div>
      <div class="modal-mask" v-if="showCalendar" @mousedown="closeCalendar">
        <div class="modal-container" :style="getStyles()" @mousedown.prevent>
          <datetime-picker
            ref="datepicker"
            v-model="inputDate"
            :placeholder="placeholder"
            :config="mergedConfig"
            @dp-change="onDateChange"
          ></datetime-picker>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { mapGetters } from 'vuex'
import moment from 'moment'
import DateUtils from '../../utils/DateUtils'
import appIcon from './app-icon.vue'
import appLabel from './app-label.vue'

export default {
  name: 'app-date',
  props: ['date', 'config', 'text', 'placeholder', 'datetype', 'errMsg'],
  data() {
    return {
      // Initial value
      isValid: true,
      defaultConfig: {
        inline: true, // do not show the input field
        format: 'YYYY-MM-DD',
      },
      showCalendar: false, // default to false as to not show calendar,
      isActive: false,
      tempDate: null,
    }
  },
  computed: {
    ...mapGetters(['getText']),
    mergedConfig() {
      return { ...this.defaultConfig, ...this.config }
    },
    inputDate: {
      get() {
        if (this.date instanceof Date && !isNaN(this.date)) {
          return moment(this.date).format(this.config.format)
        } else {
          if (!this.isActive && DateUtils.isDate(this.date)) {
            return moment(this.date).format(this.config.format)
          } else {
            return this.date
          }
        }
      },
      set(value) {
        this.date = value
      },
    },
  },
  methods: {
    onFocus() {
      this.isActive = true
      this.tempDate = this.date
    },
    onBlur() {
      this.isActive = false
      if (DateUtils.isDifferent(this.tempDate, this.date)) {
        this.commitDate(this.date)
      }
    },
    // triggered when user press enter
    onKeyEnter(val) {
      const dateVal = val.srcElement.value
      this.commitDate(dateVal)
    },
    commitDate(dateVal) {
      if (dateVal === '') {
        this.isValid = true
        this.$emit('update', { date: '', isEmpty: true })
      } else {
        const momentDate = moment(dateVal)
        if (momentDate.isValid()) {
          this.isValid = true
          this.date = momentDate.toDate()
          this.$emit('update', { date: this.date, isEmpty: false })
        } else {
          this.isValid = false
          this.errMsg = this.getText('MRI_PA_INVALID_DATE')
          this.date = dateVal
        }
      }
    },

    // triggered on date picker selection
    onDateChange(val) {
      const dOldDate = new Date(val.oldDate)
      const dDate = new Date(val.date)
      if (
        DateUtils.displayFormat(dOldDate, this.config.format) !== DateUtils.displayFormat(dDate, this.config.format)
      ) {
        this.isValid = true
        this.$emit('update', { date: val.date.toDate(), isEmpty: false })
      }
    },
    openCalendar() {
      this.showCalendar = true
    },
    closeCalendar() {
      this.showCalendar = false
    },
    getStyles() {
      const calendarHeight = 250
      // Changed x and y to left and top since IE does not have x and y in getBoundingCliendRect
      const calendarIconX = this.$refs.calendarButton.getBoundingClientRect().left
      const calendarIconY = this.$refs.calendarButton.getBoundingClientRect().top

      const totalHeight = window.innerHeight - 46
      const remainingHeight = totalHeight - calendarIconY
      const calendarIconHeight = this.$refs.calendarButton.getBoundingClientRect().height

      // -50 (in the rest of the code) below is to position the picker correctly
      const left = calendarIconX - 50
      if (remainingHeight >= calendarHeight) {
        // show below the calendar icon
        return {
          left: left + 'px',
          top: calendarIconHeight + calendarIconY - 20 + 'px',
        }
      } else {
        // show above the calendar icon
        return {
          left: calendarIconX - 50 + 'px',
          top: calendarIconY - 250 - 20 + 'px',
        }
      }
    },
  },
  components: {
    appIcon,
    appLabel,
  },
}
</script>
