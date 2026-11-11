// Kode penolakan dari ACK server ({ ok: false, error: { code, message } }).
// Pesan server dipakai jika kodenya tidak dikenal di sini.
export const ERROR_MESSAGES = {
  NETWORK: 'Tidak bisa terhubung ke server. Coba lagi sebentar.',
  TIMEOUT: 'Server tidak merespons. Coba lagi.',
  SESSION_EXPIRED: 'Sesi kamu sudah berakhir.',
  INVALID_SESSION: 'Sesi kamu tidak valid lagi.',
  NOT_IN_ROOM: 'Kamu bukan anggota room ini lagi.',
  ROOM_NOT_FOUND: 'Room tidak ditemukan. Periksa lagi kodenya.',
  ROOM_FULL: 'Room sudah penuh (maksimal 6 pemain).',
  ROUND_IN_PROGRESS: 'Ronde sedang berjalan. Coba lagi saat room kembali ke lobby.',
  ALREADY_IN_ROOM: 'Kamu masih terhubung ke room. Keluar dulu sebelum bergabung lagi.',
  INVALID_ROOM_CODE: 'Kode room tidak valid.',
  INVALID_NICKNAME: 'Nickname tidak valid.',
  NICKNAME_TAKEN: 'Nickname sudah dipakai di room ini.',
  HOST_ONLY: 'Hanya host yang bisa melakukan ini.',
  PLAYERS_NOT_READY: 'Butuh 3–6 pemain dan semuanya harus online untuk mulai.',
  ALREADY_STARTING: 'Ronde sedang disiapkan.',
  START_CANCELLED: 'Susunan pemain berubah, mulai dibatalkan. Coba lagi.',
  INVALID_CATEGORY: 'Kategori tidak dikenal.',
  INVALID_PHASE: 'Aksi ini tidak tersedia di fase sekarang.',
  INVALID_ROUND: 'Ronde sudah berganti.',
  NOT_A_PARTICIPANT: 'Kamu tidak ikut ronde ini.',
  NOT_YOUR_TURN: 'Belum giliranmu.',
  ALREADY_SUBMITTED: 'Kamu sudah mengirim petunjuk.',
  INVALID_CLUE: 'Petunjuk tidak valid.',
  CLUE_CONTAINS_WORD: 'Petunjuk tidak boleh menyebut katamu sendiri.',
  INVALID_MESSAGE: 'Pesan tidak valid.',
  INVALID_TARGET: 'Pilihan tidak valid.',
  CANNOT_VOTE_SELF: 'Kamu tidak bisa memilih dirimu sendiri.',
  ALREADY_VOTED: 'Kamu sudah memilih.',
  ACTION_EXPIRED: 'Waktu untuk aksi ini sudah habis.',
}

const EXPIRED_CODES = new Set([
  'SESSION_EXPIRED',
  'INVALID_SESSION',
  'NOT_IN_ROOM',
  'ROOM_NOT_FOUND',
])

export function isExpiredCode(code) {
  return EXPIRED_CODES.has(code)
}

export function errorMessage(result) {
  return (
    ERROR_MESSAGES[result?.code] ??
    result?.message ??
    'Terjadi kesalahan. Coba lagi.'
  )
}
