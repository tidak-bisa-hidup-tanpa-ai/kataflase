/**
 * validator.js
 * Modul validasi aturan permainan Kataflase.
 *
 * Bertanggung jawab atas:
 * 1. Validasi teks clue dengan sanitasi agresif anti-cheat
 * 2. Validasi vote dengan pencegahan race condition double voting
 *
 * GUARDRAIL KEAMANAN:
 * - sanitizeAggressive(): Strip SEMUA non-alphanumeric untuk menangkap bypass spasi/simbol
 * - Batas panjang clue (50 karakter) untuk mencegah payload abuse
 * - Double voting prevention via hash map check O(1)
 */

/**
 * GUARDRAIL: Normalisasi string super-ketat.
 * Mengubah ke lowercase dan menghapus SELURUH karakter non-alfanumerik
 * (spasi, tanda baca, simbol, emoji, dsb).
 *
 * Contoh:
 *   "K. O - P ! I"  -> "kopi"
 *   "k_o_p_i"       -> "kopi"
 *   "NASI goreng"   -> "nasigoreng"
 *
 * @param {string} str - String yang akan dinormalisasi
 * @returns {string} String lowercase tanpa karakter non-alfanumerik
 */
function sanitizeAggressive(str) {
  if (typeof str !== "string") return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Memvalidasi apakah petunjuk (clue) yang dikirim pemain sah.
 *
 * Aturan PRD:
 * - Teks tidak boleh kosong atau hanya spasi.
 * - Maksimal panjang 50 karakter.
 * - Penyebutan literal kata sendiri DITOLAK (dengan sanitasi agresif anti-bypass).
 *
 * Skenario bypass yang ditangkap:
 * - Kata "Kopi" -> clue "k o p i" (DITOLAK)
 * - Kata "Kopi" -> clue "k.o.p.i" (DITOLAK)
 * - Kata "Kopi" -> clue "k-o_p!i" (DITOLAK)
 * - Kata "Nasi Goreng" -> clue "aku suka goreng" (DITOLAK, fragmen "goreng" terdeteksi)
 *
 * @param {string} clueText - Teks petunjuk yang dikirim pemain
 * @param {string} secretWord - Kata rahasia milik pemain yang sedang giliran
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateClue(clueText, secretWord) {
  // GUARDRAIL 1: Blank payload — tolak tipe non-string dan null/undefined
  if (!clueText || typeof clueText !== "string") {
    return { valid: false, reason: "BLANK_CLUE: Petunjuk tidak boleh kosong." };
  }

  const trimmed = clueText.trim();

  // GUARDRAIL 2: Tolak string kosong atau hanya berisi whitespace
  if (trimmed.length === 0) {
    return { valid: false, reason: "BLANK_CLUE: Petunjuk tidak boleh hanya berisi spasi." };
  }

  // GUARDRAIL 3: Batas panjang karakter (50 karakter) untuk mencegah payload abuse
  if (trimmed.length > 50) {
    return { valid: false, reason: "CLUE_TOO_LONG: Petunjuk maksimal 50 karakter." };
  }

  // GUARDRAIL 4: Anti-cheat sanitasi agresif
  // Strip semua karakter non-alfanumerik dari clue dan kata rahasia
  const aggressiveClue = sanitizeAggressive(trimmed);
  const rawSecretWord = typeof secretWord === "string" ? secretWord : "";

  // Pisahkan kata jika kata rahasia majemuk (misal: "Nasi Goreng" -> ["nasi", "goreng"])
  // Hanya periksa fragmen kata >= 2 huruf agar kata pendek seperti "es" pada "Es Krim"
  // tidak salah mendeteksi kata seperti "seru" atau "bersih"
  const secretParts = rawSecretWord
    .split(/\s+/)
    .map((part) => sanitizeAggressive(part))
    .filter((part) => part.length >= 2);

  // Cek apakah clue yang sudah di-strip mengandung fragmen kata rahasia
  for (const part of secretParts) {
    if (aggressiveClue.includes(part)) {
      return {
        valid: false,
        reason: "LITERAL_SECRET_WORD: Dilarang menyamarkan atau menyebutkan kata rahasiamu sendiri!",
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
 * - Pemilih tidak boleh memilih lebih dari satu kali.
 * - Target yang dipilih harus merupakan peserta resmi dalam ronde.
 *
 * GUARDRAIL: Parameter `votes` menggunakan hash map check O(1) untuk
 * mencegah race condition di mana client menembakkan socket event
 * `vote:submit` beruntun dalam hitungan milidetik.
 *
 * @param {object} params
 * @param {string} params.voterId - ID pemain yang memberikan suara
 * @param {string} params.targetPlayerId - ID pemain yang divote
 * @param {Array<{ playerId: string }>} params.activePlayers - Daftar pemain resmi dalam ronde
 * @param {Record<string, string>} params.votes - Objek vote saat ini { voterId: targetId }
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateVote({ voterId, targetPlayerId, activePlayers, votes }) {
  // GUARDRAIL 5: Double voting prevention via hash map lookup O(1)
  // Lebih kuat dari flag boolean karena langsung mengecek sumber kebenaran (votes object)
  if (votes && Object.prototype.hasOwnProperty.call(votes, voterId)) {
    return { valid: false, reason: "ALREADY_VOTED: Kamu sudah memberikan suara di ronde ini." };
  }

  // GUARDRAIL 6: Larangan vote diri sendiri
  if (voterId === targetPlayerId) {
    return { valid: false, reason: "CANNOT_VOTE_SELF: Kamu tidak boleh memilih dirimu sendiri." };
  }

  // GUARDRAIL 7: Validasi target berada di daftar pemain resmi
  const isTargetValid =
    Array.isArray(activePlayers) &&
    activePlayers.some((p) => p.playerId === targetPlayerId);

  if (!isTargetValid) {
    return { valid: false, reason: "INVALID_TARGET: Pemain yang kamu pilih tidak terdaftar di ronde ini." };
  }

  return { valid: true };
}

module.exports = {
  validateClue,
  validateVote,
  sanitizeAggressive,
};
