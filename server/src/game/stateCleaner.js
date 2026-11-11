/**
 * stateCleaner.js
 * Utilitas pembersihan state ronde untuk transisi RESULT -> WAITING (Replay).
 *
 * Mencegah memory leak dan ghost state dari ronde sebelumnya:
 * - Membersihkan timer aktif yang menggantung (dangling setTimeout)
 * - Mengosongkan objek votes agar tidak ada double-vote bawaan di ronde baru
 * - Mendereference array/objek besar (clues, chat, playerWords) untuk Garbage Collection
 * - Mempertahankan data room esensial (code, hostId, players, previousWordPair)
 */

/**
 * Membersihkan seluruh state ronde pada objek room tanpa menghapus
 * identitas room dan daftar pemain yang masih aktif.
 *
 * Dipanggil oleh Developer 2 saat Host menekan tombol "Main Lagi"
 * (transisi dari fase RESULT kembali ke WAITING).
 *
 * Sesuai ADR:
 * - Kode room, anggota, dan sesi tetap bisa dipakai
 * - Kata, clue, chat, suara, dan hasil ronde lama dihapus
 * - Pasangan kata terakhir disimpan untuk mencegah duplikasi di ronde berikutnya
 *
 * @param {object} room - Objek room yang aktif di server
 * @returns {object} Objek room yang sudah bersih untuk ronde baru
 *
 * @example
 * // Di socket handler "game:restart"
 * const { resetRoundStateForReplay } = require("./game/stateCleaner");
 * resetRoundStateForReplay(room);
 * io.to(room.code).emit("room:state", buildPublicSnapshot(room));
 */
function resetRoundStateForReplay(room) {
  if (!room) return null;

  // 1. Simpan pasangan kata ronde ini sebagai riwayat pencegah duplikasi
  const lastPair =
    room.majorityWord && room.impostorWord
      ? { wordA: room.majorityWord, wordB: room.impostorWord }
      : room.previousWordPair || null;

  // 2. Bersihkan timer aktif jika masih ada yang menggantung
  //    (Mencegah dangling callback setTimeout yang bisa memicu transisi fase
  //    secara tidak terduga di ronde yang sudah selesai)
  if (room.activeTimer) {
    clearTimeout(room.activeTimer);
    room.activeTimer = null;
  }

  // 3. Reset fase ke WAITING
  room.phase = "WAITING";
  room.roundId = null;
  room.deadlineAt = null;

  // 4. Bersihkan data sensitif ronde
  //    (Dereference eksplisit agar V8 Garbage Collector bisa membebaskan memori)
  room.impostorId = null;
  room.majorityWord = null;
  room.impostorWord = null;
  room.playerWords = {};
  room.turnOrder = [];
  room.currentTurnIndex = 0;

  // 5. Bersihkan riwayat interaksi pemain
  room.clues = [];
  room.chat = [];
  room.votes = {}; // WAJIB dikosongkan agar tidak ada ghost vote di ronde baru
  room.result = null;

  // 6. Reset status start lock
  room.isStarting = false;

  // 7. Simpan riwayat kata terakhir untuk validasi anti-duplikasi ronde berikutnya
  room.previousWordPair = lastPair;

  // Catatan: room.code, room.hostId, room.players, dan sesi pemain TETAP dipertahankan utuh.

  return room;
}

module.exports = {
  resetRoundStateForReplay,
};

