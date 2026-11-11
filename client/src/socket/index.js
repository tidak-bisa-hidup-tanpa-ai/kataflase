import { io } from 'socket.io-client'
import { SERVER_URL } from '../constant/url'

// Satu koneksi untuk seluruh aplikasi. GameProvider yang memanggil connect().
export const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
})
