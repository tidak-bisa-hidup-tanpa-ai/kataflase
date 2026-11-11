import { NICKNAME_MAX } from '../constant/game'

export function playerName(room, playerId) {
  return (
    room?.players?.find((p) => p.id === playerId)?.nickname ?? 'Pemain'
  )
}

// Urutan bergabung, dipakai untuk warna avatar yang konsisten.
export function playerIndex(room, playerId) {
  const sorted = [...(room?.players ?? [])].sort(
    (a, b) => (a.joinOrder ?? 0) - (b.joinOrder ?? 0),
  )
  return Math.max(0, sorted.findIndex((p) => p.id === playerId))
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Menerima array [{ playerId, [key] }] atau objek { [playerId]: value }.
export function toMap(source, key) {
  const map = new Map()
  if (Array.isArray(source)) {
    source.forEach((item) => map.set(item.playerId, item[key]))
  } else if (source && typeof source === 'object') {
    Object.entries(source).forEach(([id, value]) => map.set(id, value))
  }
  return map
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
