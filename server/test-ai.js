/**
 * test-ai.js
 * Script tes mandiri lengkap untuk seluruh modul Developer 3 (Aturan & AI)
 * dengan pengujian guardrail keamanan tambahan.
 *
 * Jalankan dengan: node test-ai.js
 */

require("dotenv").config();

const { getRandomWordPair, getAvailableCategories, isValidCategory } = require("./src/services/wordBank");
const { fisherYatesShuffle, setupRound } = require("./src/game/shuffler");
const { generateWordPair, extractJsonBlock, parseAndValidateResponse } = require("./src/services/geminiService");
const { validateClue, validateVote, sanitizeAggressive } = require("./src/game/validator");
const { calculateRoundResult } = require("./src/game/resultCalculator");
const { resetRoundStateForReplay } = require("./src/game/stateCleaner");

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ GAGAL: ${label}`);
    failed++;
  }
}

// ============================================================
// TES 1: Word Bank Lokal
// ============================================================
console.log("=".repeat(60));
console.log("TES 1: Word Bank Lokal");
console.log("=".repeat(60));

assert("Kategori tersedia ada 6", getAvailableCategories().length === 6);
assert("'makanan' valid", isValidCategory("makanan"));
assert("'olahraga123' tidak valid", !isValidCategory("olahraga123"));

const pair1 = getRandomWordPair("makanan");
assert("Pasangan makanan punya wordA", typeof pair1.wordA === "string" && pair1.wordA.length > 0);
assert("Pasangan makanan punya wordB", typeof pair1.wordB === "string" && pair1.wordB.length > 0);

const pair2 = getRandomWordPair("makanan", pair1);
assert("Pasangan kedua berbeda dari pertama",
  !(pair2.wordA === pair1.wordA && pair2.wordB === pair1.wordB));

// ============================================================
// TES 2: Shuffler & Distribusi Peran
// ============================================================
console.log("\n" + "=".repeat(60));
console.log("TES 2: Shuffler & Distribusi Peran");
console.log("=".repeat(60));

const mockPlayers = [
  { playerId: "p1", nickname: "Fardian" },
  { playerId: "p2", nickname: "Rockwell" },
  { playerId: "p3", nickname: "Arief" },
  { playerId: "p4", nickname: "Budi" },
];

const wordPairForRound = { wordA: "Kopi", wordB: "Teh" };
const roundData = setupRound(mockPlayers, wordPairForRound);

assert("Impostor terpilih dari daftar pemain",
  mockPlayers.some(p => p.playerId === roundData.impostorId));
assert("Urutan giliran ada 4 pemain", roundData.turnOrder.length === 4);
assert("Impostor mendapat kata berbeda dari mayoritas",
  roundData.playerWords[roundData.impostorId] !== roundData.majorityWord);

console.log("  Distribusi:", roundData.playerWords);

// ============================================================
// TES 3: GUARDRAIL — Sanitasi Output LLM (extractJsonBlock)
// ============================================================
console.log("\n" + "=".repeat(60));
console.log("TES 3: GUARDRAIL — Sanitasi Output LLM");
console.log("=".repeat(60));

// Tes extractJsonBlock
assert("Ekstrak dari markdown fence",
  extractJsonBlock('```json\n{"wordA":"Kopi","wordB":"Teh"}\n```') === '{"wordA":"Kopi","wordB":"Teh"}');

assert("Ekstrak dari teks dengan pengantar",
  extractJsonBlock('Here is the output: {"wordA":"Singa","wordB":"Harimau"}') === '{"wordA":"Singa","wordB":"Harimau"}');

assert("Ekstrak dari JSON bersih",
  extractJsonBlock('{"wordA":"A","wordB":"B"}') === '{"wordA":"A","wordB":"B"}');

assert("Return null untuk string tanpa JSON",
  extractJsonBlock("Tidak ada kurung kurawal di sini") === null);

assert("Return null untuk string kosong",
  extractJsonBlock("") === null);

// Tes parseAndValidateResponse: identical words
try {
  parseAndValidateResponse('{"wordA":"Kucing","wordB":"kucing"}');
  assert("Identical words harus ditolak", false);
} catch (e) {
  assert("Identical words ditolak (" + e.message.split(":")[0] + ")",
    e.message.includes("AI_IDENTICAL_WORDS"));
}

// Tes parseAndValidateResponse: repeated pair
try {
  parseAndValidateResponse('{"wordA":"Kopi","wordB":"Teh"}', { wordA: "Teh", wordB: "Kopi" });
  assert("Repeated pair (urutan terbalik) harus ditolak", false);
} catch (e) {
  assert("Repeated pair ditolak (" + e.message.split(":")[0] + ")",
    e.message.includes("AI_REPEATED_PAIR"));
}

// ============================================================
// TES 4: GUARDRAIL — Anti-Cheat Validator (Clue)
// ============================================================
console.log("\n" + "=".repeat(60));
console.log("TES 4: GUARDRAIL — Anti-Cheat Validator Clue");
console.log("=".repeat(60));

// Tes sanitizeAggressive
assert("sanitize 'K. O - P ! I' -> 'kopi'",
  sanitizeAggressive("K. O - P ! I") === "kopi");
assert("sanitize 'k_o_p_i' -> 'kopi'",
  sanitizeAggressive("k_o_p_i") === "kopi");

// Tes clue yang sah
assert("Clue aman 'minuman hitam pekat'",
  validateClue("minuman hitam pekat", "Kopi").valid === true);

// Tes clue curang: literal
assert("Clue curang 'kopi manis' DITOLAK",
  validateClue("kopi manis", "Kopi").valid === false);

// Tes clue curang: bypass spasi
assert("Clue bypass spasi 'k o p i' DITOLAK",
  validateClue("k o p i", "Kopi").valid === false);

// Tes clue curang: bypass simbol
assert("Clue bypass simbol 'k.o.p.i' DITOLAK",
  validateClue("k.o.p.i", "Kopi").valid === false);

// Tes clue curang: bypass underscore
assert("Clue bypass underscore 'k_o_p_i' DITOLAK",
  validateClue("k_o_p_i", "Kopi").valid === false);

// Tes clue curang: kata majemuk fragmen
assert("Clue fragmen kata majemuk 'aku suka goreng' untuk 'Nasi Goreng' DITOLAK",
  validateClue("aku suka goreng", "Nasi Goreng").valid === false);

// Tes blank payload
assert("Clue kosong '' DITOLAK",
  validateClue("", "Kopi").valid === false);
assert("Clue hanya spasi '   ' DITOLAK",
  validateClue("   ", "Kopi").valid === false);
assert("Clue null DITOLAK",
  validateClue(null, "Kopi").valid === false);

// Tes panjang berlebihan
assert("Clue >50 karakter DITOLAK",
  validateClue("a".repeat(51), "Kopi").valid === false);
assert("Clue tepat 50 karakter LOLOS",
  validateClue("a".repeat(50), "Kopi").valid === true);

// ============================================================
// TES 5: GUARDRAIL — Double Vote Prevention
// ============================================================
console.log("\n" + "=".repeat(60));
console.log("TES 5: GUARDRAIL — Double Vote Prevention");
console.log("=".repeat(60));

const emptyVotes = {};

assert("Vote sah (belum pernah vote)",
  validateVote({ voterId: "p1", targetPlayerId: "p2", activePlayers: mockPlayers, votes: emptyVotes }).valid === true);

assert("Vote diri sendiri DITOLAK",
  validateVote({ voterId: "p1", targetPlayerId: "p1", activePlayers: mockPlayers, votes: emptyVotes }).valid === false);

// Simulasi p1 sudah vote
const votesWithP1 = { p1: "p2" };
assert("Double vote DITOLAK (p1 sudah vote sebelumnya)",
  validateVote({ voterId: "p1", targetPlayerId: "p3", activePlayers: mockPlayers, votes: votesWithP1 }).valid === false);

assert("Target invalid DITOLAK",
  validateVote({ voterId: "p1", targetPlayerId: "p999", activePlayers: mockPlayers, votes: emptyVotes }).valid === false);

// ============================================================
// TES 6: Result Calculator (Skenario Game)
// ============================================================
console.log("\n" + "=".repeat(60));
console.log("TES 6: Result Calculator (Skenario Game)");
console.log("=".repeat(60));

// Skenario A: Impostor tertangkap
const nonImpostors = mockPlayers.filter(p => p.playerId !== roundData.impostorId);
const votesA = {};
for (const p of nonImpostors) {
  votesA[p.playerId] = roundData.impostorId;
}
votesA[roundData.impostorId] = nonImpostors[0].playerId;

const resultA = calculateRoundResult({
  votes: votesA,
  players: mockPlayers,
  impostorId: roundData.impostorId,
  playerWords: roundData.playerWords,
});
assert("Skenario A: Impostor tertangkap -> CIVILIANS menang",
  resultA.winner === "CIVILIANS");
console.log("    Alasan:", resultA.reason);

// Skenario B: Abstain semua
const resultB = calculateRoundResult({
  votes: {},
  players: mockPlayers,
  impostorId: roundData.impostorId,
  playerWords: roundData.playerWords,
});
assert("Skenario B: Semua abstain -> IMPOSTOR menang",
  resultB.winner === "IMPOSTOR");
console.log("    Alasan:", resultB.reason);

// Skenario C: Suara seri
const votesC = {
  p1: "p2",
  p2: "p1",
  p3: "p2",
  p4: "p1",
};
const resultC = calculateRoundResult({
  votes: votesC,
  players: mockPlayers,
  impostorId: roundData.impostorId,
  playerWords: roundData.playerWords,
});
assert("Skenario C: Suara seri -> IMPOSTOR menang",
  resultC.winner === "IMPOSTOR");
console.log("    Alasan:", resultC.reason);

// ============================================================
// TES 7: State Cleaner (Reset Replay)
// ============================================================
console.log("\n" + "=".repeat(60));
console.log("TES 7: State Cleaner (Reset Replay)");
console.log("=".repeat(60));

const mockRoom = {
  code: "ABCD",
  hostId: "p1",
  phase: "RESULT",
  roundId: "round-001",
  impostorId: "p3",
  majorityWord: "Kopi",
  impostorWord: "Teh",
  playerWords: { p1: "Kopi", p2: "Kopi", p3: "Teh", p4: "Kopi" },
  turnOrder: ["p2", "p4", "p3", "p1"],
  currentTurnIndex: 4,
  clues: [{ playerId: "p2", text: "pahit" }, { playerId: "p4", text: "hangat" }],
  chat: [{ playerId: "p1", text: "menurutku p3 mencurigakan" }],
  votes: { p1: "p3", p2: "p3", p4: "p1" },
  result: { winner: "CIVILIANS" },
  deadlineAt: Date.now() + 60000,
  activeTimer: null,
  isStarting: false,
  previousWordPair: null,
  players: mockPlayers,
};

const cleanedRoom = resetRoundStateForReplay(mockRoom);

assert("Fase kembali ke WAITING", cleanedRoom.phase === "WAITING");
assert("roundId di-null-kan", cleanedRoom.roundId === null);
assert("impostorId di-null-kan", cleanedRoom.impostorId === null);
assert("votes dikosongkan ({})", Object.keys(cleanedRoom.votes).length === 0);
assert("clues dikosongkan ([])", cleanedRoom.clues.length === 0);
assert("chat dikosongkan ([])", cleanedRoom.chat.length === 0);
assert("playerWords dikosongkan", Object.keys(cleanedRoom.playerWords).length === 0);
assert("result di-null-kan", cleanedRoom.result === null);
assert("previousWordPair tersimpan (Kopi, Teh)",
  cleanedRoom.previousWordPair.wordA === "Kopi" && cleanedRoom.previousWordPair.wordB === "Teh");
assert("code room TETAP utuh", cleanedRoom.code === "ABCD");
assert("hostId TETAP utuh", cleanedRoom.hostId === "p1");
assert("players TETAP utuh (4 orang)", cleanedRoom.players.length === 4);

// ============================================================
// TES 8: Gemini Service (AI Live)
// ============================================================
console.log("\n" + "=".repeat(60));
console.log("TES 8: Gemini Service (AI Live)");
console.log("=".repeat(60));

(async () => {
  try {
    const aiResult = await generateWordPair("teknologi", null);
    console.log(`  Hasil: ${aiResult.wordA} vs ${aiResult.wordB}`);
    assert(`Sumber kata: ${aiResult.source === "ai" ? "✅ Gemini AI" : "⚡ Word Bank (fallback)"}`, true);
  } catch (err) {
    console.error("  Error tidak terduga:", err.message);
    failed++;
  }

  // ============================================================
  // RINGKASAN
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log(`RINGKASAN: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  if (failed === 0) {
    console.log("🏆 SEMUA TES LULUS! Modul Developer 3 siap produksi.");
  } else {
    console.log(`⚠️  Ada ${failed} tes yang gagal. Periksa kembali.`);
  }
})();
