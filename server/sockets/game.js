const { randomUUID } = require("node:crypto");
const { generateWordPair } = require("../helpers/gemini");
const { getAvailableCategories, isValidCategory, getWordPairHash } = require("../helpers/wordBank");
const { setupRound } = require("../helpers/shuffler");
const { validateClue, validateVote } = require("../helpers/validator");
const { calculateRoundResult } = require("../helpers/resultCalculator");

const DURATION = { WORD_REVEAL: 10000, CLUE: 30000, DISCUSSION: 60000, VOTING: 45000 };

function failure(code, message) {
  return { ok: false, error: { code, message } };
}

function finishRound(room, round) {
  round.result = calculateRoundResult({
    votes: round.votes, players: round.players,
    impostorId: round.impostorId, playerWords: round.playerWords,
  });
  room.phase = "RESULT";
  round.deadlineAt = null;
}

function nextClue(room, round, now) {
  round.turnIndex += 1;
  room.phase = round.turnIndex < round.turnOrder.length ? "CLUE" : "DISCUSSION";
  round.deadlineAt = new Date(now + DURATION[room.phase]);
}

function advanceExpired(room, round) {
  let changed = false;
  while (round?.deadlineAt && round.deadlineAt.getTime() <= Date.now()) {
    const expiredAt = round.deadlineAt.getTime();
    if (room.phase === "WORD_REVEAL") {
      room.phase = "CLUE";
      round.deadlineAt = new Date(expiredAt + DURATION.CLUE);
    } else if (room.phase === "CLUE") {
      round.clues = [...round.clues, {
        playerId: round.turnOrder[round.turnIndex], text: null, skipped: true,
      }];
      nextClue(room, round, expiredAt);
    } else if (room.phase === "DISCUSSION") {
      room.phase = "VOTING";
      round.deadlineAt = new Date(expiredAt + DURATION.VOTING);
    } else if (room.phase === "VOTING") {
      finishRound(room, round);
    } else {
      break;
    }
    changed = true;
  }
  if (changed) room.revision += 1;
}

