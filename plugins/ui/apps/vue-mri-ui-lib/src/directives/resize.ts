import { debounce } from 'underscore'
import ResizeSensor from '../lib/thirdparty/resize/ResizeSensor'

export default {
  inserted(el, { value }: { value?: (element) => void }) {
    if (!value) {
      return
    }
    ResizeSensor(
      el,
      debounce(() => value(el), 300)
    )
  },
}
