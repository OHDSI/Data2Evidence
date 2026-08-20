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
      noClickAnimation: true, // no bouncing animation when clicking outside of persistent dialog
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