module.exports = (io, { rooms, emitRoomState, getOnlinePlayerIds, scheduleExpiry }) => {
  const timers = new Map();

  function clearRoundTimer(code) {
    clearTimeout(timers.get(code));
    timers.delete(code);
  }

  function publish(room) {
    const state = emitRoomState(io, room);
    clearRoundTimer(room.code);
    const { round } = state;
    if (!round?.deadlineAt || room.phase === "RESULT") return;

    const roundId = round.id;
    const deadline = round.deadlineAt.getTime();
    const timer = setTimeout(() => {
      if (timers.get(room.code) !== timer) return;
      timers.delete(room.code);
      const current = rooms.get(room.code);
      if (current?.round?.id !== roundId || current.round.deadlineAt?.getTime() !== deadline) return;
      try {
        advanceExpired(current, current.round);
        publish(current);
      } catch (error) {
        console.error("Game timer failed:", error.name);
      }
    }, Math.max(0, deadline - Date.now())).unref();
    timers.set(room.code, timer);
  }

  function withPlayer(socket, callback) {
    const { roomCode, playerId } = socket.data;
    if (!playerId) return failure("NOT_IN_ROOM", "Masuk ke room terlebih dahulu.");
    const room = rooms.get(roomCode);
    if (!room || !socket.connected || !room.players.some((member) => member.id === playerId)) {
      return failure("SESSION_EXPIRED", "Sesi room sudah tidak aktif.");
    }
    return callback(room, playerId);
  }

  function cancelStart(attempt) {
    const room = rooms.get(attempt.room.code);
    if (room !== attempt.room) return;
    if (room.phase === "WAITING"
      && room.isStarting && room.revision === attempt.revision) {
      room.isStarting = false;
      room.revision += 1;
    }
    publish(room);
  }

  async function start(socket, payload, acknowledge) {
    if (typeof acknowledge !== "function") return;
    const requestedCategory = payload?.category ?? "acak";
    const isCustom = requestedCategory === "custom";
    const customCategory = typeof payload?.customCategory === "string" ? payload.customCategory.trim() : "";
    if (isCustom && (!customCategory || customCategory.length > 50 || /[\p{C}\p{Zl}\p{Zp}]/u.test(customCategory))) {
      return acknowledge(failure("INVALID_CUSTOM_CATEGORY", "Isi nama kategori sendiri, maksimal 50 karakter dalam satu baris."));
    }
    if (!isCustom && !isValidCategory(requestedCategory)) {
      return acknowledge(failure("INVALID_CATEGORY", "Kategori tidak tersedia."));
    }
    let attempt;
    try {
      attempt = withPlayer(socket, (room, playerId) => {
        if (room.hostId !== playerId) return failure("HOST_ONLY", "Hanya host yang bisa memulai ronde.");
        if (room.phase !== "WAITING" || room.isStarting) {
          return failure("ROUND_IN_PROGRESS", "Ronde sudah berjalan atau sedang disiapkan.");
        }
        const onlineIds = getOnlinePlayerIds(io, `room:${room.code}`);
        if (room.players.length < 3 || room.players.length > 6
          || room.players.some((member) => !onlineIds.has(member.id))) {
          return failure("PLAYERS_NOT_READY", "Ronde memerlukan 3–6 pemain dan semuanya harus online.");
        }
        const categories = getAvailableCategories().filter((category) => category !== "acak");
        const category = isCustom ? customCategory : requestedCategory === "acak"
          ? categories[Math.floor(Math.random() * categories.length)] : requestedCategory;
        room.isStarting = true;
        room.revision += 1;
        return {
          room, category, revision: room.revision,
          players: room.players.map((member) => ({ playerId: member.id, nickname: member.nickname })),
        };
      });
      if (attempt.error) return acknowledge(attempt);
      publish(attempt.room);
      const pair = await generateWordPair(attempt.category, attempt.room.lastWordPairHash, { allowWordBank: !isCustom });
      const result = withPlayer(socket, (room, playerId) => {
        if (room !== attempt.room || room.phase !== "WAITING" || !room.isStarting
          || room.revision !== attempt.revision || room.hostId !== playerId) {
          return failure("START_CANCELLED", "Susunan pemain berubah. Silakan mulai lagi.");
        }
        const onlineIds = getOnlinePlayerIds(io, `room:${room.code}`);
        if (attempt.players.some((member) => !onlineIds.has(member.playerId))) {
          room.isStarting = false;
          room.revision += 1;
          return failure("START_CANCELLED", "Ada pemain yang terputus. Silakan mulai lagi.");
        }
        if (!pair) {
          return failure("CUSTOM_CATEGORY_UNAVAILABLE", "AI belum bisa membuat kata untuk kategori ini. Coba lagi atau pilih kategori bawaan.");
        }
        const setup = setupRound(attempt.players, pair);
        room.round = {
          id: randomUUID(), category: attempt.category, source: pair.source,
          players: attempt.players, turnOrder: setup.turnOrder, turnIndex: 0,
          playerWords: setup.playerWords, impostorId: setup.impostorId,
          clues: [], chat: [], votes: {}, result: null,
          deadlineAt: new Date(Date.now() + DURATION.WORD_REVEAL),
        };
        room.phase = "WORD_REVEAL";
        room.isStarting = false;
        room.lastWordPairHash = getWordPairHash(pair);
        room.revision += 1;
        return { ok: true, data: { roundId: room.round.id } };
      });
      if (result.error) cancelStart(attempt);
      else publish(attempt.room);
      acknowledge(result);
    } catch (error) {
      if (attempt?.room) cancelStart(attempt);
      acknowledge(failure("INTERNAL_SERVER_ERROR", "Gagal menyiapkan ronde."));
      console.error("Game start failed:", error.name);
    }
  }

  function act(socket, payload, acknowledge, action) {
    if (typeof acknowledge !== "function") return;
    let affectedRoom;
    try {
      const result = withPlayer(socket, (room, playerId) => {
        affectedRoom = room;
        const round = room.round;
        if (!round || payload?.roundId !== round.id) {
          return failure("INVALID_ROUND", "Ronde sudah berubah atau tidak tersedia.");
        }
        if (!round.players.some((member) => member.playerId === playerId)) {
          return failure("NOT_A_PARTICIPANT", "Pemain bukan peserta ronde ini.");
        }
        const phaseBefore = room.phase;
        const turnBefore = round.turnIndex;
        advanceExpired(room, round);
        if (phaseBefore !== room.phase || turnBefore !== round.turnIndex) {
          return failure("ACTION_EXPIRED", "Batas waktu aksi sudah berakhir.");
        }
        if (action === "restart") {
          if (room.hostId !== playerId) return failure("HOST_ONLY", "Hanya host yang bisa kembali ke lobby.");
          if (room.phase !== "RESULT") return failure("INVALID_PHASE", "Ronde belum selesai.");
          room.round = null;
          room.phase = "WAITING";
          room.isStarting = false;
          room.revision += 1;
          const onlineIds = getOnlinePlayerIds(io, `room:${room.code}`);
          for (const member of room.players) {
            member.disconnectExpiresAt = onlineIds.has(member.id) ? null : new Date(Date.now() + 30000);
            if (member.disconnectExpiresAt) scheduleExpiry(room.code, member.id, member.disconnectExpiresAt);
          }
          return { ok: true };
        }
        const expectedPhase = { clue: "CLUE", chat: "DISCUSSION", vote: "VOTING" }[action];
        if (room.phase !== expectedPhase) return failure("INVALID_PHASE", "Aksi tidak tersedia pada fase ini.");
        if (action === "clue") {
          if (round.turnOrder[round.turnIndex] !== playerId) {
            return failure("NOT_YOUR_TURN", "Sekarang bukan giliranmu.");
          }
          if (round.clues.some((clue) => clue.playerId === playerId)) {
            return failure("ALREADY_SUBMITTED", "Petunjuk sudah diterima.");
          }
          const validation = validateClue(payload.text, round.playerWords[playerId]);
          if (!validation.valid) return failure("INVALID_CLUE", validation.reason);
          round.clues = [...round.clues, { playerId, text: payload.text.trim(), skipped: false }];
          nextClue(room, round, Date.now());
        } else if (action === "chat") {
          const text = typeof payload.text === "string" ? payload.text.trim() : "";
          if (!text || text.length > 500) return failure("INVALID_MESSAGE", "Pesan harus berisi 1–500 karakter.");
          round.chat = [...round.chat, {
            id: randomUUID(), playerId, text, sentAt: new Date().toISOString(),
          }].slice(-50);
        } else if (action === "vote") {
          const validation = validateVote({
            voterId: playerId, targetPlayerId: payload.targetPlayerId,
            activePlayers: round.players, votes: round.votes,
          });
          if (!validation.valid) return failure(validation.code, validation.reason);
          round.votes = { ...round.votes, [playerId]: payload.targetPlayerId };
          if (Object.keys(round.votes).length === round.players.length) finishRound(room, round);
        }
        room.revision += 1;
        return { ok: true };
      });
      if (affectedRoom) publish(affectedRoom);
      acknowledge(result);
    } catch (error) {
      acknowledge(failure("INTERNAL_SERVER_ERROR", "Gagal memproses aksi permainan."));
      console.error("Game action failed:", error.name);
    }
  }

  return {
    clearRoundTimer,
    register(socket) {
      socket.on("game:start", (payload, acknowledge) => start(socket, payload, acknowledge));
      for (const [event, action] of Object.entries({
        "clue:submit": "clue", "chat:send": "chat", "vote:submit": "vote", "game:restart": "restart",
      })) {
        socket.on(event, (payload, acknowledge) => act(socket, payload, acknowledge, action));
      }
    },
  };
};
