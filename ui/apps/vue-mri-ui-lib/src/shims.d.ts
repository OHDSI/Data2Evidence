declare module 'vue' {
  import { CompatVue } from '@vue/runtime-dom'
  const Vue: CompatVue
  export default Vue
  export * from '@vue/runtime-dom'
  const { configureCompat } = Vue
  export { configureCompat }
}

declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}

declare module 'd3' {
  let d3: any
  export default d3
}
