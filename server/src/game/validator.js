/**
 * validator.js
 * Modul validasi aturan permainan Kataflase.
 *
 * Bertanggung jawab atas:
 * 1. Validasi teks clue (tidak boleh kosong, tidak boleh menyebutkan kata rahasia sendiri)
 * 2. Validasi vote (tidak boleh vote diri sendiri, tidak boleh double vote, target harus ada)
 */

/**
 * Memvalidasi apakah petunjuk (clue) yang dikirim pemain sah.
 *
 * Aturan PRD:
 * - Teks tidak boleh kosong atau hanya spasi.
 * - Maksimal panjang karakter yang wajar (misal: 100 karakter).
 * - Penyebutan literal kata sendiri DITOLAK (case-insensitive & pembersihan tanda baca).
 *
 * @param {string} clueText - Teks petunjuk yang dikirim pemain
 * @param {string} secretWord - Kata rahasia milik pemain yang sedang giliran
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateClue(clueText, secretWord) {
  if (!clueText || typeof clueText !== "string") {
    return { valid: false, reason: "Petunjuk tidak boleh kosong." };
  }

  const trimmedClue = clueText.trim();

  if (trimmedClue.length === 0) {
    return { valid: false, reason: "Petunjuk tidak boleh kosong." };
  }

  if (trimmedClue.length > 100) {
    return { valid: false, reason: "Petunjuk terlalu panjang (maksimal 100 karakter)." };
  }

  // Normalisasi teks untuk deteksi penyebutan kata rahasia:
  // Ubah ke lowercase dan hilangkan tanda baca (titik, koma, tanda seru, dll)
  const cleanClue = trimmedClue
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");

  const cleanWord = secretWord
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");

  // Pecah kata rahasia jika terdiri dari beberapa kata (misal: "Nasi Goreng" -> ["nasi", "goreng"])
  const wordParts = cleanWord.split(/\s+/).filter(Boolean);

  // Pecah clue menjadi daftar kata
  const clueWords = cleanClue.split(/\s+/).filter(Boolean);

  // Periksa apakah salah satu bagian kata rahasia persis disebut di dalam petunjuk
  for (const part of wordParts) {
    // Cek kecocokan kata utuh (agar kata "es" tidak salah mendeteksi "eskalator")
    if (clueWords.includes(part)) {
      return {
        valid: false,
        reason: "Dilarang menyebutkan kata rahasia milikmu sendiri dalam petunjuk!",
      };
    }
  }

  return { valid: true };
}

/**
 * Memvalidasi apakah aksi voting sah.
 *
 * Aturan PRD:
 * - Pemilih tidak boleh memilih dirinya sendiri.
 * - Pemilih tidak boleh memilih lebih dari satu kali (sudah vote sebelumnya).
 * - Target yang dipilih harus merupakan peserta resmi dalam ronde.
 *
 * @param {object} params
 * @param {string} params.voterId - ID pemain yang memberikan suara
 * @param {string} params.targetPlayerId - ID pemain yang divote
 * @param {Array<{ playerId: string }>} params.activePlayers - Daftar pemain resmi dalam ronde
 * @param {boolean} params.hasVoted - Status apakah pemilih sudah pernah memilih di ronde ini
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateVote({ voterId, targetPlayerId, activePlayers, hasVoted }) {
  if (hasVoted) {
    return { valid: false, reason: "ALREADY_VOTED: Kamu sudah memberikan suara di ronde ini." };
  }

  if (voterId === targetPlayerId) {
    return { valid: false, reason: "CANNOT_VOTE_SELF: Kamu tidak boleh memilih dirimu sendiri." };
  }

  const isTargetValid = activePlayers.some((p) => p.playerId === targetPlayerId);
  if (!isTargetValid) {
    return { valid: false, reason: "INVALID_TARGET: Pemain yang kamu pilih tidak terdaftar di ronde ini." };
  }

  return { valid: true };
}

module.exports = {
  validateClue,
  validateVote,
};

