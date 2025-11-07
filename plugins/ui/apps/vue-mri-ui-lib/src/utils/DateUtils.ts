/* global sap */
declare var sap: any

import moment from 'moment'

const ui5Utils = sap.ui.require('/hc/mri/pa/ui/Utils')

const isISOFormat = dString => {
  if (typeof dString === 'string') {
    return (
      moment(dString, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true).isValid() ||
      moment(dString, 'YYYY-MM-DDTHH:mm:ss', true).isValid()
    )
  } else {
    return false
  }
}

const isYYYYMMDD = dString => {
  if (typeof dString === 'string') {
    return moment(dString, 'YYYY-MM-DD', true).isValid()
  } else {
    return false
  }
}

const isDate = value => {
  if (value instanceof Date) {
    return !isNaN(Number(value))
  } else if (isISOFormat(value) || isYYYYMMDD(value)) {
    return true
  } else {
    return false
  }
}

const isDifferent = (date1, date2) => {
  let dDate1 = date1
  let dDate2 = date2
  if (isDate(dDate1)) {
    dDate1 = new Date(dDate1).getTime()
  }
  if (isDate(dDate2)) {
    dDate2 = new Date(dDate2).getTime()
  }
  return dDate1 !== dDate2
}

/**
 * Prepare the given datetime (local timezone) as UTC before it is converted to UTC.
 * Example
 * @param   {Date} dDate = Thu Feb 28 2019 00:00:00 GMT+0800 (Singapore Standard Time)
 * @returns {Date}         Thu Feb 28 2019 08:00:00 GMT+0800 (Singapore Standard Time)
 * This result will then be used in JSON.stringify which the final result is 2019-02-28T00:00:00.000Z
 */
const toUTCDate = dDate => {
  if (dDate instanceof Date && !isNaN(dDate.getTime())) {
    const offset = dDate.getTimezoneOffset() * 60000
    return new Date(dDate.getTime() - offset)
  }
  return dDate
}

/**
 * Prepare the given ISO date string or datetime (UTC) and add with the timezone offset.
 * Example #1
 * @param   {string} value = 2019-02-28T00:00:00.000Z
 * @returns {Date}           Thu Feb 28 2019 00:00:00 GMT+0800 (Singapore Standard Time)
 * Example #2
 * @param   {Date} value   = Thu Feb 28 2019 08:00:00 GMT+0800 (Singapore Standard Time)
 * @returns {Date}           Thu Feb 28 2019 00:00:00 GMT+0800 (Singapore Standard Time)
 */
const toLocalDate = value => {
  let localTime = null
  if (isISOFormat(value)) {
    localTime = moment(value).toDate()
  } else if (value instanceof Date && !isNaN(value.getTime())) {
    localTime = value
  }
  if (localTime) {
    const offset = localTime.getTimezoneOffset() * 60000
    return new Date(localTime.getTime() + offset)
  }
  return value
}

const toStartOfDay = dDate => {
  if (isDate(dDate)) {
    return moment(dDate).startOf('day').toDate()
  }
  return dDate
}

const toEndOfDay = dDate => {
  if (isDate(dDate)) {
    return moment(dDate).endOf('day').toDate()
  }
  return dDate
}

export default {
  ...ui5Utils,
  /**
   * Creates a new date object based on an input date object. The new date object has the following property:
   * calling toUTCString on the new date would give the same value as calling toString on the initial date (except the time zone)
   * Of course, this changes the absolute value. To be used carefully.
   * @param   {Date} dDate The date to be used
   * @returns {Date} A new (modified) Date object or the initial (unmodified) object if the input is not a valid date object
   */
  localToUtc: dDate => {
    if (dDate instanceof Date && !isNaN(dDate.getTime())) {
      const offset = dDate.getTimezoneOffset() * 60000
      return new Date(dDate.getTime() - offset)
    }
    return dDate
  },
  parseISODate: dDate => {
    return new Date(dDate)
  },
  displayDateFormat: dDate => {
    if (dDate instanceof Date && !isNaN(dDate.getTime())) {
      //    return dDate.toLocaleDateString();
      const offset = dDate.getTimezoneOffset() * 60000
      return new Date(dDate.getTime() - offset).toISOString().slice(0, 10)
    }
    return dDate
  },
  displayDateTimeFormat: dDate => {
    if (dDate instanceof Date && !isNaN(dDate.getTime())) {
      // return dDate.toLocaleDateString() + " " +  dDate.toLocaleTimeString()
      const offset = dDate.getTimezoneOffset() * 60000
      return (
        new Date(dDate.getTime() - offset).toISOString().slice(0, 10) +
        ' ' +
        new Date(dDate.getTime()).toISOString().slice(11, 19)
      )
    }
    return dDate
  },
  displayFormat: (dDate, format) => {
    if (dDate instanceof Date && !isNaN(dDate.getTime())) {
      if (format === 'YYYY-MM-DD') {
        const offset = dDate.getTimezoneOffset() * 60000
        return new Date(dDate.getTime() - offset).toISOString().slice(0, 10)
      } else if (format === 'YYYY-MM-DD HH:mm:ss') {
        const offset = dDate.getTimezoneOffset() * 60000
        return (
          new Date(dDate.getTime() - offset).toISOString().slice(0, 10) +
          ' ' +
          new Date(dDate.getTime() - offset).toISOString().slice(11, 19)
        )
      }
    }
    return dDate
  },
  displayBookmarkDateFormat: (s: string) => {
    if (isISOFormat(s)) {
      const date = new Date(s)
      const day = date.getDate()
      const month = date.toLocaleString('default', { month: 'short' })
      const year = date.getFullYear()
      return day + ' ' + month + ' ' + year
    } else {
      return ''
    }
  },
  displayBookmarkTimeFormat: (s: string) => {
    if (isISOFormat(s)) {
      const timeString = s.split('T')[1]
      return timeString.slice(0, 5)
    } else {
      return ''
    }
  },
  toUTCEndOfDay: dDate => {
    if (dDate instanceof Date && !isNaN(dDate.getTime())) {
      dDate.setUTCHours(23)
      dDate.setUTCMinutes(59)
      dDate.setUTCSeconds(59)
      dDate.setUTCMilliseconds(999)
    }
    return dDate
  },
  toStartOfDay,
  toEndOfDay,
  toLocalDate,
  toUTCDate,
  isISOFormat,
  isYYYYMMDD,
  isDate,
  isDifferent,
}
