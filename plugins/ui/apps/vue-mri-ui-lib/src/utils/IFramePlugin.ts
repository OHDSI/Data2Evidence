export class IFramePlugin {
  private iframeElement: HTMLIFrameElement

  constructor({ loadFn, src, name }: { loadFn: () => void; src: string; name: string }) {
    this.iframeElement = document.createElement('iframe')

    this.iframeElement.addEventListener('load', () => {
      ;(this.iframeElement.contentWindow as any).MRIPlugin = {
        events: {},
        utils: {},
      }
      loadFn()
    })

    this.iframeElement.src = src
    this.iframeElement.name = name
    this.iframeElement.className = 'iframe-container'
    ;(this.iframeElement as any).MRIPluginInstance = this
  }

  public publish(eventName: string, payload: any) {
    const mriEvent = new CustomEvent(eventName, { detail: payload })
    this.iframeElement.contentDocument.dispatchEvent(mriEvent)
  }

  public getIFrame(): HTMLIFrameElement {
    return this.iframeElement
  }
}
