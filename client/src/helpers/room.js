import { NICKNAME_MAX } from '../constant/game'

export function playerName(room, playerId) {
  return (
    room?.players?.find((p) => p.playerId === playerId)?.nickname ??
    room?.participants?.find((p) => p.playerId === playerId)?.nickname ?? 'Pemain'
  )
}

// Urutan bergabung, dipakai untuk warna avatar yang konsisten.
export function playerIndex(room, playerId) {
  return Math.max(0, (room?.players ?? []).findIndex((p) => p.playerId === playerId))
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Cek awal di client; keputusan akhir tetap di server.
export function containsWord(text, word) {
  const target = normalizeText(word)
  if (!target) return false
  return ` ${normalizeText(text)} `.includes(` ${target} `)
}

export function cleanNickname(value) {
  return value.trim().replace(/\s+/g, ' ')
}

export function isValidNickname(value) {
  const nickname = cleanNickname(value)
  return nickname.length >= 1 && nickname.length <= NICKNAME_MAX
}

export function cleanRoomCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
