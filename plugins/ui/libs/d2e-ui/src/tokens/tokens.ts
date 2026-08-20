export const tokens = {
  color: {
    primary: '#000080',
    primaryLight: '#333399',
    primaryLighter: '#999FCB',
    primaryLightest: '#CCCFE5',
    primaryXtraLightest: '#E5E6F2',
    primaryXXLightest: '#F8F8FF',
    secondary: '#FF5E59',
    neutralBlack: '#000000',
    neutral: '#595757',
    neutralLight: '#ACABA8',
    neutralLighter: '#DEDCDA',
    neutralXtraLightest: '#FAF8F8',
    success: '#00855F',
    successLight: '#E1FFF6',
    warning: '#F89C0E',
    // Figma has no red token on the dialog frames; #A3293D is the existing
    // feedback-error value in the app Vuetify theme. Replace once design
    // supplies an official danger token.
    danger: '#A3293D',
    textSecondary: '#00000099',
    white: '#FFFFFF',
  },
  spacing: { xxs: 4, xs: 8, xsS: 12, s: 16, m: 24 },
  radius: { sm: 4, md: 8, lg: 16 },
  font: {
    family:
      '"IBM Plex Sans Variable", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading4: { size: 24, weight: 600, lineHeight: 1.2, letterSpacing: '-2px' },
    heading5: { size: 18, weight: 600, lineHeight: 1.2, letterSpacing: '0' },
    subtitle1: { size: 16, weight: 600, lineHeight: 1.5, letterSpacing: '0' },
    subtitle2: { size: 14, weight: 600, lineHeight: 1.5, letterSpacing: '0' },
    body1: { size: 16, weight: 400, lineHeight: 1.5, letterSpacing: '0' },
    body2: { size: 14, weight: 400, lineHeight: 1.5, letterSpacing: '0' },
    caption1: { size: 12, weight: 400, lineHeight: 1.4, letterSpacing: '0' },
    button: { size: 16, weight: 500, lineHeight: '16px', letterSpacing: '0' },
  },
  elevation: {
    card: '0 0 10px rgba(0, 0, 0, 0.10)',
    e2: '0 3px 1px -2px rgba(0,0,0,0.20), 0 2px 2px 0 rgba(0,0,0,0.14), 0 1px 5px 0 rgba(0,0,0,0.12)',
    e16:
      '0 8px 10px -5px rgba(0,0,0,0.20), 0 16px 24px 2px rgba(0,0,0,0.14), 0 6px 30px 5px rgba(0,0,0,0.12)',
  },
} as const

export type D2eTokens = typeof tokens
