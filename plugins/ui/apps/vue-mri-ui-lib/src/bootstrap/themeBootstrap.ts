import '../styles/themes/_main.scss'
import { applyTheme } from '../utils/ThemeManager'

export const applyAppTheme = (theme: 'atlas' | 'd2e') => {
  applyTheme(theme)
}
