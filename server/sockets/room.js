const { createHash, randomBytes } = require("node:crypto");
const { Room, RoomPlayer, sequelize } = require("../models");

function failure(code, message) {
  return { ok: false, error: { code, message } };
}

function findRoomPlayers(roomId, transaction) {
  return RoomPlayer.findAll({
    where: { roomId },
    attributes: ["id", "nickname"],
    order: [["id", "ASC"]],
    transaction,
  });
}

function getOnlinePlayerIds(io, channel) {
  return new Set(
    [...(io.sockets.adapter.rooms.get(channel) || [])]
      .map((id) => io.sockets.sockets.get(id)?.data.playerId),
  );
}

function emitRoomState(io, room, players) {
  const channel = `room:${room.code}`;
  const onlinePlayerIds = getOnlinePlayerIds(io, channel);

  io.to(channel).emit("room:state", {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    revision: room.revision,
    isStarting: room.isStarting,
    players: players.map((member) => ({
      playerId: member.id,
      nickname: member.nickname,
      online: onlinePlayerIds.has(member.id),
    })),
  });
}

async function enterRoom(io, socket, payload, acknowledge, isJoin) {
  if (typeof acknowledge !== "function") return;
  if (socket.data.enteringRoom || socket.data.playerId) {
    return acknowledge(failure("ALREADY_IN_ROOM", "Pemain sedang masuk atau sudah berada di room."));
  }

  const nickname = typeof payload?.nickname === "string" ? payload.nickname.trim() : "";
  if (!nickname || nickname.length > 255) {
    return acknowledge(failure("INVALID_NICKNAME", "Masukkan nickname yang valid."));
  }

  const code = typeof payload?.code === "string" ? payload.code.trim().toUpperCase() : "";
  if (isJoin && (!code || code.length > 255)) {
    return acknowledge(failure("INVALID_ROOM_CODE", "Masukkan kode room yang valid."));
  }

  socket.data.enteringRoom = true;
  let channel;
  let result;

  try {
    const sessionToken = randomBytes(32).toString("hex");
    const sessionTokenHash = createHash("sha256").update(sessionToken).digest("hex");

    result = await sequelize.transaction(async (transaction) => {
      const room = isJoin
        ? await Room.findOne({
          where: { code },
          lock: transaction.LOCK.UPDATE,
          transaction,
        })
        : await Room.create({
          code: randomBytes(3).toString("hex").toUpperCase(),
        }, { transaction });

      if (!room) return failure("ROOM_NOT_FOUND", "Room tidak ditemukan.");
      if (room.phase !== "WAITING" || room.isStarting) {
        return failure("ROUND_IN_PROGRESS", "Room sedang menjalankan ronde.");
      }
      if (isJoin) {
        const playerCount = await RoomPlayer.count({ where: { roomId: room.id }, transaction });
        if (playerCount >= 6) return failure("ROOM_FULL", "Room sudah penuh.");
      }

      const player = await RoomPlayer.create({
        roomId: room.id,
        nickname,
        sessionTokenHash,
      }, { transaction });

      await room.update({
        hostId: room.hostId ?? player.id,
        revision: room.revision + 1,
      }, { transaction });

      const players = await findRoomPlayers(room.id, transaction);

      if (!socket.connected) throw new Error("Socket disconnected during room entry.");
      channel = `room:${room.code}`;
      socket.data.roomCode = room.code;
      socket.data.playerId = player.id;
      await socket.join(channel);

      return { room, player, players };
    });

    if (result.error) return acknowledge(result);

    const { room, player, players } = result;
    acknowledge({ ok: true, data: { code: room.code, playerId: player.id, sessionToken } });
    emitRoomState(io, room, players);
  } catch (error) {
    if (!result && channel) {
      await socket.leave(channel);
      delete socket.data.roomCode;
      delete socket.data.playerId;
    }
    if (!result) acknowledge(failure("INTERNAL_SERVER_ERROR", "Gagal masuk ke room."));
    console.error("Room entry failed:", error.name);
  } finally {
    delete socket.data.enteringRoom;
    if (!socket.connected) handleDisconnect(io, socket);
  }
}

async function changePresence(io, code, playerId, action) {
  return sequelize.transaction(async (transaction) => {
    const room = await Room.findOne({
      where: { code },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!room) return;

    let players = await findRoomPlayers(room.id, transaction);
    const player = players.find((member) => member.id === playerId);
    if (!player) return;

    const onlinePlayerIds = getOnlinePlayerIds(io, `room:${room.code}`);
    if (action === "expire" && (room.phase !== "WAITING" || onlinePlayerIds.has(playerId))) return;
    onlinePlayerIds.delete(playerId);

    if (action !== "disconnect") {
      await player.destroy({ transaction });
      players = players.filter((member) => member.id !== playerId);
    }

    const hostId = room.hostId === playerId || room.hostId === null
      ? players.find((member) => onlinePlayerIds.has(member.id))?.id ?? null
      : room.hostId;

    await room.update({ hostId, revision: room.revision + 1 }, { transaction });
    return { room, players };
  });
}

async function updateDisconnectedPlayer(io, code, playerId, action = "disconnect") {
  try {
    const result = await changePresence(io, code, playerId, action);
    if (!result) return;

    emitRoomState(io, result.room, result.players);
    if (action === "disconnect" && result.room.phase === "WAITING") {
      setTimeout(() => updateDisconnectedPlayer(io, code, playerId, "expire"), 30000).unref();
    }
  } catch (error) {
    console.error("Room disconnect update failed:", error.name);
  }
}

function handleDisconnect(io, socket) {
  const { roomCode, playerId, enteringRoom, leavingRoom } = socket.data;
  if (!playerId || enteringRoom || leavingRoom) return;
  return updateDisconnectedPlayer(io, roomCode, playerId);
}

async function leaveRoom(io, socket, acknowledge) {
  if (typeof acknowledge !== "function") return;
  const { roomCode, playerId, enteringRoom, leavingRoom } = socket.data;
  if (!playerId || enteringRoom || leavingRoom) {
    return acknowledge(failure("NOT_IN_ROOM", "Pemain belum masuk atau sedang keluar dari room."));
  }

  socket.data.leavingRoom = true;
  try {
    const result = await changePresence(io, roomCode, playerId, "leave");
    await socket.leave(`room:${roomCode}`);
    delete socket.data.roomCode;
    delete socket.data.playerId;
    acknowledge({ ok: true });
    if (result) emitRoomState(io, result.room, result.players);
  } catch (error) {
    acknowledge(failure("INTERNAL_SERVER_ERROR", "Gagal keluar dari room."));
    console.error("Room leave failed:", error.name);
  } finally {
    delete socket.data.leavingRoom;
    if (!socket.connected) handleDisconnect(io, socket);
  }
}

module.exports = (io) => {
  io.on("connection", (socket) => {
    socket.on("room:create", (payload, acknowledge) => {
      return enterRoom(io, socket, payload, acknowledge, false);
    });
    socket.on("room:join", (payload, acknowledge) => {
      return enterRoom(io, socket, payload, acknowledge, true);
    });
    socket.on("room:leave", (acknowledge) => leaveRoom(io, socket, acknowledge));
    socket.on("disconnect", () => handleDisconnect(io, socket));
  });
};
