/**
 * resultCalculator.js
 * Modul penghitung hasil akhir permainan Kataflase di fase RESULT.
 *
 * Sesuai aturan PRD:
 * 1. Jika satu kandidat memperoleh suara terbanyak tunggal dan dia adalah Impostor -> Pemain Biasa menang.
 * 2. Jika kandidat teratas adalah pemain biasa, posisi teratas seri (tie), atau semua pemain abstain -> Impostor menang.
 */

/**
 * Menghitung perolehan suara dan menentukan pemenang ronde.
 *
 * @param {object} params
 * @param {Record<string, string>} params.votes - Objek vote { voterId: targetPlayerId }
 * @param {Array<{ playerId: string, nickname: string }>} params.players - Daftar pemain di ronde
 * @param {string} params.impostorId - ID pemain yang menjadi impostor
 * @param {Record<string, string>} params.playerWords - Kata rahasia tiap pemain { playerId: word }
 * @returns {{
 *   winner: "CIVILIANS" | "IMPOSTOR",
 *   impostorId: string,
 *   voteTally: Record<string, number>,
 *   highestVoteCount: number,
 *   topCandidates: string[],
 *   reason: string,
 *   playerWords: Record<string, string>
 * }}
 */
function calculateRoundResult({ votes, players, impostorId, playerWords }) {
  // Inisialisasi tally (jumlah suara) untuk semua pemain = 0
  const voteTally = {};
  for (const player of players) {
    voteTally[player.playerId] = 0;
  }

  // Hitung total suara yang masuk
  let totalVotesCast = 0;
  for (const targetId of Object.values(votes)) {
    if (voteTally[targetId] !== undefined) {
      voteTally[targetId] += 1;
      totalVotesCast += 1;
    }
  }

  // Cari jumlah suara tertinggi
  const highestVoteCount = Math.max(0, ...Object.values(voteTally));

  // Kumpulkan kandidat yang memperoleh suara tertinggi
  const topCandidates = players
    .filter((p) => voteTally[p.playerId] === highestVoteCount && highestVoteCount > 0)
    .map((p) => p.playerId);

  let winner = "IMPOSTOR";
  let reason = "";

  const impostorNickname = players.find((p) => p.playerId === impostorId)?.nickname || "Impostor";

  if (totalVotesCast === 0 || highestVoteCount === 0) {
    // Kasus 1: Semua pemain abstain (tidak ada yang vote)
    winner = "IMPOSTOR";
    reason = `Semua pemain abstain! ${impostorNickname} (Impostor) berhasil lolos tanpa dicurigai.`;
  } else if (topCandidates.length > 1) {
    // Kasus 2: Hasil suara tertinggi seri (tie)
    winner = "IMPOSTOR";
    const tiedNicknames = players
      .filter((p) => topCandidates.includes(p.playerId))
      .map((p) => p.nickname)
      .join(" & ");
    reason = `Hasil voting seri antara ${tiedNicknames}! Karena warga ragu-ragu, ${impostorNickname} (Impostor) dinyatakan menang.`;
  } else {
    // Kasus 3: Ada 1 orang dengan suara terbanyak tunggal
    const singleTopCandidateId = topCandidates[0];
    const topCandidateNickname =
      players.find((p) => p.playerId === singleTopCandidateId)?.nickname || "Kandidat";

    if (singleTopCandidateId === impostorId) {
      // Impostor tertangkap!
      winner = "CIVILIANS";
      reason = `Warga berhasil menebak ${topCandidateNickname} sebagai Impostor dengan ${highestVoteCount} suara! Warga menang.`;
    } else {
      // Salah tuduh warga biasa
      winner = "IMPOSTOR";
      reason = `Warga salah menuduh ${topCandidateNickname}! ${impostorNickname} adalah Impostor yang sebenarnya dan berhasil mengecoh semua orang.`;
    }
  }

  return {
    winner, // "CIVILIANS" atau "IMPOSTOR"
    impostorId,
    voteTally,
    highestVoteCount,
    topCandidates,
    reason,
    playerWords, // Dikirim ke publik saat RESULT agar semua pemain tahu kata masing-masing
  };
}

module.exports = {
  calculateRoundResult,
};
