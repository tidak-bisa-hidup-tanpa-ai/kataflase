export const PHASES = {
  WAITING: 'WAITING',
  WORD_REVEAL: 'WORD_REVEAL',
  CLUE: 'CLUE',
  DISCUSSION: 'DISCUSSION',
  VOTING: 'VOTING',
  RESULT: 'RESULT',
}

export const ROUND_PHASES = new Set([
  PHASES.WORD_REVEAL,
  PHASES.CLUE,
  PHASES.DISCUSSION,
  PHASES.VOTING,
])

export const PHASE_INFO = {
  WAITING: {
    label: 'Lobby',
    hint: 'Ajak 4–12 pemain bergabung dengan kode room.',
  },
  WORD_REVEAL: {
    label: 'Kata Rahasia',
    hint: 'Hafalkan katamu. Satu pemain mendapat kata yang berbeda.',
  },
  CLUE: {
    label: 'Petunjuk',
    hint: 'Bergiliran beri satu petunjuk singkat tentang katamu.',
  },
  DISCUSSION: {
    label: 'Diskusi',
    hint: 'Baca semua petunjuk dan diskusikan siapa yang mencurigakan.',
  },
  VOTING: {
    label: 'Voting',
    hint: 'Pilih satu pemain yang kamu curigai sebagai impostor.',
  },
  RESULT: {
    label: 'Hasil',
    hint: '',
  },
}

export const MIN_PLAYERS = 4
export const MAX_PLAYERS = 12
export const NICKNAME_MAX = 16
export const ROOM_CODE_MAX = 8
export const CLUE_MAX = 30
export const CHAT_MAX = 200

export const RANDOM_CATEGORY = { id: 'random', label: 'Acak' }

// Nilai awal PRD; dipakai untuk bar waktu jika server tidak mengirim durasi.
export const PHASE_DURATIONS = {
  WORD_REVEAL: 10,
  CLUE: 30,
  DISCUSSION: 60,
  VOTING: 45,
}

export const ROUND_TABS = [
  { phase: PHASES.WORD_REVEAL, label: 'Kata' },
  { phase: PHASES.CLUE, label: 'Petunjuk' },
  { phase: PHASES.DISCUSSION, label: 'Diskusi' },
  { phase: PHASES.VOTING, label: 'Vote' },
]

export const AVATAR_COLORS = [
  'bg-flame text-ink',
  'bg-cobalt text-card',
  'bg-sun text-ink',
  'bg-ink text-card',
  'bg-mint text-ink',
  'bg-tangerine text-ink',
  'bg-flame/45 text-ink',
  'bg-cobalt/35 text-ink',
  'bg-sun/45 text-ink',
  'bg-muted text-card',
  'bg-mint/45 text-ink',
  'bg-tangerine/45 text-ink',
]
