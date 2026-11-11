export const toastEvents = new EventTarget()

export function toast(text, type = 'info') {
  toastEvents.dispatchEvent(new CustomEvent('toast', { detail: { text, type } }))
}
