// Token sesi disimpan per tab (sessionStorage) sesuai ADR.
// Nickname terakhir disimpan di localStorage hanya untuk kenyamanan.
const SESSION_KEY = 'kataflase.session'
const NICKNAME_KEY = 'kataflase.nickname'

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.code && parsed?.playerId && parsed?.token) return parsed
    return null
  } catch {
    return null
  }
}

export function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Storage tidak tersedia (mode privat); sesi tetap berjalan di memori.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // abaikan
  }
}

export function loadNickname() {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveNickname(nickname) {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname)
  } catch {
    // abaikan
  }
}
