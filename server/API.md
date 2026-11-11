# Kataflase Server

Jalankan semua perintah setup dari folder `server`. Pasang dependency dengan `npm ci`, salin `.env.example` menjadi `.env`, lalu isi `GEMINI_API_KEY` jika ingin memakai AI. Siapkan PostgreSQL sesuai langkah di bawah, jalankan migration, kemudian `npm start`. Port bawaan adalah `3000` dan origin frontend bawaan adalah `http://localhost:5173`. Gunakan `PORT` dan `CLIENT_ORIGIN` di environment server untuk mengganti keduanya.

Express dan Socket.IO menggunakan port yang sama.

## PostgreSQL

Gunakan `config/config.json` bawaan Sequelize CLI. Isi bagian `development` dengan koneksi lokal dan set `dialect` ke `postgres`. Gunakan database yang terpisah untuk `test`. Saat deployment, konfigurasi `production` memakai `use_env_variable: "DATABASE_URL"` dan `dialect: "postgres"`. Atur `NODE_ENV=production`, `DATABASE_URL`, `CLIENT_ORIGIN`, dan `GEMINI_API_KEY` melalui environment hosting.

Jalankan migration dari folder server setelah database tersedia.

```sh
npx sequelize-cli db:migrate
```

## GET /health

Memeriksa bahwa server HTTP dapat merespons. Respons HTTP `200 OK`.

```json
{
  "data": {
    "status": "ok"
  }
}
```

## Socket.IO lobby

Kirim callback ACK saat memanggil event lobby.

| Event | Payload | Hasil |
| --- | --- | --- |
| `room:create` | `{ "nickname": "Ari" }` | Membuat room dan menjadikan pemain pertama sebagai host. |
| `room:join` | `{ "code": "A3D19F", "nickname": "Citra" }` | Bergabung ke lobby dengan maksimal enam pemain. Kode dapat ditulis dengan huruf kecil atau besar. |
| `room:resume` | `{ "code": "A3D19F", "sessionToken": "<token sesi>" }` | Mengikat sesi lama ke koneksi baru dengan kode room dan `playerId` yang sama. Koneksi sebelumnya dilepas. |
| `room:leave` | Callback ACK saja | Mengakhiri sesi dan melepas keanggotaan room. Peserta ronde tetap ada di daftar peserta ronde sampai hasil. ACK sukses berisi `{ "ok": true }`. |

ACK sukses untuk create, join, atau resume hanya dikirim ke socket yang meminta. Client dapat menyimpan kode dan token di `sessionStorage`, lalu memanggil `room:resume` setelah terhubung kembali.

```json
{
  "ok": true,
  "data": {
    "code": "A3D19F",
    "playerId": 1,
    "sessionToken": "<token sesi>"
  }
}
```

ACK gagal memakai `{ "ok": false, "error": { "code": "ROOM_FULL", "message": "Room sudah penuh." } }`. Kode lain yang dapat diterima adalah `INVALID_NICKNAME`, `INVALID_ROOM_CODE`, `ALREADY_IN_ROOM`, `ROOM_NOT_FOUND`, `ROUND_IN_PROGRESS`, `NOT_IN_ROOM`, `SESSION_EXPIRED`, dan `INTERNAL_SERVER_ERROR`.

Server mengirim `room:state` terbaru ke anggota room setelah create, join, resume, leave, atau pembaruan presence. `online` menunjukkan status koneksi saat snapshot dibuat.

Saat koneksi putus di lobby, pemain ditandai offline. Server menahan slot selama 30 detik, lalu melepasnya jika pemain masih offline dan room masih di fase `WAITING`. Saat ronde berjalan, pemain offline tetap tercatat. Jika host keluar atau putus koneksi, pemain online yang paling awal bergabung mengambil alih. Saat semua pemain offline, room tetap ada dan pemain online berikutnya dapat menjadi host.

Server menyimpan batas reservasi lobby di PostgreSQL. Saat restart, slot yang sudah offline mengikuti batas semula. Pemain lobby yang masih terhubung sebelum server berhenti mendapat 30 detik untuk resume setelah server hidup kembali.

```json
{
  "code": "A3D19F",
  "hostId": 1,
  "phase": "WAITING",
  "revision": 1,
  "isStarting": false,
  "players": [{ "playerId": 1, "nickname": "Ari", "online": true }]
}
```

## GET /api/game-options

Mengambil kategori untuk pilihan host. Respons `200 OK`:

```json
{
  "data": {
    "categories": ["makanan", "hewan", "teknologi", "olahraga", "transportasi", "acak"]
  }
}
```

## Socket.IO game

Semua aksi memerlukan callback ACK. Identitas pemain diambil dari sesi socket; jangan kirim identitas pemilih atau kata rahasia di payload.

