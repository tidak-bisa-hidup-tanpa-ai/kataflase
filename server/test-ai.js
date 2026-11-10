/**
 * test-ai.js
 * Script tes mandiri lengkap untuk seluruh modul Developer 3 (Aturan & AI):
 * 1. Word Bank Lokal
 * 2. Shuffler & Distribusi Peran
 * 3. Gemini Service (AI + Fallback)
 * 4. Validator (Clue & Vote)
 * 5. Kalkulator Hasil & Penentuan Pemenang (Result Calculator)
 *
 * Jalankan dengan: node test-ai.js
 */

require("dotenv").config();

const { getRandomWordPair, getAvailableCategories, isValidCategory } = require("./src/services/wordBank");
const { fisherYatesShuffle, setupRound } = require("./src/game/shuffler");
const { generateWordPair } = require("./src/services/geminiService");
const { validateClue, validateVote } = require("./src/game/validator");
const { calculateRoundResult } = require("./src/game/resultCalculator");

// ============================================================
// TES 1: Word Bank Lokal
// ============================================================
console.log("=".repeat(50));
console.log("TES 1: Word Bank Lokal");
console.log("=".repeat(50));

console.log("Kategori tersedia:", getAvailableCategories());
console.log("Validasi 'makanan':", isValidCategory("makanan"));
const pair1 = getRandomWordPair("makanan");
console.log("Pasangan acak kategori 'makanan':", pair1);

// ============================================================
// TES 2: Fisher-Yates Shuffle & Setup Ronde
// ============================================================
console.log("\n" + "=".repeat(50));
console.log("TES 2: Shuffler & Distribusi Peran");
console.log("=".repeat(50));

const mockPlayers = [
  { playerId: "p1", nickname: "Fardian" },
  { playerId: "p2", nickname: "Rockwell" },
  { playerId: "p3", nickname: "Arief" },
  { playerId: "p4", nickname: "Budi" },
];

const wordPairForRound = { wordA: "Kopi", wordB: "Teh" };
const roundData = setupRound(mockPlayers, wordPairForRound);

console.log("Impostor terpilih:", roundData.impostorId);
console.log("Urutan giliran clue:", roundData.turnOrder);
console.log("Distribusi kata rahasia:", roundData.playerWords);

// ============================================================
// TES 3: Validator (Clue & Vote)
// ============================================================
console.log("\n" + "=".repeat(50));
console.log("TES 3: Validator Clue & Vote");
console.log("=".repeat(50));

// Uji Clue
console.log("Clue aman ('minuman hitam pekat' untuk kata 'Kopi'):", validateClue("minuman hitam pekat", "Kopi"));
console.log("Clue curang ('kopi manis' untuk kata 'Kopi'):", validateClue("kopi manis", "Kopi"));
console.log("Clue kosong (''):", validateClue("", "Kopi"));

// Uji Vote
console.log("Vote sah (p1 vote p2):", validateVote({ voterId: "p1", targetPlayerId: "p2", activePlayers: mockPlayers, hasVoted: false }));
console.log("Vote diri sendiri (p1 vote p1):", validateVote({ voterId: "p1", targetPlayerId: "p1", activePlayers: mockPlayers, hasVoted: false }));
console.log("Vote dobel (hasVoted = true):", validateVote({ voterId: "p1", targetPlayerId: "p2", activePlayers: mockPlayers, hasVoted: true }));

// ============================================================
// TES 4: Result Calculator (Penentuan Pemenang)
// ============================================================
console.log("\n" + "=".repeat(50));
console.log("TES 4: Result Calculator (Skenario Game)");
console.log("=".repeat(50));

// Skenario A: Impostor tertangkap (3 orang vote impostor)
const votesScenarioA = {
  p1: roundData.impostorId,
  p2: roundData.impostorId,
  p4: roundData.impostorId,
  [roundData.impostorId]: "p1",
};
const resultA = calculateRoundResult({
  votes: votesScenarioA,
  players: mockPlayers,
  impostorId: roundData.impostorId,
  playerWords: roundData.playerWords,
});
console.log("Skenario A (Impostor Tertangkap):");
console.log("  Pemenang:", resultA.winner, "->", resultA.reason);

// Skenario B: Suara seri (2 orang vote p1, 2 orang vote impostor)
const votesScenarioB = {
  p1: roundData.impostorId,
  p2: roundData.impostorId,
  p3: "p1",
  p4: "p1",
};
const resultB = calculateRoundResult({
  votes: votesScenarioB,
  players: mockPlayers,
  impostorId: roundData.impostorId,
  playerWords: roundData.playerWords,
});
console.log("\nSkenario B (Suara Seri / Tie):");
console.log("  Pemenang:", resultB.winner, "->", resultB.reason);

// ============================================================
// TES 5: Gemini Service (AI)
// ============================================================
console.log("\n" + "=".repeat(50));
console.log("TES 5: Gemini Service (AI)");
console.log("=".repeat(50));

(async () => {
  try {
    const aiResult = await generateWordPair("teknologi", null);
    console.log(`Hasil AI: ${aiResult.wordA} vs ${aiResult.wordB} (${aiResult.source})`);
  } catch (err) {
    console.error("Error AI:", err.message);
  }
})();
