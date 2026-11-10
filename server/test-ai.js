/**
 * test-ai.js
 * Script tes mandiri untuk memverifikasi wordBank, shuffler, dan geminiService.
 * Jalankan dengan: node test-ai.js
 *
 * CATATAN: Untuk tes geminiService, pastikan .env berisi GEMINI_API_KEY yang valid.
 */

require("dotenv").config();

const { getRandomWordPair, getAvailableCategories, isValidCategory } = require("./src/services/wordBank");
const { fisherYatesShuffle, setupRound } = require("./src/game/shuffler");
const { generateWordPair } = require("./src/services/geminiService");

// ============================================================
// TES 1: Word Bank
// ============================================================
console.log("=".repeat(50));
console.log("TES 1: Word Bank Lokal");
console.log("=".repeat(50));

console.log("Kategori tersedia:", getAvailableCategories());
console.log("Validasi 'makanan' (harusnya true):", isValidCategory("makanan"));
console.log("Validasi 'olahraga123' (harusnya false):", isValidCategory("olahraga123"));

const pair1 = getRandomWordPair("makanan");
console.log("Pasangan acak kategori 'makanan':", pair1);

const pair2 = getRandomWordPair("makanan", pair1); // Hindari pair1
console.log("Pasangan berikutnya (hindari pair1):", pair2);

const pairAcak = getRandomWordPair("acak");
console.log("Pasangan kategori 'acak' (semua kategori):", pairAcak);

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

const shuffled = fisherYatesShuffle(mockPlayers.map((p) => p.playerId));
console.log("Hasil shuffle ID pemain:", shuffled);

const wordPairForRound = { wordA: "Kopi", wordB: "Teh" };
const roundData = setupRound(mockPlayers, wordPairForRound);

console.log("\nHasil setupRound:");
console.log("  Impostor ID:", roundData.impostorId);
console.log(
  "  Impostor Nickname:",
  mockPlayers.find((p) => p.playerId === roundData.impostorId)?.nickname
);
console.log("  Urutan Giliran Clue:", roundData.turnOrder);
console.log("  Kata Mayoritas:", roundData.majorityWord);
console.log("  Kata Impostor:", roundData.impostorWord);
console.log("  Distribusi kata per pemain:");
for (const [pid, word] of Object.entries(roundData.playerWords)) {
  const player = mockPlayers.find((p) => p.playerId === pid);
  const isImpostor = pid === roundData.impostorId ? " ← IMPOSTOR" : "";
  console.log(`    ${player.nickname} (${pid}): "${word}"${isImpostor}`);
}

// ============================================================
// TES 3: Gemini Service (membutuhkan GEMINI_API_KEY di .env)
// ============================================================
console.log("\n" + "=".repeat(50));
console.log("TES 3: Gemini Service (AI + Fallback)");
console.log("=".repeat(50));

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.log("⚠️  GEMINI_API_KEY belum diisi di .env — melewati tes AI, hanya uji fallback...\n");
}

(async () => {
  try {
    const result = await generateWordPair("teknologi", null);
    console.log(`Hasil generateWordPair("teknologi"):`, result);
    console.log(`Sumber kata: ${result.source === "ai" ? "✅ Gemini AI" : "⚡ Word Bank Lokal (fallback)"}`);

    const result2 = await generateWordPair("hewan", { wordA: result.wordA, wordB: result.wordB });
    console.log(`\nHasil generateWordPair("hewan") ronde ke-2:`, result2);
    console.log(`Sumber kata: ${result2.source === "ai" ? "✅ Gemini AI" : "⚡ Word Bank Lokal (fallback)"}`);
  } catch (err) {
    console.error("Error tidak terduga saat tes:", err.message);
  }
})();