| Event | Payload | Hasil |
| --- | --- | --- |
| `game:start` | `{ "category": "makanan" }` | Host memulai ronde ketika 3–6 anggota online. Jika kategori tidak dikirim, gunakan `acak`. ACK sukses: `{ "ok": true, "data": { "roundId": "<uuid>" } }`. |
| `clue:submit` | `{ "roundId": "<uuid>", "text": "Hangat" }` | Satu clue, maksimal 100 karakter, pada giliran sendiri. Kata sendiri atau bagiannya yang dipisah spasi/simbol, seperti `k o p i` dan `k.o.p.i`, ditolak. |
| `chat:send` | `{ "roundId": "<uuid>", "text": "Menurutku Ari" }` | Pesan 1–500 karakter selama `DISCUSSION`. Riwayat menyimpan 50 pesan terakhir. |
| `vote:submit` | `{ "roundId": "<uuid>", "targetPlayerId": 2 }` | Target memakai ID angka dari daftar peserta. Satu suara terkunci; tidak boleh memilih diri sendiri. |
| `game:restart` | `{ "roundId": "<uuid>" }` | Host kembali dari `RESULT` ke `WAITING`, menghapus data ronde, mempertahankan kode room dan sesi anggota. |

ACK sukses selain start: `{ "ok": true }`. ACK gagal mengikuti format lobby. Kode game meliputi `HOST_ONLY`, `PLAYERS_NOT_READY`, `INVALID_CATEGORY`, `ROUND_IN_PROGRESS`, `START_CANCELLED`, `INVALID_ROUND`, `NOT_A_PARTICIPANT`, `INVALID_PHASE`, `ACTION_EXPIRED`, `NOT_YOUR_TURN`, `ALREADY_SUBMITTED`, `INVALID_CLUE`, `INVALID_MESSAGE`, `ALREADY_VOTED`, `CANNOT_VOTE_SELF`, dan `INVALID_TARGET`.

Fase berjalan otomatis: `WAITING` → `WORD_REVEAL` (10 detik) → `CLUE` (30 detik per pemain) → `DISCUSSION` (60 detik) → `VOTING` (45 detik) → `RESULT`. Clue yang melewati waktu dicatat dengan `text: null` dan `skipped: true`. Voting selesai lebih cepat jika seluruh peserta sudah memilih. Yang belum memilih saat waktu habis dianggap abstain. Impostor kalah hanya jika menjadi satu-satunya kandidat dengan suara terbanyak.

### Snapshot publik dan privat

`room:state` tetap menggunakan field lobby dan menambahkan field berikut. Client memakai `revision` terbaru dan tidak perlu menyusun state dari event terpisah.

```json
{
  "roundId": "<uuid>",
  "category": "makanan",
  "source": "ai",
  "participants": [{ "playerId": 1, "nickname": "Ari" }],
  "turnOrder": [1, 2, 3],
  "currentTurnPlayerId": 1,
  "deadlineAt": "2026-11-11T03:00:00.000Z",
  "clues": [{ "playerId": 1, "text": "Hangat", "skipped": false }],
  "chat": [{ "id": "<uuid>", "playerId": 1, "text": "Menurutku Ari", "sentAt": "2026-11-11T03:00:00.000Z" }],
  "voting": { "submitted": 1, "total": 3 },
  "result": null
}
```

`players` adalah anggota room saat ini; `participants` adalah daftar peserta yang dibekukan saat start, termasuk peserta yang keluar. Gunakan `participants` sebagai kandidat voting. `source` bernilai `ai` atau `wordbank`. Di lobby, field ronde bernilai `null`, array kosong, dan progres voting nol. `currentTurnPlayerId` hanya terisi pada fase `CLUE`. `deadlineAt` bernilai `null` saat lobby atau hasil; countdown browser dihitung dari waktu tersebut.

`player:state` hanya dikirim ke socket pemain terkait, termasuk saat resume:

```json
{
  "roundId": "<uuid>",
  "word": "Kopi",
  "hasVoted": false
}
```

Client mencocokkan `roundId` sebelum menampilkan kata. Saat kembali ke lobby, server mengirim `roundId: null`, `word: null`, dan `hasVoted: false` untuk membersihkan tampilan privat.

Sebelum `RESULT`, kata pemain lain, identitas impostor, dan pilihan suara tidak dikirim dalam snapshot publik. Pada `RESULT`, `result` berisi `winner` (`CIVILIANS` atau `IMPOSTOR`), `impostorId`, `voteTally`, `highestVoteCount`, `topCandidates`, `reason`, dan `playerWords`.

### AI dan pemulihan ronde

Isi `GEMINI_API_KEY` di `server/.env` atau environment deployment. Contoh variabel tersedia di `server/.env.example`. Key tidak dikirim ke client. Kegagalan API, timeout lima detik, atau respons invalid memakai word bank. Hash pasangan terakhir tetap disimpan di room setelah replay untuk mencegah pasangan identik, termasuk urutan terbalik.

Respons AI dengan pembungkus markdown atau teks pengantar dibaca dari objek JSON-nya, lalu tetap diperiksa tipe, panjang, dan pasangan katanya. Field tambahan dari respons AI tidak diteruskan ke game state.

Ronde disimpan di tabel `Rounds` melalui migration. Jalankan `npx sequelize-cli db:migrate` sebelum menjalankan server setelah pembaruan ini. Startup memulihkan fase dan deadline yang tersimpan serta memproses fase yang sudah kedaluwarsa. Client tetap memanggil `room:resume` untuk menerima snapshot dan kata pribadi. Jika restart terjadi saat menunggu AI, status start dilepas sehingga host bisa mencoba lagi.

Hasil dipertahankan sampai host memilih main lagi. Replay menghapus satu baris ronde lama dan mempertahankan `Rooms` serta sesi anggota. Anggota offline kembali mengikuti reservasi lobby 30 detik.
