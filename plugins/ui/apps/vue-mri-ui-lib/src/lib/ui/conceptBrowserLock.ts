/**
 * Serialises opening of the terminology overlay across every tag input on the page.
 *
 * One overlay exists per page, so the lock has to be shared by all
 * app-tag-input instances. Two "+" buttons on one filter card are two component instances,
 * so a per-instance flag would not close the window.
 *
 * The window exists because opening awaits vocabulary lookups before dispatching
 * 'alp-terminology-open', and nothing is on screen during that await to swallow clicks. A
 * second dispatch arriving while the overlay is already open is mishandled downstream: the
 * terminology listener swaps its props without remounting, so the overlay keeps the first
 * attribute's pre-selection but adopts the second attribute's onClose, and picks land on the
 * wrong constraint.
 *
 */
type Listener = (opening: boolean) => void

let opening = false
const listeners = new Set<Listener>()

export const isConceptBrowserOpening = (): boolean => opening

export const setConceptBrowserOpening = (value: boolean): void => {
  if (opening === value) {
    return
  }
  opening = value
  listeners.forEach(listener => listener(value))
}

/** Subscribe to lock changes. Returns the unsubscribe function. */
export const onConceptBrowserOpeningChange = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
