import { config } from '@vue/test-utils'

HTMLCanvasElement.prototype.getContext = () => {
  // return whatever getContext has to return
}

// Configure Vue Test Utils to recognize d4l custom elements
config.global.config = {
  compilerOptions: {
    isCustomElement: tag => tag.startsWith('d4l-')
  }
}

// Suppress Vue warnings in tests
config.global.config.warnHandler = () => null
config.global.config.errorHandler = () => null
