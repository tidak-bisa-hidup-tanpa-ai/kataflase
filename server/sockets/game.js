const { randomUUID } = require("node:crypto");
const { Room, RoomPlayer, Round, sequelize } = require("../models");
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
    votes: round.votes,
    players: round.players,
    impostorId: round.impostorId,
    playerWords: round.playerWords,
  });
  room.phase = "RESULT";
  round.deadlineAt = null;
}

function nextClue(room, round, now) {
  round.turnIndex += 1;
  room.phase = round.turnIndex < round.turnOrder.length ? "CLUE" : "DISCUSSION";
  round.deadlineAt = new Date(now + DURATION[room.phase]);
}

async function advanceExpired(room, round, transaction) {
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
  if (changed) {
    room.revision += 1;
    await room.save({ transaction });
    await round.save({ transaction });
  }
  return changed;
}

module.exports = (io, { emitRoomState, getOnlinePlayerIds, scheduleExpiry }) => {
  const timers = new Map();

  function schedule(state) {
    if (!state) return;
    const { room, round } = state;
    const previous = timers.get(room.code);
    if (previous && previous.revision > room.revision) return;
    clearTimeout(previous?.timer);
    const entry = { revision: room.revision };
    timers.set(room.code, entry);
    if (!round?.deadlineAt || room.phase === "RESULT") return;
    const deadline = round.deadlineAt.getTime();
    entry.timer = setTimeout(async () => {
      try {
        const changed = await sequelize.transaction(async (transaction) => {
          const currentRoom = await Room.findByPk(room.id, { lock: transaction.LOCK.UPDATE, transaction });
          const currentRound = await Round.findOne({ where: { roomId: room.id }, transaction });
          if (!currentRoom || currentRound?.id !== round.id
            || currentRound.deadlineAt?.getTime() !== deadline) return false;
          await advanceExpired(currentRoom, currentRound, transaction);
          return true;
        });
        if (changed) await publish(room);
      } catch (error) {
        console.error("Game timer failed:", error.name);
        entry.timer = setTimeout(() => publish(room).catch((err) => {
          console.error("Game timer recovery failed:", err.name);
        }), 1000).unref();
      }
    }, Math.max(0, deadline - Date.now())).unref();
  }

  async function publish(room) {
    schedule(await emitRoomState(io, room));
  }

  async function withPlayer(socket, callback) {
    const { roomCode, playerId } = socket.data;
    if (!playerId) return failure("NOT_IN_ROOM", "Masuk ke room terlebih dahulu.");
    return sequelize.transaction(async (transaction) => {
      const room = await Room.findOne({ where: { code: roomCode }, lock: transaction.LOCK.UPDATE, transaction });
      if (!room || !socket.connected || socket.data.playerId !== playerId
        || socket.data.roomCode !== roomCode || socket.data.leavingRoom) {
        return failure("SESSION_EXPIRED", "Sesi room sudah tidak aktif.");
      }
      const player = await RoomPlayer.findOne({ where: { id: playerId, roomId: room.id }, transaction });
      if (!player) return failure("SESSION_EXPIRED", "Sesi room sudah tidak aktif.");
      return callback(room, playerId, transaction);
    });
  }

  async function start(socket, payload, acknowledge) {
    if (typeof acknowledge !== "function") return;
    const requestedCategory = payload?.category ?? "acak";
    if (!isValidCategory(requestedCategory)) {
      return acknowledge(failure("INVALID_CATEGORY", "Kategori tidak tersedia."));
    }
    let attempt;
    try {
      attempt = await withPlayer(socket, async (room, playerId, transaction) => {
        if (room.hostId !== playerId) return failure("HOST_ONLY", "Hanya host yang bisa memulai ronde.");
        if (room.phase !== "WAITING" || room.isStarting) {
          return failure("ROUND_IN_PROGRESS", "Ronde sudah berjalan atau sedang disiapkan.");
        }
        const members = await RoomPlayer.findAll({ where: { roomId: room.id }, order: [["id", "ASC"]], transaction });
        const onlineIds = getOnlinePlayerIds(io, `room:${room.code}`);
        if (members.length < 3 || members.length > 6 || members.some((member) => !onlineIds.has(member.id))) {
          return failure("PLAYERS_NOT_READY", "Ronde memerlukan 3–6 pemain dan semuanya harus online.");
        }
        const categories = getAvailableCategories().filter((category) => category !== "acak");
        const category = requestedCategory === "acak"
          ? categories[Math.floor(Math.random() * categories.length)] : requestedCategory;
        await room.update({ isStarting: true, revision: room.revision + 1 }, { transaction });
        return {
          room, category, revision: room.revision,
          players: members.map((member) => ({ playerId: member.id, nickname: member.nickname })),
        };
      });
      if (attempt.error) return acknowledge(attempt);
      await publish(attempt.room);
      const pair = await generateWordPair(attempt.category, attempt.room.lastWordPairHash);
      const result = await withPlayer(socket, async (room, playerId, transaction) => {
        if (room.id !== attempt.room.id || room.phase !== "WAITING" || !room.isStarting
          || room.revision !== attempt.revision || room.hostId !== playerId) {
          return failure("START_CANCELLED", "Susunan pemain berubah. Silakan mulai lagi.");
        }
        const onlineIds = getOnlinePlayerIds(io, `room:${room.code}`);
        if (attempt.players.some((player) => !onlineIds.has(player.playerId))) {
          await room.update({ isStarting: false, revision: room.revision + 1 }, { transaction });
          return failure("START_CANCELLED", "Ada pemain yang terputus. Silakan mulai lagi.");
        }
        const setup = setupRound(attempt.players, pair);
        const round = await Round.create({
          id: randomUUID(), roomId: room.id, category: attempt.category, source: pair.source,
          players: attempt.players, turnOrder: setup.turnOrder, playerWords: setup.playerWords,
          impostorId: setup.impostorId, deadlineAt: new Date(Date.now() + DURATION.WORD_REVEAL),
        }, { transaction });
        await room.update({
          phase: "WORD_REVEAL", isStarting: false,
          lastWordPairHash: getWordPairHash(pair), revision: room.revision + 1,
        }, { transaction });
        return { ok: true, data: { roundId: round.id } };
      });
      if (result.error) await cancelStart(attempt);
      await publish(attempt.room);
      acknowledge(result);
    } catch (error) {
      if (attempt?.room) await cancelStart(attempt).catch(() => {});
      acknowledge(failure("INTERNAL_SERVER_ERROR", "Gagal menyiapkan ronde."));
      console.error("Game start failed:", error.name);
    }
  }

  async function cancelStart(attempt) {
    await sequelize.transaction(async (transaction) => {
      const room = await Room.findByPk(attempt.room.id, { lock: transaction.LOCK.UPDATE, transaction });
      if (room?.phase === "WAITING" && room.isStarting && room.revision === attempt.revision) {
        await room.update({ isStarting: false, revision: room.revision + 1 }, { transaction });
      }
    });
    await publish(attempt.room);
  }

  async function act(socket, payload, acknowledge, action) {
    if (typeof acknowledge !== "function") return;
    let affectedRoom;
    try {
      const result = await withPlayer(socket, async (room, playerId, transaction) => {
        affectedRoom = room;
        const round = await Round.findOne({ where: { roomId: room.id }, transaction });
        if (!round || payload?.roundId !== round.id) {
          return failure("INVALID_ROUND", "Ronde sudah berubah atau tidak tersedia.");
        }
        if (!round.players.some((player) => player.playerId === playerId)) {
          return failure("NOT_A_PARTICIPANT", "Pemain bukan peserta ronde ini.");
        }
        const phaseBefore = room.phase;
        const turnBefore = round.turnIndex;
        await advanceExpired(room, round, transaction);
        if (phaseBefore !== room.phase || turnBefore !== round.turnIndex) {
          return failure("ACTION_EXPIRED", "Batas waktu aksi sudah berakhir.");
        }
        if (action === "restart") {
          if (room.hostId !== playerId) return failure("HOST_ONLY", "Hanya host yang bisa kembali ke lobby.");
          if (room.phase !== "RESULT") return failure("INVALID_PHASE", "Ronde belum selesai.");
          await round.destroy({ transaction });
          await room.update({ phase: "WAITING", isStarting: false, revision: room.revision + 1 }, { transaction });
          const onlineIds = getOnlinePlayerIds(io, `room:${room.code}`);
          const members = await RoomPlayer.findAll({ where: { roomId: room.id }, transaction });
          for (const member of members) {
            await member.update({
              disconnectExpiresAt: onlineIds.has(member.id) ? null : new Date(Date.now() + 30000),
            }, { transaction });
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
            voterId: playerId, targetPlayerId: payload.targetPlayerId, activePlayers: round.players,
            votes: round.votes,
          });
          if (!validation.valid) return failure(validation.code, validation.reason);
          round.votes = { ...round.votes, [playerId]: payload.targetPlayerId };
          if (Object.keys(round.votes).length === round.players.length) finishRound(room, round);
        }
        room.revision += 1;
        await room.save({ transaction });
        await round.save({ transaction });
        return { ok: true };
      });
      if (affectedRoom) {
        await publish(affectedRoom);
        if (action === "restart" && result.ok) {
          const offlineMembers = await RoomPlayer.findAll({ where: { roomId: affectedRoom.id } });
          for (const member of offlineMembers) {
            if (member.disconnectExpiresAt) scheduleExpiry(io, affectedRoom.code, member.id, member.disconnectExpiresAt);
          }
        }
      }
      acknowledge(result);
    } catch (error) {
      acknowledge(failure("INTERNAL_SERVER_ERROR", "Gagal memproses aksi permainan."));
      console.error("Game action failed:", error.name);
    }
  }

  return {
    register(socket) {
      socket.on("game:start", (payload, acknowledge) => start(socket, payload, acknowledge));
      for (const [event, action] of Object.entries({
        "clue:submit": "clue", "chat:send": "chat", "vote:submit": "vote", "game:restart": "restart",
      })) {
        socket.on(event, (payload, acknowledge) => act(socket, payload, acknowledge, action));
      }
    },
    async restore() {
      const rooms = await Room.findAll();
      for (const room of rooms) {
        await sequelize.transaction(async (transaction) => {
          const currentRoom = await Room.findByPk(room.id, { lock: transaction.LOCK.UPDATE, transaction });
          if (currentRoom.isStarting) {
            await currentRoom.update({ isStarting: false, revision: currentRoom.revision + 1 }, { transaction });
          }
          const round = await Round.findOne({ where: { roomId: room.id }, transaction });
          await advanceExpired(currentRoom, round, transaction);
        });
        await publish(room);
      }
    },
  };
};
