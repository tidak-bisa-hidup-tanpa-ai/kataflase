/**
 * shuffler.js
 * Modul untuk pengacakan posisi pemain dan distribusi peran/kata di awal ronde.
 *
 * Bertanggung jawab atas:
 * 1. Fisher-Yates Shuffle — mengacak urutan array secara merata dan adil
 * 2. Pemilihan impostor secara acak dari array pemain
 * 3. Pengacakan urutan giliran clue
 * 4. Distribusi kata rahasia ke masing-masing pemain
 */

/**
 * Mengacak array secara in-place menggunakan algoritma Fisher-Yates.
 * Mengembalikan array baru (tidak memodifikasi array asli).
 *
 * @template T
 * @param {T[]} array - Array yang akan diacak
 * @returns {T[]} Array baru dengan urutan teracak
 */
function fisherYatesShuffle(array) {
  // Salin array agar array asli tidak berubah
  const shuffled = [...array];

  // Iterasi dari elemen terakhir ke elemen kedua
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Ambil index acak dari 0 sampai i (inklusif)
    const j = Math.floor(Math.random() * (i + 1));

    // Tukar elemen ke-i dengan elemen ke-j
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Menyiapkan semua data ronde: impostor, urutan giliran, dan kata tiap pemain.
 *
 * Proses:
 * 1. Acak array pemain dengan Fisher-Yates untuk menentukan impostor (elemen pertama)
 * 2. Acak ulang array pemain untuk menentukan urutan giliran clue (berbeda dari shuffle impostor)
 * 3. Acak secara 50/50 siapa yang mendapat wordA vs wordB (agar posisi kata tidak bisa ditebak)
 * 4. Distribusikan kata ke setiap pemain
 *
 * @param {Array<{ playerId: string, nickname: string }>} players - Daftar pemain yang terdaftar di ronde ini
 * @param {{ wordA: string, wordB: string }} wordPair - Pasangan kata dari AI atau word bank
 * @returns {{
 *   impostorId: string,
 *   turnOrder: string[],
 *   playerWords: Record<string, string>,
 *   majorityWord: string,
 *   impostorWord: string
 * }}
 */
function setupRound(players, wordPair) {
  if (!players || players.length < 3) {
    throw new Error("Minimal 3 pemain diperlukan untuk memulai ronde.");
  }
  if (!wordPair || !wordPair.wordA || !wordPair.wordB) {
    throw new Error("Pasangan kata tidak valid.");
  }

  // --- Langkah 1: Pilih impostor ---
  // Acak array pemain, pemain pertama dari hasil acak menjadi impostor
  const shuffledForImpostor = fisherYatesShuffle(players);
  const impostorId = shuffledForImpostor[0].playerId;

  // --- Langkah 2: Tentukan urutan giliran clue ---
  // Acak ulang secara independen (bukan dari hasil shuffle impostor)
  // agar urutan giliran tidak bisa diprediksi dari posisi impostor
  const shuffledForTurn = fisherYatesShuffle(players);
  const turnOrder = shuffledForTurn.map((p) => p.playerId);

  // --- Langkah 3: Acak siapa yang mendapat wordA vs wordB ---
  // 50% kemungkinan mayoritas dapat wordA, 50% dapat wordB
  const isAForMajority = Math.random() < 0.5;
  const majorityWord = isAForMajority ? wordPair.wordA : wordPair.wordB;
  const impostorWord = isAForMajority ? wordPair.wordB : wordPair.wordA;

  // --- Langkah 4: Distribusikan kata ke masing-masing pemain ---
  const playerWords = {};
  for (const player of players) {
    playerWords[player.playerId] =
      player.playerId === impostorId ? impostorWord : majorityWord;
  }

  return {
    impostorId,
    turnOrder,       // Urutan playerId untuk giliran clue
    playerWords,     // { playerId: kata_rahasia } — RAHASIA, jangan dibagikan ke room
    majorityWord,    // Kata yang dipegang pemain biasa — RAHASIA hingga RESULT
    impostorWord,    // Kata yang dipegang impostor — RAHASIA hingga RESULT
  };
}

module.exports = {
  fisherYatesShuffle,
  setupRound,
};

