const { createHash, randomBytes } = require("node:crypto");
const { Room, RoomPlayer, sequelize } = require("../models");

const LOBBY_GRACE_MS = 30000;

function failure(code, message) {
  return { ok: false, error: { code, message } };
}

function findRoomPlayers(roomId, transaction) {
  return RoomPlayer.findAll({
    where: { roomId },
    attributes: ["id", "nickname", "disconnectExpiresAt"],
    order: [["id", "ASC"]],
    transaction,
  });
}

function getRoomSockets(io, channel) {
  return [...(io.sockets.adapter.rooms.get(channel) || [])]
    .map((id) => io.sockets.sockets.get(id))
    .filter(Boolean);
}

function getOnlinePlayerIds(io, channel) {
  return new Set(getRoomSockets(io, channel).map((socket) => socket.data.playerId));
}

function clearRoomBinding(socket) {
  delete socket.data.roomCode;
  delete socket.data.playerId;
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

async function enterRoom(io, socket, payload, acknowledge, action) {
  if (typeof acknowledge !== "function") return;
  const isCreate = action === "create";
  const isResume = action === "resume";
  const previousPlayerId = socket.data.playerId;
  if (socket.data.enteringRoom || socket.data.leavingRoom || (previousPlayerId && !isResume)) {
    return acknowledge(failure("ALREADY_IN_ROOM", "Pemain sedang masuk atau sudah berada di room."));
  }

  const nickname = typeof payload?.nickname === "string" ? payload.nickname.trim() : "";
  if (!isResume && (!nickname || nickname.length > 255)) {
    return acknowledge(failure("INVALID_NICKNAME", "Masukkan nickname yang valid."));
  }

  const code = typeof payload?.code === "string" ? payload.code.trim().toUpperCase() : "";
  if (!isCreate && (!code || code.length > 255)) {
    return acknowledge(failure("INVALID_ROOM_CODE", "Masukkan kode room yang valid."));
  }
  if (previousPlayerId && socket.data.roomCode !== code) {
    return acknowledge(failure("ALREADY_IN_ROOM", "Pemain sudah berada di room lain."));
  }
  if (isResume && (typeof payload.sessionToken !== "string" || !/^[0-9a-f]{64}$/.test(payload.sessionToken))) {
    return acknowledge(failure("SESSION_EXPIRED", "Sesi room tidak valid atau sudah berakhir."));
  }

  socket.data.enteringRoom = true;
  let channel;
  let result;
  let replacement;

  try {
    const sessionToken = isResume ? payload.sessionToken : randomBytes(32).toString("hex");
    const sessionTokenHash = createHash("sha256").update(sessionToken).digest("hex");

    result = await sequelize.transaction(async (transaction) => {
      const room = isCreate
        ? await Room.create({
          code: randomBytes(3).toString("hex").toUpperCase(),
        }, { transaction })
        : await Room.findOne({
          where: { code },
          lock: transaction.LOCK.UPDATE,
          transaction,
        });

      if (!room) {
        return isResume
          ? failure("SESSION_EXPIRED", "Sesi room tidak valid atau sudah berakhir.")
          : failure("ROOM_NOT_FOUND", "Room tidak ditemukan.");
      }

      let player;
      if (isResume) {
        player = await RoomPlayer.findOne({
          where: { roomId: room.id, sessionTokenHash },
          transaction,
        });
        const expiresAt = player?.disconnectExpiresAt;
        if (!player || (room.phase === "WAITING" && expiresAt && expiresAt.getTime() <= Date.now())) {
          return failure("SESSION_EXPIRED", "Sesi room tidak valid atau sudah berakhir.");
        }
        if (previousPlayerId && previousPlayerId !== player.id) {
          return failure("ALREADY_IN_ROOM", "Koneksi sudah terikat ke pemain lain.");
        }
        await player.update({ disconnectExpiresAt: null }, { transaction });
      } else {
        if (room.phase !== "WAITING" || room.isStarting) {
          return failure("ROUND_IN_PROGRESS", "Room sedang menjalankan ronde.");
        }
        if (!isCreate) {
          const playerCount = await RoomPlayer.count({ where: { roomId: room.id }, transaction });
          if (playerCount >= 6) return failure("ROOM_FULL", "Room sudah penuh.");
        }
        player = await RoomPlayer.create({ roomId: room.id, nickname, sessionTokenHash }, { transaction });
      }
      const players = await findRoomPlayers(room.id, transaction);

      if (!socket.connected) throw new Error("Socket disconnected during room entry.");
      channel = `room:${room.code}`;
      const oldSocket = isResume && getRoomSockets(io, channel)
        .find((client) => client.id !== socket.id && client.data.playerId === player.id);
      socket.data.roomCode = room.code;
      socket.data.playerId = player.id;
      await socket.join(channel);

      if (oldSocket) {
        replacement = { socket: oldSocket, playerId: player.id };
        clearRoomBinding(oldSocket);
      }

      const onlinePlayerIds = getOnlinePlayerIds(io, channel);
      const hostId = onlinePlayerIds.has(room.hostId)
        ? room.hostId
        : players.find((member) => onlinePlayerIds.has(member.id))?.id ?? null;
      await room.update({ hostId, revision: room.revision + 1 }, { transaction });

      return { room, player, players };
    });

    if (result.error) return acknowledge(result);

    const { room, player, players } = result;
    if (replacement) replacement.socket.disconnect();
    acknowledge({ ok: true, data: { code: room.code, playerId: player.id, sessionToken } });
    emitRoomState(io, room, players);
  } catch (error) {
    if (!result && channel && !previousPlayerId) {
      await socket.leave(channel);
      clearRoomBinding(socket);
    }
    if (!result && replacement) {
      replacement.socket.data.roomCode = code;
      replacement.socket.data.playerId = replacement.playerId;
      if (!replacement.socket.connected) handleDisconnect(io, replacement.socket);
    }
    if (!result) acknowledge(failure("INTERNAL_SERVER_ERROR", "Gagal masuk ke room."));
    console.error("Room entry failed:", error.name);
  } finally {
    delete socket.data.enteringRoom;
    if (!socket.connected) handleDisconnect(io, socket);
  }
}

async function changePresence(io, code, playerId, action, socket) {
  return sequelize.transaction(async (transaction) => {
    const room = await Room.findOne({
      where: { code },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!room) return;
    if (action === "leave" && socket.data.playerId !== playerId) {
      return failure("SESSION_EXPIRED", "Sesi sudah berpindah ke koneksi lain.");
    }

    let players = await findRoomPlayers(room.id, transaction);
    const player = players.find((member) => member.id === playerId);
    if (!player) return;

    const onlinePlayerIds = getOnlinePlayerIds(io, `room:${room.code}`);
    if (action === "disconnect" && onlinePlayerIds.has(playerId)) return;
    if (action === "expire" && (
      room.phase !== "WAITING" || onlinePlayerIds.has(playerId)
      || !player.disconnectExpiresAt || player.disconnectExpiresAt.getTime() > Date.now()
    )) return;
    onlinePlayerIds.delete(playerId);

    let disconnectExpiresAt;
    if (action === "disconnect") {
      disconnectExpiresAt = room.phase === "WAITING" ? new Date(Date.now() + LOBBY_GRACE_MS) : null;
      await player.update({ disconnectExpiresAt }, { transaction });
    } else {
      await player.destroy({ transaction });
      players = players.filter((member) => member.id !== playerId);
    }

    const hostId = room.hostId === playerId || room.hostId === null
      ? players.find((member) => onlinePlayerIds.has(member.id))?.id ?? null
      : room.hostId;

    await room.update({ hostId, revision: room.revision + 1 }, { transaction });
    return { room, players, disconnectExpiresAt };
  });
}

function scheduleExpiry(io, code, playerId, disconnectExpiresAt) {
  const delay = Math.max(0, disconnectExpiresAt.getTime() - Date.now());
  setTimeout(() => updateDisconnectedPlayer(io, code, playerId, "expire"), delay).unref();
}

async function updateDisconnectedPlayer(io, code, playerId, action = "disconnect") {
  try {
    const result = await changePresence(io, code, playerId, action);
    if (!result) return;

    emitRoomState(io, result.room, result.players);
    if (result.disconnectExpiresAt) {
      scheduleExpiry(io, code, playerId, result.disconnectExpiresAt);
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
    const result = await changePresence(io, roomCode, playerId, "leave", socket);
    if (result?.error) return acknowledge(result);
    await socket.leave(`room:${roomCode}`);
    clearRoomBinding(socket);
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

async function restoreLobbyReservations(io) {
  const rooms = await Room.findAll({ where: { phase: "WAITING" }, attributes: ["id", "code"] });
  if (!rooms.length) return;

  const roomCodes = new Map(rooms.map((room) => [room.id, room.code]));
  const roomIds = [...roomCodes.keys()];
  await RoomPlayer.update({ disconnectExpiresAt: new Date(Date.now() + LOBBY_GRACE_MS) }, {
    where: { roomId: roomIds, disconnectExpiresAt: null },
  });
  const players = await RoomPlayer.findAll({
    where: { roomId: roomIds },
    attributes: ["id", "roomId", "disconnectExpiresAt"],
  });
  for (const player of players) {
    const code = roomCodes.get(player.roomId);
    if (player.disconnectExpiresAt.getTime() <= Date.now()) {
      await changePresence(io, code, player.id, "expire");
    } else {
      scheduleExpiry(io, code, player.id, player.disconnectExpiresAt);
    }
  }
}

module.exports = async (io) => {
  await restoreLobbyReservations(io);
  io.on("connection", (socket) => {
    socket.on("room:create", (payload, acknowledge) => {
      return enterRoom(io, socket, payload, acknowledge, "create");
    });
    socket.on("room:join", (payload, acknowledge) => {
      return enterRoom(io, socket, payload, acknowledge, "join");
    });
    socket.on("room:resume", (payload, acknowledge) => {
      return enterRoom(io, socket, payload, acknowledge, "resume");
    });
    socket.on("room:leave", (acknowledge) => leaveRoom(io, socket, acknowledge));
    socket.on("disconnect", () => handleDisconnect(io, socket));
  });
};
