/**
 * Helper function adding support for web components rich data props and
 * custom events in React.
 *
 * Ref. https://custom-elements-everywhere.com/
 * This might also interest you: https://github.com/facebook/react/issues/11347
 *
 * @param {*} props component properties
 * @param {*} customEvents component events
 *
 * Example usage:
 *
 * <d4l-button text="Test"
 *   ref={webComponentWrapper({
 *     handleClick: () => alert('test'),
 *   })}
 * />
 */

// todo by Burtchen - proper typing is a medium amount of work so I removed types

class WebComponentWrapper {
  constructor(props, customEvents) {
    Object.assign(this, { props, customEvents });
    return this.ref.bind(this);
  }

  ref(element) {
    if (element) {
      this.element = element;
      this.addProps();
      this.forEachCustomEvent((eventName, handler) =>
        element.addEventListener(eventName, handler)
      );
      return element;
    }

    if (this.element) {
      this.forEachCustomEvent((eventName, handler) =>
        this.element.removeEventListener(eventName, handler)
      );
    }

    return this.element;
  }

  addProps() {
    const { props, element } = this;
    Object.keys(props).forEach((key) => {
      element[key] = props[key];
    });
  }

  forEachCustomEvent(cb) {
    const { customEvents } = this;
    Object.keys(customEvents)
      .filter((key) => typeof customEvents[key] === "function")
      .forEach((key) => cb(key, customEvents[key]));
  }
}

export default (props = {}, customEvents = {}) =>
  new WebComponentWrapper(props, customEvents);
