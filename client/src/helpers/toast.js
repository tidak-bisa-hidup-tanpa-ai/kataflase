import Toastify from 'toastify-js'

const COLORS = {
  info: '#1c1b3f',
  success: '#3d5bf2',
  error: '#d94a6f',
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
      border: '2px solid #1c1b3f',
      boxShadow: '3px 3px 0 #1c1b3f',
      fontWeight: '600',
      fontFamily: 'inherit',
      fontSize: '15px',
      maxWidth: 'calc(100vw - 32px)',
    },
  }).showToast()
}
