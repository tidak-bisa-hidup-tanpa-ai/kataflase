const { createHash, randomBytes } = require("node:crypto");
const createGameEvents = require("./game");
const createRateLimit = require("../helpers/rateLimit");

const LOBBY_GRACE_MS = 30_000;
const EMPTY_ROOM_GRACE_MS = 5 * 60_000;
const MAX_ROOMS = 100;

function failure(code, message) {
  return { ok: false, error: { code, message } };
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

function emitRoomState(io, room) {
  const { players, round } = room;
  const channel = `room:${room.code}`;
  const onlinePlayerIds = getOnlinePlayerIds(io, channel);

  io.to(channel).emit("room:state", {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    revision: room.revision,
    serverNow: new Date().toISOString(),
    isStarting: room.isStarting,
    players: players.map((member) => ({
      playerId: member.id,
      nickname: member.nickname,
      online: onlinePlayerIds.has(member.id),
    })),
    roundId: round?.id ?? null,
    category: round?.category ?? null,
    source: round?.source ?? null,
    participants: round?.players ?? [],
    turnOrder: round?.turnOrder ?? [],
    currentTurnPlayerId: room.phase === "CLUE" ? round.turnOrder[round.turnIndex] : null,
    deadlineAt: round?.deadlineAt?.toISOString() ?? null,
    clues: round?.clues ?? [],
    chat: round?.chat ?? [],
    voting: { submitted: Object.keys(round?.votes ?? {}).length, total: round?.players.length ?? 0 },
    result: room.phase === "RESULT" ? round?.result ?? null : null,
  });
  for (const client of getRoomSockets(io, channel)) {
    if (!players.some((member) => member.id === client.data.playerId)) continue;
    client.emit("player:state", {
      roundId: round?.id ?? null,
      word: round?.playerWords[client.data.playerId] ?? null,
      hasVoted: Object.hasOwn(round?.votes ?? {}, client.data.playerId),
    });
  }
  return { room, players, round };
}

module.exports = (io) => {
  const rooms = new Map();
  const allowRoomCreation = createRateLimit(30);
  let nextPlayerId = 1;

  function enterRoom(socket, payload, acknowledge, action) {
    if (typeof acknowledge !== "function") return;
    const isCreate = action === "create";
    const isResume = action === "resume";
    const previousPlayerId = socket.data.playerId;
    if (previousPlayerId && !isResume) {
      return acknowledge(failure("ALREADY_IN_ROOM", "Pemain sudah berada di room."));
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

    try {
      let room = rooms.get(code);
      if (isCreate) {
        if (rooms.size >= MAX_ROOMS) {
          return acknowledge(failure("ROOM_CAPACITY", "Server sedang penuh. Coba lagi nanti."));
        }
        if (!allowRoomCreation()) {
          return acknowledge(failure("ROOM_CREATE_LIMIT", "Terlalu banyak room dibuat. Coba lagi sebentar."));
        }
        let newCode;
        do {
          newCode = randomBytes(3).toString("hex").toUpperCase();
        } while (rooms.has(newCode));
        room = {
          code: newCode, hostId: null, phase: "WAITING", revision: 0,
          isStarting: false, lastWordPairHash: null, players: [], round: null,
        };
      }
      if (!room) {
        return acknowledge(isResume
          ? failure("SESSION_EXPIRED", "Sesi room tidak valid atau sudah berakhir.")
          : failure("ROOM_NOT_FOUND", "Room tidak ditemukan."));
      }

      const sessionToken = isResume ? payload.sessionToken : randomBytes(32).toString("hex");
      const sessionTokenHash = createHash("sha256").update(sessionToken).digest("hex");
      let player;
      if (isResume) {
        player = room.players.find((member) => member.sessionTokenHash === sessionTokenHash);
        if (!player || (room.phase === "WAITING" && player.disconnectExpiresAt?.getTime() <= Date.now())) {
          return acknowledge(failure("SESSION_EXPIRED", "Sesi room tidak valid atau sudah berakhir."));
        }
        if (previousPlayerId && previousPlayerId !== player.id) {
          return acknowledge(failure("ALREADY_IN_ROOM", "Koneksi sudah terikat ke pemain lain."));
        }
      } else {
        if (room.phase !== "WAITING" || room.isStarting) {
          return acknowledge(failure("ROUND_IN_PROGRESS", "Room sedang menjalankan ronde."));
        }
        if (room.players.length >= 6) return acknowledge(failure("ROOM_FULL", "Room sudah penuh."));
        player = { id: nextPlayerId++, nickname, sessionTokenHash, disconnectExpiresAt: null };
      }
      if (!socket.connected) return acknowledge(failure("SESSION_EXPIRED", "Koneksi sudah terputus."));

      const channel = `room:${room.code}`;
      const oldSocket = isResume && getRoomSockets(io, channel)
        .find((client) => client.id !== socket.id && client.data.playerId === player.id);
      socket.join(channel);
      clearTimeout(room.emptyTimer);
      room.emptyTimer = null;
      socket.data.roomCode = room.code;
      socket.data.playerId = player.id;
      player.disconnectExpiresAt = null;
      if (!isResume) room.players.push(player);
      if (isCreate) rooms.set(room.code, room);
      if (oldSocket) {
        clearRoomBinding(oldSocket);
        oldSocket.disconnect();
      }

      const onlineIds = getOnlinePlayerIds(io, channel);
      if (!onlineIds.has(room.hostId)) {
        room.hostId = room.players.find((member) => onlineIds.has(member.id))?.id ?? null;
      }
      room.isStarting = false;
      room.revision += 1;
      emitRoomState(io, room);
      acknowledge({ ok: true, data: { code: room.code, playerId: player.id, sessionToken } });
    } catch (error) {
      acknowledge(failure("INTERNAL_SERVER_ERROR", "Gagal masuk ke room."));
      console.error("Room entry failed:", error.name);
    }
  }

  function removeRoom(room) {
    clearTimeout(room.emptyTimer);
    game.clearRoundTimer(room.code);
    rooms.delete(room.code);
  }

  function changePresence(code, playerId, action) {
    const room = rooms.get(code);
    const player = room?.players.find((member) => member.id === playerId);
    if (!player) return;
    const onlineIds = getOnlinePlayerIds(io, `room:${room.code}`);
    if (action === "disconnect" && onlineIds.has(playerId)) return;
    if (action === "expire" && (
      room.phase !== "WAITING" || onlineIds.has(playerId)
      || !player.disconnectExpiresAt || player.disconnectExpiresAt.getTime() > Date.now()
    )) return;
    onlineIds.delete(playerId);

    if (action === "disconnect") {
      player.disconnectExpiresAt = room.phase === "WAITING" ? new Date(Date.now() + LOBBY_GRACE_MS) : null;
      if (player.disconnectExpiresAt) scheduleExpiry(code, playerId, player.disconnectExpiresAt);
    } else {
      room.players = room.players.filter((member) => member.id !== playerId);
    }
    if (!room.players.length) {
      removeRoom(room);
      return;
    }
    if (!onlineIds.size && room.phase !== "WAITING" && !room.emptyTimer) {
      room.emptyTimer = setTimeout(() => {
        if (rooms.get(code) === room && !getOnlinePlayerIds(io, `room:${code}`).size) removeRoom(room);
      }, EMPTY_ROOM_GRACE_MS).unref();
    }
    if (room.hostId === playerId || room.hostId === null) {
      room.hostId = room.players.find((member) => onlineIds.has(member.id))?.id ?? null;
    }
    room.isStarting = false;
    room.revision += 1;
    emitRoomState(io, room);
  }

  function scheduleExpiry(code, playerId, expiresAt) {
    setTimeout(() => changePresence(code, playerId, "expire"), Math.max(0, expiresAt.getTime() - Date.now())).unref();
  }

  function leaveRoom(socket, acknowledge) {
    if (typeof acknowledge !== "function") return;
    const { roomCode, playerId } = socket.data;
    if (!playerId) return acknowledge(failure("NOT_IN_ROOM", "Pemain belum masuk ke room."));
    socket.leave(`room:${roomCode}`);
    clearRoomBinding(socket);
    changePresence(roomCode, playerId, "leave");
    acknowledge({ ok: true });
  }

  const game = createGameEvents(io, { rooms, emitRoomState, getOnlinePlayerIds, scheduleExpiry });
  io.on("connection", (socket) => {
    game.register(socket);
    for (const action of ["create", "join", "resume"]) {
      socket.on(`room:${action}`, (payload, acknowledge) => enterRoom(socket, payload, acknowledge, action));
    }
    socket.on("room:leave", (acknowledge) => leaveRoom(socket, acknowledge));
    socket.on("disconnect", () => {
      const { roomCode, playerId } = socket.data;
      if (playerId) changePresence(roomCode, playerId, "disconnect");
    });
  });
};
