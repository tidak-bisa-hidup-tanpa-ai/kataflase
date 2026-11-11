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

  if (typeof secretWord !== "string") {
    return { valid: false, reason: "Kata rahasia tidak tersedia." };
  }
  const cleanClue = trimmedClue.normalize("NFKC").toLowerCase();
  const wordParts = secretWord.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  if (!wordParts.length) return { valid: false, reason: "Kata rahasia tidak tersedia." };

  for (const part of wordParts) {
    const letters = [...part].join("[^\\p{L}\\p{N}]*");
    // Batas kata mencegah "es" menolak "eskalator", sambil menangkap "k o p i".
    const literalWord = new RegExp(`(?:^|[^\\p{L}\\p{N}])${letters}(?=$|[^\\p{L}\\p{N}])`, "u");
    if (literalWord.test(cleanClue)) {
      return {
        valid: false,
        reason: "Dilarang menyamarkan atau menyebutkan kata rahasia milikmu sendiri!",
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
 * @param {Record<string, number>} params.votes - Suara yang sudah diterima dalam ronde
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateVote({ voterId, targetPlayerId, activePlayers, votes }) {
  if (Object.hasOwn(votes || {}, voterId)) {
    return { valid: false, code: "ALREADY_VOTED", reason: "Kamu sudah memberikan suara di ronde ini." };
  }

  if (voterId === targetPlayerId) {
    return { valid: false, code: "CANNOT_VOTE_SELF", reason: "Kamu tidak boleh memilih dirimu sendiri." };
  }

  const isTargetValid = Array.isArray(activePlayers)
    && activePlayers.some((p) => p.playerId === targetPlayerId);
  if (!isTargetValid) {
    return { valid: false, code: "INVALID_TARGET", reason: "Pemain yang kamu pilih tidak terdaftar di ronde ini." };
  }

  return { valid: true };
}

module.exports = {
  validateClue,
  validateVote,
};
