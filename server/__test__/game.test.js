const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const path = require("node:path");
const test = require("node:test");
const { setTimeout: delay } = require("node:timers/promises");
const { io } = require(path.join(path.dirname(require.resolve("socket.io")), "../client-dist/socket.io.js"));
const { getWordPairHash } = require("../helpers/wordBank");

async function until(check, label, timeout = 7000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = check();
    if (result) return result;
    await delay(20);
  }
  throw new Error(`Timed out: ${label}`);
}

test("room, satu ronde, replay, dan restart berjalan tanpa database", { timeout: 120000 }, async (t) => {
  const clients = [];
  let server;
  let url;
  async function startServer() {
    let output = "";
    server = spawn(process.execPath, ["bin/www.js"], {
      cwd: path.join(__dirname, ".."), windowsHide: true,
      // Lewati .env lokal agar tes fallback tidak memakai key Gemini pengguna.
      env: { ...process.env, NODE_ENV: "production", PORT: "0", GEMINI_API_KEY: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (chunk) => { output += chunk; });
    server.stderr.on("data", (chunk) => { output += chunk; });
    const port = await until(() => {
      if (server.exitCode !== null) throw new Error(output);
      return /listening on port (\d+)/.exec(output)?.[1];
    }, "server startup");
    url = `http://127.0.0.1:${port}`;
  }
  async function stopServer() {
    if (server?.exitCode === null) {
      const stopped = once(server, "exit");
      server.kill();
      await stopped;
    }
  }
  t.after(async () => {
    clients.forEach((client) => client.socket.disconnect());
    await stopServer();
  });
  async function connect() {
    const client = {
      socket: io(url, { transports: ["websocket"], autoConnect: false, reconnection: false }),
      states: [], privateStates: [],
    };
    clients.push(client);
    client.socket.on("room:state", (state) => client.states.push(state));
    client.socket.on("player:state", (state) => client.privateStates.push(state));
    client.socket.connect();
    await until(() => client.socket.connected, "socket connected");
    return client;
  }
  function send(client, event, payload) {
    return new Promise((resolve, reject) => {
      const acknowledge = (error, reply) => error ? reject(error) : resolve(reply);
      if (payload === undefined) client.socket.timeout(7000).emit(event, acknowledge);
      else client.socket.timeout(7000).emit(event, payload, acknowledge);
    });
  }
  const state = (client) => client.states.at(-1);
  const waitPhase = (client, phase, timeout) => until(() => state(client)?.phase === phase && state(client), `phase ${phase}`, timeout);
  async function error(client, event, payload, expected) {
    const reply = await send(client, event, payload);
    assert.equal(reply.ok, false, JSON.stringify(reply));
    if (expected) assert.equal(reply.error.code, expected);
  }
  async function enter(client, event, payload) {
    const reply = await send(client, event, payload);
    assert.equal(reply.ok, true, JSON.stringify(reply));
    client.session = reply.data;
    return reply.data;
  }

  await startServer();
  assert.deepEqual(await (await fetch(`${url}/health`)).json(), { data: { status: "ok" } });
  assert.ok((await (await fetch(`${url}/api/game-options`)).json()).data.categories.includes("acak"));
  const rejected = await fetch(url + "/socket.io/?EIO=4&transport=polling", {
    headers: { Origin: "https://outside.example" },
  });
  assert.equal(rejected.status, 403);
  const solo = await connect();
  const empty = await enter(solo, "room:create", { nickname: "Room kosong" });
  assert.equal((await send(solo, "room:leave")).ok, true);
  await error(solo, "room:join", { code: empty.code, nickname: "Kembali" }, "ROOM_NOT_FOUND");
  const abandoned = await enter(solo, "room:create", { nickname: "Room offline" });
  solo.socket.disconnect();
  const team = await Promise.all([connect(), connect(), connect()]);
  await error(team[0], "room:create", { nickname: " " }, "INVALID_NICKNAME");
  const first = await enter(team[0], "room:create", { nickname: "Host" });
  await error(team[0], "game:start", {}, "PLAYERS_NOT_READY");
  for (let i = 1; i < team.length; i++) {
    await enter(team[i], "room:join", { code: first.code.toLowerCase(), nickname: `Pemain ${i}` });
  }
  const custom = { category: "custom", customCategory: "Futsal" };
  await error(team[1], "game:start", custom, "HOST_ONLY");
  for (const customCategory of [undefined, " ", 123, "a".repeat(51), "Tema\nLain"]) {
    await error(team[0], "game:start", { ...custom, customCategory }, "INVALID_CUSTOM_CATEGORY");
  }
  await error(team[0], "game:start", custom, "CUSTOM_CATEGORY_UNAVAILABLE");
  await until(() => state(team[0])?.phase === "WAITING" && !state(team[0]).isStarting, "custom start unlocked");
  const outsider = await connect();
  await enter(outsider, "room:create", { nickname: "Room lain" });
  const started = await send(team[0], "game:start", { category: "makanan" });
  assert.equal(started.ok, true);
  const roundId = started.data.roundId;
  assert.equal(state(team[0]).source, "wordbank");
  const words = {};
  for (const client of team) {
    const personal = await until(() => client.privateStates.at(-1)?.roundId === roundId && client.privateStates.at(-1), "private word");
    words[client.session.playerId] = personal.word;
    assert.deepEqual(Object.keys(personal).sort(), ["hasVoted", "roundId", "word"]);
    assert.equal(typeof client.session.playerId, "number");
  }
  await error(team[1], "vote:submit", { roundId, targetPlayerId: first.playerId }, "INVALID_PHASE");
  await error(team[1], "clue:hint", { roundId }, "INVALID_PHASE");
  await error(outsider, "clue:hint", { roundId }, "INVALID_ROUND");
  await error(outsider, "clue:submit", { roundId, text: "unik" }, "INVALID_ROUND");
  await waitPhase(team[0], "CLUE", 12000);
  for (const id of state(team[0]).turnOrder) {
    const client = team.find((member) => member.session.playerId === id);
    await until(() => state(client).currentTurnPlayerId === id, "clue turn");
    const waiting = team.find((member) => member !== client);
    await error(waiting, "clue:hint", { roundId }, "NOT_YOUR_TURN");
    const hints = await Promise.all([
      send(client, "clue:hint", { roundId }),
      send(client, "clue:hint", { roundId }),
    ]);
    assert.equal(hints[0].ok, true);
    assert.equal(hints[0].data.source, "fallback");
    assert.ok(hints[0].data.hint);
    assert.deepEqual(hints[0], hints[1]);
    await error(client, "clue:submit", { roundId, text: [...words[id]].join(" . ") }, "INVALID_CLUE");
    const replies = await Promise.all([
      send(client, "clue:submit", { roundId, text: "unik" }),
      send(client, "clue:submit", { roundId, text: "unik" }),
    ]);
    assert.equal(replies.filter((reply) => reply.ok).length, 1);
  }
  await waitPhase(team[0], "DISCUSSION");
  assert.equal((await send(team[0], "chat:send", { roundId, text: "Siapa yang dicurigai?" })).ok, true);
  await until(() => team.every((client) => state(client)?.chat.length === 1), "chat sync");

  const offlineSession = team[1].session;
  team[1].socket.disconnect();
  const lobbyHost = await connect();
  const lobby = await enter(lobbyHost, "room:create", { nickname: "Lobby host" });
  const guests = await Promise.all(Array.from({ length: 6 }, () => connect()));
  const joins = await Promise.all(guests.map((client, i) => send(client, "room:join", { code: lobby.code, nickname: `Tamu ${i}` })));
  assert.equal(joins.filter((reply) => reply.ok).length, 5);
  assert.equal(joins.find((reply) => !reply.ok).error.code, "ROOM_FULL");
  joins.forEach((reply, i) => { if (reply.ok) guests[i].session = reply.data; });
  await until(() => state(lobbyHost).players.length === 6, "full lobby");
  assert.equal((await send(lobbyHost, "room:leave")).ok, true);
  const nextHostId = state(lobbyHost).players[1].playerId;
  const nextHost = guests.find((client) => client.session?.playerId === nextHostId);
  await until(() => state(nextHost)?.hostId === nextHostId, "host transfer");
  const departing = guests.find((client) => client.session && client !== nextHost);
  const departed = departing.session;
  departing.socket.disconnect();
  await until(() => state(nextHost)?.players.some((player) => player.playerId === departed.playerId && !player.online), "offline presence");
  await until(() => !state(nextHost)?.players.some((player) => player.playerId === departed.playerId), "30-second expiry", 35000);
  const expired = await connect();
  await error(expired, "room:resume", departed, "SESSION_EXPIRED");
  await error(expired, "room:join", { code: abandoned.code, nickname: "Kembali" }, "ROOM_NOT_FOUND");
  team[1] = await connect();
  await enter(team[1], "room:resume", offlineSession);
  assert.equal(team[1].privateStates.at(-1).word, words[offlineSession.playerId]);
  assert.equal(state(team[1]).phase, "DISCUSSION");
  await waitPhase(team[0], "VOTING", 35000);

  const frequencies = Object.values(words).reduce((counts, word) => ({ ...counts, [word]: (counts[word] || 0) + 1 }), {});
  const impostorId = Number(Object.keys(words).find((id) => frequencies[words[id]] === 1));
  const voter = team.find((client) => client.session.playerId !== impostorId);
  await error(voter, "vote:submit", { roundId, targetPlayerId: voter.session.playerId }, "CANNOT_VOTE_SELF");
  const burst = await Promise.all(Array.from({ length: 20 }, () => send(voter, "vote:submit", {
    roundId, targetPlayerId: impostorId, voterId: impostorId,
  })));
  assert.equal(burst.filter((reply) => reply.ok).length, 1);
  assert.ok(burst.filter((reply) => !reply.ok).every((reply) => reply.error.code === "ALREADY_VOTED"));
  const resumed = await connect();
  await enter(resumed, "room:resume", voter.session);
  team[team.indexOf(voter)] = resumed;
  assert.equal(resumed.privateStates.at(-1).hasVoted, true);
  await until(() => !voter.socket.connected, "old connection replaced");
  for (const client of team) {
    for (const snapshot of client.states.filter((item) => item.roundId === roundId && item.phase !== "RESULT")) {
      assert.equal(snapshot.result, null);
      assert.ok(!/"(playerWords|impostorId|sessionTokenHash|sessionToken|hint|recap)"/.test(JSON.stringify(snapshot)));
    }
  }
  const remaining = team.filter((client) => client !== resumed);
  const votes = await Promise.all(remaining.map((client) => send(client, "vote:submit", {
    roundId, targetPlayerId: client.session.playerId === impostorId ? resumed.session.playerId : impostorId,
  })));
  assert.ok(votes.every((reply) => reply.ok));
  const result = await waitPhase(team[0], "RESULT");
  assert.equal(result.result.winner, "CIVILIANS");
  assert.equal(result.result.impostorId, impostorId);
  assert.deepEqual(result.result.playerWords, words);
  await until(() => team.every((client) => state(client)?.result?.recap?.source === "fallback"), "recap sync");
  assert.ok(state(team[0]).result.recap.recap);
  assert.deepEqual(state(team[0]).result.recap, state(team[1]).result.recap);
  assert.ok(outsider.states.every((snapshot) => snapshot.code !== first.code && snapshot.roundId === null));
  const host = team.find((client) => client.session.playerId === result.hostId);
  assert.equal((await send(host, "game:restart", { roundId })).ok, true);
  assert.equal(state(host).code, first.code);
  assert.equal(state(host).phase, "WAITING");
  assert.equal(state(host).roundId, null);
  for (const field of ["clues", "chat", "participants", "turnOrder"]) assert.deepEqual(state(host)[field], []);
  assert.deepEqual(state(host).voting, { submitted: 0, total: 0 });
  assert.equal(host.privateStates.at(-1).word, null);
  assert.equal(host.privateStates.at(-1).hasVoted, false);
  await error(host, "vote:submit", { roundId, targetPlayerId: impostorId }, "INVALID_ROUND");
  const nextStart = await send(host, "game:start", { category: "makanan" });
  assert.equal(nextStart.ok, true);
  await until(() => team.every((client) => client.privateStates.at(-1)?.roundId === nextStart.data.roundId), "new private words");
  const nextWords = [...new Set(team.map((client) => client.privateStates.at(-1).word))];
  const previousWords = Object.keys(frequencies);
  assert.notEqual(getWordPairHash({ wordA: nextWords[0], wordB: nextWords[1] }), getWordPairHash({ wordA: previousWords[0], wordB: previousWords[1] }));

  const oldSession = host.session;
  await stopServer();
  clients.forEach((client) => client.socket.disconnect());
  await startServer();
  const fresh = await connect();
  await error(fresh, "room:resume", oldSession, "SESSION_EXPIRED");
  await error(fresh, "room:join", { code: oldSession.code, nickname: "Kembali" }, "ROOM_NOT_FOUND");
  await enter(fresh, "room:create", { nickname: "Room baru" });
  assert.equal(state(fresh).phase, "WAITING");
  assert.equal(state(fresh).players.length, 1);
});
