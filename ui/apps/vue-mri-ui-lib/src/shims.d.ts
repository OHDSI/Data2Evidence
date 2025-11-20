declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'd3' {
  let d3: any
  export default d3
}

declare module '*.json' {
  const value: any
  export default value
}

interface Window {
  d2eListeners: {
    [key: string]: { type: string; app: string; listener: any }[]
  }
}
