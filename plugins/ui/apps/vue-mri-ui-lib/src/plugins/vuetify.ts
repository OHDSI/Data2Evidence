import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

/**
 * Vuetify Plugin Configuration
 * - Color palette aligned with CSS custom properties in src/styles/themes/_main.scss
 * - Typography matching Bootstrap variables in src/styles/_mri-bootstrap-variables.scss
 * - Component defaults matching existing component styles
 */
export default createVuetify({
  components,
  directives,

  // Theme configuration matching existing atlas and d2e themes
  theme: {
    defaultTheme: 'd2e',
    themes: {
      // D2E Theme - Production theme
      d2e: {
        dark: false,
        colors: {
          // Primary colors - matching --color-primary in theme-d2e
          primary: '#000080', // --color-primary
          'primary-darken-1': '#000066',
          'primary-lighten-1': '#339',

          // Secondary colors - matching --color-secondary
          secondary: '#ff5e59', // --color-secondary-soft-red
          'secondary-darken-1': '#e75248',
          'secondary-lighten-1': '#ffa19d',

          // Tertiary
          tertiary: '#ffd2c3',

          // Semantic colors matching Bootstrap variables
          success: '#28a745', // $green from Bootstrap
          info: '#17a2b8', // $cyan from Bootstrap
          warning: '#ffc107', // $yellow from Bootstrap
          error: '#dc3545', // $red from Bootstrap / --color-mri-error

          // Feedback colors
          'feedback-success': '#00855f',
          'feedback-warning': '#f89c0e',
          'feedback-error': '#a3293d',
          'feedback-alarm': '#d53939',

          // Neutral colors
          background: '#ffffff', // --color-ui-lightest-bg
          surface: '#f9f9f9', // --color-ui-extra-light-bg
          'surface-variant': '#e5e5e5', // --color-ui-light-bg

          // Text colors
          'on-primary': '#ffffff',
          'on-secondary': '#ffffff',
          'on-background': '#000080', // --color-ui-darkest-text
          'on-surface': '#000080', // --color-ui-dark-text

          // Additional custom colors matching theme
          'mri-brand': '#000080',
          'mri-brand-hover': '#007eba',
          'mri-info': '#007cc0',
          'mri-contrast': '#000080',

          // Border colors
          'border-color': '#dee2e6', // $gray-300 from Bootstrap
          'border-light': '#dddddd', // --color-ui-light-border
          'border-medium': '#cccccc', // --color-ui-medium-border
        },
      },

      // Atlas Theme - Local development theme
      atlas: {
        dark: false,
        colors: {
          // Primary colors - matching --color-primary in theme-atlas
          primary: '#1f425a', // --color-primary
          'primary-darken-1': '#163242',
          'primary-lighten-1': '#336b91', // --color-primary-light
          'primary-lighten-2': '#638baa', // --color-primary-lighter
          'primary-lighten-3': '#9dbcd5', // --color-primary-lightest
          'primary-lighten-4': '#def0ff', // --color-primary-extra-lightest

          // Secondary colors
          secondary: '#336b91', // --color-secondary
          'secondary-darken-1': '#2a5675',
          'secondary-lighten-1': '#408eb8', // --color-secondary-light
          'secondary-lighten-2': '#54a9cd', // --color-secondary-lighter
          'secondary-lighten-3': '#8acbe1', // --color-secondary-lightest
          'secondary-lighten-4': '#e2f3f8', // --color-secondary-extra-lightest

          // Tertiary
          tertiary: '#69aed5', // --color-tertiary
          'tertiary-lighten-1': '#90c4e1',
          'tertiary-lighten-2': '#badbed',
          'tertiary-lighten-3': '#e3f1f7',

          // Support colors
          success: '#11a08a', // --color-support-green
          'success-lighten-1': '#53bead',
          'success-lighten-2': '#b4e2db',
          'success-lighten-3': '#e1f3f1',

          warning: '#fbc511', // --color-support-yellow
          'warning-lighten-1': '#fddc7c',
          'warning-lighten-2': '#feeaaf',
          'warning-lighten-3': '#fff7e0',

          error: '#fe5e59', // --color-support-soft-red
          'error-darken-1': '#a3293d', // --color-feedback-error

          info: '#69aed5', // --color-tertiary

          // Feedback colors
          'feedback-success': '#00855f',
          'feedback-warning': '#f89c0e',
          'feedback-error': '#a3293d',
          'feedback-alarm': '#d53939',

          // Neutral colors
          background: '#ffffff', // --color-white
          surface: '#f2f0f1', // --color-neutral-lightest
          'surface-variant': '#faf8f8', // --color-neutral-extra-lightest

          // Text colors
          'on-primary': '#ffffff',
          'on-secondary': '#ffffff',
          'on-background': '#1f425a', // --color-ui-darkest-text
          'on-surface': '#595757', // --color-neutral

          // Additional custom colors
          'mri-brand': '#1f425a',
          'mri-brand-hover': '#007eba',
          'mri-info': '#007cc0',
          'mri-contrast': '#1f425a',

          // Border colors
          'border-color': '#dee2e6',
          'border-light': '#dddddd',
          'border-medium': '#cccccc',
        },
      },
    },
  },

  // Typography defaults matching Bootstrap variables
  defaults: {
    global: {
      ripple: true,
    },

    // Button defaults matching existing button styles
    VBtn: {
      variant: 'flat',
      color: 'primary',
      rounded: '6px', // Matches $border-radius: 0.25rem
      elevation: 0, // Matches $enable-shadows: false
      style: {},
    },

    // Card defaults matching existing dialog/card styles
    VCard: {
      elevation: 2,
      rounded: 'sm', // Matches $border-radius: 0.25rem
      variant: 'elevated',
    },

    VCardTitle: {
      style: {
        fontSize: '1rem',
        fontWeight: 500, // Matches $headings-font-weight
        padding: '16px 24px',
      },
    },

    VCardText: {
      style: {
        padding: '16px 24px',
        fontSize: '0.875rem', // Matches $font-size-base
      },
    },

    // Dialog defaults matching existing modal styles
    VDialog: {
      maxWidth: 600,
      rounded: 'sm',
    },

    // Data table defaults
    VDataTable: {
      density: 'default',
      itemsPerPage: 10,
      style: {
        fontSize: '0.875rem',
      },
    },

    // Text field defaults matching form styles
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
      style: {
        fontSize: '0.875rem',
      },
    },

    // Select defaults
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
    },

    // Checkbox defaults
    VCheckbox: {
      color: 'primary',
      density: 'comfortable',
    },

    // Tooltip defaults
    VTooltip: {
      location: 'top',
    },
  },

  // Display configuration
  display: {
    mobileBreakpoint: 'sm',
    thresholds: {
      xs: 0,
      sm: 576, // Matches Bootstrap $grid-breakpoints
      md: 768,
      lg: 992,
      xl: 1200,
    },
  },
})
