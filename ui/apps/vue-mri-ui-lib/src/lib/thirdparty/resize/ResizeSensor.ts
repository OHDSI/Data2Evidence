// tslint:disable
/**
 * Copyright Marc J. Schmidt. See the LICENSE file at the top-level
 * directory of this distribution and at
 * https://github.com/marcj/css-element-queries/blob/master/LICENSE.
 */

// Only used for the dirty checking, so the event callback count is limited to max 1 call per fps per sensor.
// In combination with the event based resize sensor this saves cpu time, because the sensor is too fast and
// would generate too many unnecessary events.
// var window = <any>window;
// var requestAnimationFrame = window.requestAnimationFrame ||
//   window.mozRequestAnimationFrame ||
//   window.webkitRequestAnimationFrame ||
//   function (fn) {
//     return setTimeout(fn, 20);
//   };

const requestAnimationFrame = fn => setTimeout(fn, 20)

/**
 * Iterate over each of the provided element(s).
 *
 * @param {HTMLElement|HTMLElement[]} elements
 * @param {Function}                  callback
 */
function forEachElement(elements, callback) {
  const elementsType = Object.prototype.toString.call(elements)
  const isCollectionTyped =
    '[object Array]' === elementsType ||
    '[object NodeList]' === elementsType ||
    '[object HTMLCollection]' === elementsType ||
    '[object Object]' === elementsType
  // || ('undefined' !== typeof jQuery && elements instanceof jQuery) //jquery
  // || ('undefined' !== typeof Elements && elements instanceof Elements) //mootools
  let i = 0
  const j = elements.length
  if (isCollectionTyped) {
    for (; i < j; i += 1) {
      callback(elements[i])
    }
  } else {
    callback(elements)
  }
}

/**
 * Class for dimension change detection.
 *
 * @param {Element|Element[]|Elements|jQuery} element
 * @param {Function} callback
 *
 * @constructor
 */

function ResizeSensor(element, callback) {
  /**
   *
   * @constructor
   */
  function EventQueue() {
    let q = []
    this.add = function (ev) {
      q.push(ev)
    }

    let i
    let j
    this.call = function () {
      for (i = 0, j = q.length; i < j; i++) {
        q[i].call()
      }
    }

    this.remove = function (ev) {
      const newQueue = []
      for (i = 0, j = q.length; i < j; i++) {
        if (q[i] !== ev) newQueue.push(q[i])
      }
      q = newQueue
    }

    this.length = function () {
      return q.length
    }
  }

  /**
   *
   * @param {HTMLElement} element
   * @param {Function}    resized
   */
  function attachResizeEvent(element, resized) {
    if (!element) return
    if (element.resizedAttached) {
      element.resizedAttached.add(resized)
      return
    }

    element.resizedAttached = new EventQueue()
    element.resizedAttached.add(resized)

    element.resizeSensor = document.createElement('div')
    element.resizeSensor.className = 'resize-sensor'
    const style =
      'position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: auto; z-index: -1; visibility: hidden;'
    const styleChild = 'position: absolute; left: 0; top: 0; transition: 0s;'

    element.resizeSensor.style.cssText = style
    element.resizeSensor.innerHTML =
      '<div class="resize-sensor-expand" style="' +
      style +
      '">' +
      '<div style="' +
      styleChild +
      '"></div>' +
      '</div>' +
      '<div class="resize-sensor-shrink" style="' +
      style +
      '">' +
      '<div style="' +
      styleChild +
      ' width: 200%; height: 200%"></div>' +
      '</div>'
    element.appendChild(element.resizeSensor)

    if (element.resizeSensor.offsetParent !== element) {
      element.style.position = 'relative'
    }

    const expand = element.resizeSensor.childNodes[0]
    const expandChild = expand.childNodes[0]
    const shrink = element.resizeSensor.childNodes[1]
    let dirty, rafId, newWidth, newHeight
    let lastWidth = element.offsetWidth
    let lastHeight = element.offsetHeight

    const reset = function () {
      expandChild.style.width = '100000px'
      expandChild.style.height = '100000px'

      expand.scrollLeft = 100000
      expand.scrollTop = 100000

      shrink.scrollLeft = 100000
      shrink.scrollTop = 100000
    }

    reset()

    const onResized = function () {
      rafId = 0

      if (!dirty) return

      lastWidth = newWidth
      lastHeight = newHeight

      if (element.resizedAttached) {
        element.resizedAttached.call()
      }
    }

    const onScroll = function () {
      newWidth = element.offsetWidth
      newHeight = element.offsetHeight
      dirty = newWidth !== lastWidth || newHeight !== lastHeight

      if (dirty && !rafId) {
        rafId = requestAnimationFrame(onResized)
      }

      reset()
    }

    const addEvent = function (el, name, cb) {
      if (el.attachEvent) {
        el.attachEvent('on' + name, cb)
      } else {
        el.addEventListener(name, cb)
      }
    }

    addEvent(expand, 'scroll', onScroll)
    addEvent(shrink, 'scroll', onScroll)
  }

  forEachElement(element, function (elem) {
    attachResizeEvent(elem, callback)
  })

  // this.detach = function(ev) {
  //   ResizeSensor.detach(element, ev);
  // };
}

ResizeSensor.prototype.detach = function (element, ev) {
  forEachElement(element, function (elem) {
    if (!elem) return
    if (elem.resizedAttached && typeof ev === 'function') {
      elem.resizedAttached.remove(ev)
      if (elem.resizedAttached.length()) return
    }
    if (elem.resizeSensor) {
      if (elem.contains(elem.resizeSensor)) {
        elem.removeChild(elem.resizeSensor)
      }
      delete elem.resizeSensor
      delete elem.resizedAttached
    }
  })
}

export default ResizeSensor
