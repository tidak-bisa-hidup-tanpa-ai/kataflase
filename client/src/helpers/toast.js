import Toastify from 'toastify-js'

const COLORS = {
  info: 'var(--toast-info, #1c1b3f)',
  success: 'var(--toast-success, #3d5bf2)',
  error: 'var(--toast-error, #d94a6f)',
}

export function toast(text, type = 'info') {
  Toastify({
    text,
    duration: 3000,
    gravity: 'top',
    position: 'center',
    stopOnFocus: true,
    style: {
      background: COLORS[type] ?? COLORS.info,
      borderRadius: '12px',
      border: '2px solid var(--color-ink)',
      boxShadow: '3px 3px 0 var(--color-ink)',
      fontWeight: '600',
      fontFamily: 'inherit',
      fontSize: '15px',
      maxWidth: 'calc(100vw - 32px)',
    },
  }).showToast()
}
