const { createHash, randomBytes } = require("node:crypto");
const { Room, RoomPlayer, sequelize } = require("../models");

function failure(code, message) {
  return { ok: false, error: { code, message } };
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
        hostId: isJoin ? room.hostId : player.id,
        revision: room.revision + 1,
      }, { transaction });

      const players = await RoomPlayer.findAll({
        where: { roomId: room.id },
        attributes: ["id", "nickname"],
        order: [["id", "ASC"]],
        transaction,
      });

      if (!socket.connected) throw new Error("Socket disconnected during room entry.");
      channel = `room:${room.code}`;
      socket.data.playerId = player.id;
      await socket.join(channel);

      return { room, player, players };
    });

    if (result.error) return acknowledge(result);

    const { room, player, players } = result;
    const onlinePlayerIds = new Set(
      [...(io.sockets.adapter.rooms.get(channel) || [])]
        .map((id) => io.sockets.sockets.get(id)?.data.playerId),
    );

    acknowledge({ ok: true, data: { code: room.code, playerId: player.id, sessionToken } });
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
  } catch (error) {
    if (!result && channel) {
      await socket.leave(channel);
      delete socket.data.playerId;
    }
    if (!result) acknowledge(failure("INTERNAL_SERVER_ERROR", "Gagal masuk ke room."));
    console.error("Room entry failed:", error.name);
  } finally {
    delete socket.data.enteringRoom;
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
  });
};
