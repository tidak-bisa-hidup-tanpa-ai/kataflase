// Kode penolakan dari ACK server ({ ok: false, code, message }).
// Pesan server dipakai jika kodenya tidak dikenal di sini.
export const ERROR_MESSAGES = {
  NETWORK: 'Tidak bisa terhubung ke server. Coba lagi sebentar.',
  TIMEOUT: 'Server tidak merespons. Coba lagi.',
  SESSION_EXPIRED: 'Sesi kamu sudah berakhir.',
  INVALID_SESSION: 'Sesi kamu tidak valid lagi.',
  NOT_IN_ROOM: 'Kamu bukan anggota room ini lagi.',
  ROOM_NOT_FOUND: 'Room tidak ditemukan. Periksa lagi kodenya.',
  ROOM_FULL: 'Room sudah penuh (maksimal 12 pemain).',
  GAME_IN_PROGRESS: 'Ronde sedang berjalan. Coba lagi saat room kembali ke lobby.',
  INVALID_NICKNAME: 'Nickname tidak valid.',
  NICKNAME_TAKEN: 'Nickname sudah dipakai di room ini.',
  NOT_HOST: 'Hanya host yang bisa melakukan ini.',
  NOT_ENOUGH_PLAYERS: 'Butuh 4–12 pemain untuk mulai.',
  PLAYERS_OFFLINE: 'Semua pemain harus online untuk mulai.',
  ALREADY_STARTING: 'Ronde sedang disiapkan.',
  START_CANCELLED: 'Susunan pemain berubah, mulai dibatalkan. Coba lagi.',
  INVALID_CATEGORY: 'Kategori tidak dikenal.',
  WRONG_PHASE: 'Aksi ini tidak tersedia di fase sekarang.',
  STALE_ROUND: 'Ronde sudah berganti.',
  NOT_PARTICIPANT: 'Kamu tidak ikut ronde ini.',
  NOT_YOUR_TURN: 'Belum giliranmu.',
  ALREADY_SUBMITTED: 'Kamu sudah mengirim petunjuk.',
  INVALID_CLUE: 'Petunjuk tidak valid.',
  CLUE_CONTAINS_WORD: 'Petunjuk tidak boleh menyebut katamu sendiri.',
  INVALID_MESSAGE: 'Pesan tidak valid.',
  INVALID_TARGET: 'Pilihan tidak valid.',
  SELF_VOTE: 'Kamu tidak bisa memilih dirimu sendiri.',
  ALREADY_VOTED: 'Kamu sudah memilih.',
  VOTING_CLOSED: 'Waktu voting sudah habis.',
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
