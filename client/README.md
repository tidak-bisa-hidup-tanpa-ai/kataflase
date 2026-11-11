# Kataflase — Client

SPA Vite + React untuk Kataflase. Lihat [PRD](../PRD.md) dan [ADR](../ADR.md).

## Menjalankan

```bash
cd client
npm install
cp .env.example .env   # isi VITE_SERVER_URL dengan URL server
npm run dev
```

| Variabel          | Contoh                  | Keterangan                         |
| ----------------- | ----------------------- | ---------------------------------- |
| `VITE_SERVER_URL` | `http://localhost:3000` | URL server Express + Socket.IO     |

Fallback rute SPA sudah disiapkan untuk Netlify (`public/_redirects`) dan Vercel (`vercel.json`).

## Struktur

```
src/
  App.jsx                   Router: /, /rooms/:code, /rooms/:code/result
  constant/                 url (SERVER_URL), game (fase, batas), errors (pesan error)
  socket/index.js           Instance socket.io-client
  contexts/GameContext.js   createContext + hook useGame
  contexts/GameProvider.jsx Sesi, socket, snapshot publik, state privat, aksi
  views/                    HomePage, RoomPage, ResultPage, NotFoundPage
  components/RoomGate.jsx   Sesi kedaluwarsa, tautan langsung, resume
  components/room/          Header room, fase, pemain, kartu kata, clue, chat
  components/phases/        Lobby, WordReveal, Clue, Discussion, Voting
  helpers/                  api, session, room, toast, useCountdown
```

## Kontrak data yang dipakai client

Client mengikuti kontrak di ADR. Bentuk field di bawah adalah usulan client dan perlu disepakati dengan server.

### Jumlah pemain

Room bisa mulai dengan **4–12 pemain** online (`MIN_PLAYERS` dan `MAX_PLAYERS` di `src/constant/game.js`). Server juga harus memakai batas yang sama: tolak start di bawah 4 pemain (`NOT_ENOUGH_PLAYERS`) dan tolak pemain ke-13 (`ROOM_FULL`).

### ACK semua event client → server

```js
{ ok: true, data: { ... } }
{ ok: false, code: 'NOT_YOUR_TURN', message: 'opsional' }
```

| Event           | Payload                         | `data` saat sukses                       |
| --------------- | ------------------------------- | ---------------------------------------- |
| `room:create`   | `{ nickname }`                  | `{ code, playerId, token }`              |
| `room:join`     | `{ code, nickname }`            | `{ code, playerId, token }`              |
| `room:resume`   | `{ code, token }`               | `{}` (opsional `{ room, player }`)       |
| `room:leave`    | `{ code }`                      | `{}`                                     |
| `game:start`    | `{ category }` (`'random'` = Acak) | `{}`                                  |
| `game:restart`  | `{ roundId }`                   | `{}`                                     |
| `clue:submit`   | `{ roundId, text }`             | `{}`                                     |
| `chat:send`     | `{ roundId, text }`             | `{}`                                     |
| `vote:submit`   | `{ roundId, targetPlayerId }`   | `{}`                                     |

Kode error yang sudah punya pesan di client ada di `src/constant/errors.js`. Kode `SESSION_EXPIRED`, `INVALID_SESSION`, `NOT_IN_ROOM`, dan `ROOM_NOT_FOUND` membuat client menghapus sesi dan menampilkan jalan kembali ke Home.

### `room:state` (server → room)

```json
{
  "code": "KOPI42",
  "revision": 17,
  "serverNow": "2026-11-11T08:00:00.000Z",
  "hostId": "p1",
  "phase": "VOTING",
  "isStarting": false,
  "players": [
    { "id": "p1", "nickname": "Ani", "online": true, "joinOrder": 1 },
    { "id": "p2", "nickname": "Budi", "online": false, "joinOrder": 2 }
  ],
  "roundId": "r-abc",
  "participants": ["p1", "p2", "p3", "p4"],
  "turnOrder": ["p3", "p1", "p4", "p2"],
  "currentTurnPlayerId": null,
  "deadlineAt": "2026-11-11T08:00:45.000Z",
  "clues": [
    { "playerId": "p3", "text": "pagi" },
    { "playerId": "p1", "text": null, "skipped": true }
  ],
  "chat": [{ "id": "m1", "playerId": "p2", "text": "Kok daun?", "sentAt": "…" }],
  "voteProgress": { "voted": 3, "total": 4 },
  "result": null
}
```

Saat `phase` = `RESULT`:

```json
"result": {
  "impostorId": "p2",
  "winner": "CIVILIAN",
  "reason": "Budi mendapat suara terbanyak dan dia impostor.",
  "words": [{ "playerId": "p1", "word": "Kopi" }, { "playerId": "p2", "word": "Teh" }],
  "tally": [{ "playerId": "p2", "votes": 3 }, { "playerId": "p1", "votes": 0 }],
  "abstainCount": 1
}
```

`winner` bernilai `CIVILIAN` atau `IMPOSTOR`. Di lobby (`WAITING`), field ronde boleh `null` atau array kosong. Client mengabaikan snapshot dengan `revision` lebih kecil dari yang sudah diterima.

### `player:state` (server → pemain)

```json
{ "roundId": "r-abc", "word": "Kopi", "hasVoted": false }
```

Kata hanya ditampilkan jika `roundId` sama dengan `room:state.roundId`.

### `GET /api/game-options`

```json
{ "categories": [{ "id": "makanan", "label": "Makanan & Minuman" }] }
```

Client selalu menambahkan opsi **Acak** (`id: "random"`) di urutan pertama.
