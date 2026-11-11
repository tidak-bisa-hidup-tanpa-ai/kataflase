# Kataflase Server

Jalankan semua perintah setup dari folder `server`. Pasang dependency dengan `npm ci`, salin `.env.example` menjadi `.env` jika belum ada, lalu isi `GEMINI_API_KEY` jika ingin memakai AI. Jalankan `npm start`. Port bawaan adalah `3000`. Origin frontend bawaan adalah `http://localhost:5173` saat development dan `https://kataflase.dipatipaw.web.id` saat `NODE_ENV=production`. Gunakan `PORT` dan `CLIENT_ORIGIN` di environment server untuk mengganti keduanya.

Express dan Socket.IO menggunakan port yang sama.

## Penyimpanan room

Room, sesi pemain, dan ronde disimpan di memory satu proses Node.js. Aplikasi tidak memakai database. Saat deployment, gunakan satu instance server dan atur `CLIENT_ORIGIN` serta `GEMINI_API_KEY` melalui environment hosting. Hosting dapat menyediakan `PORT`. Handshake Socket.IO dengan header `Origin` hanya menerima origin frontend yang dikonfigurasi server. Klien tanpa header `Origin` tetap tunduk pada aturan sesi dan batas percobaan.

Restart, crash, atau redeploy menghapus semua room dan ronde. Kode room lama tidak dapat digunakan lagi. Client yang mencoba `room:resume` dengan sesi lama menerima `SESSION_EXPIRED`; `room:join` ke room yang hilang menerima `ROOM_NOT_FOUND`. Host membuat room baru dan pemain lain memasukkan kode baru. Refresh browser atau reconnect tetap dapat memulihkan sesi selama proses server yang sama masih berjalan dan sesi valid.

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

ACK gagal memakai `{ "ok": false, "error": { "code": "ROOM_FULL", "message": "Room sudah penuh." } }`. Kode lain yang dapat diterima adalah `INVALID_NICKNAME`, `INVALID_ROOM_CODE`, `ROOM_CAPACITY`, `ROOM_CREATE_LIMIT`, `ALREADY_IN_ROOM`, `ROOM_NOT_FOUND`, `ROUND_IN_PROGRESS`, `NOT_IN_ROOM`, `SESSION_EXPIRED`, dan `INTERNAL_SERVER_ERROR`.

Server mengirim `room:state` terbaru ke anggota room setelah create, join, resume, leave, atau pembaruan presence. `online` menunjukkan status koneksi saat snapshot dibuat. `serverNow` berisi waktu server saat snapshot dikirim dalam format ISO dan menjadi acuan hitung mundur.

Saat koneksi putus di lobby, pemain ditandai offline. Server menahan slot selama 30 detik, lalu melepasnya jika pemain masih offline dan room masih di fase `WAITING`. Saat ronde berjalan, pemain offline tetap tercatat. Jika host keluar atau putus koneksi, pemain online yang paling awal bergabung mengambil alih.

Room dihapus saat anggota terakhir keluar atau sesi lobby terakhir habis. Di luar lobby, jika semua anggota offline, room dihapus setelah lima menit tanpa koneksi. Resume yang berhasil membatalkan penghapusan. Batas per instance adalah 100 room tersimpan dan 30 pembuatan room per menit.

```json
{
  "code": "A3D19F",
  "hostId": 1,
  "phase": "WAITING",
  "revision": 1,
  "serverNow": "2026-11-11T02:59:50.000Z",
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
| `game:start` | `{ "category": "makanan" }` | Host memulai ronde ketika 3–6 anggota online. Jika kategori tidak dikirim, gunakan `acak`. Untuk kategori sendiri, kirim `{ "category": "custom", "customCategory": "Futsal" }` dengan nama 1–50 karakter dalam satu baris. ACK sukses: `{ "ok": true, "data": { "roundId": "<uuid>" } }`. |
| `clue:submit` | `{ "roundId": "<uuid>", "text": "Hangat" }` | Satu clue, maksimal 100 karakter, pada giliran sendiri. Kata sendiri atau bagiannya yang dipisah spasi/simbol, seperti `k o p i` dan `k.o.p.i`, ditolak. |
| `clue:hint` | `{ "roundId": "<uuid>" }` | Saat giliran sendiri, minta saran yang hanya dikembalikan lewat ACK privat `{ "ok": true, "data": { "hint": "aroma pagi", "source": "ai" } }`. Hasil dipakai ulang pada giliran yang sama. Jika Gemini gagal, sumbernya `fallback`. Jika tidak ada saran yang lolos validasi, kode penolakan `HINT_UNAVAILABLE`. |
| `chat:send` | `{ "roundId": "<uuid>", "text": "Menurutku Ari" }` | Pesan 1–500 karakter selama `DISCUSSION`. Riwayat menyimpan 50 pesan terakhir. |
| `vote:submit` | `{ "roundId": "<uuid>", "targetPlayerId": 2 }` | Target memakai ID angka dari daftar peserta. Satu suara terkunci; tidak boleh memilih diri sendiri. |
| `game:restart` | `{ "roundId": "<uuid>" }` | Host kembali dari `RESULT` ke `WAITING`, menghapus data ronde, mempertahankan kode room dan sesi anggota. |

ACK sukses selain `game:start` dan `clue:hint`: `{ "ok": true }`. ACK gagal mengikuti format lobby. Kode game meliputi `HOST_ONLY`, `PLAYERS_NOT_READY`, `INVALID_CATEGORY`, `INVALID_CUSTOM_CATEGORY`, `CUSTOM_CATEGORY_UNAVAILABLE`, `ROUND_IN_PROGRESS`, `START_CANCELLED`, `INVALID_ROUND`, `NOT_A_PARTICIPANT`, `INVALID_PHASE`, `ACTION_EXPIRED`, `NOT_YOUR_TURN`, `ALREADY_SUBMITTED`, `INVALID_CLUE`, `INVALID_MESSAGE`, `ALREADY_VOTED`, `CANNOT_VOTE_SELF`, dan `INVALID_TARGET`.

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

Setelah hasil dikirim, server menambahkan `result.recap` dengan bentuk `{ "recap": "...", "source": "ai" }` atau sumber `fallback`. Hasil voting dan tombol main lagi tersedia selama ulasan diproses.

### AI dan siklus ronde

Isi `GEMINI_API_KEY` di `server/.env` atau environment deployment. Contoh variabel tersedia di `server/.env.example`. Key tidak dikirim ke client. Model utama `gemini-3.5-flash-lite` (7 detik) diikuti model cadangan `gemini-3.1-flash-lite` (5 detik) jika gagal, timeout, atau respons tidak valid. Gunakan `GEMINI_PRIMARY_MODEL` dan `GEMINI_FALLBACK_MODEL` untuk mengganti pilihan model. Batas per instance adalah 12 panggilan Gemini per menit, termasuk panggilan ke model cadangan. Jika kedua model gagal, key belum ada, atau batas tercapai sebelum memperoleh pasangan valid, kategori bawaan memakai word bank. Untuk kategori sendiri, server mengembalikan `CUSTOM_CATEGORY_UNAVAILABLE` dan room tetap di lobby agar host bisa mencoba lagi atau memilih kategori bawaan. Kedua model Gemini yang berhasil tetap menghasilkan `source: "ai"`; client menunggu ACK `game:start` sampai 15 detik. Hash pasangan terakhir tetap disimpan di room setelah replay untuk mencegah pasangan identik, termasuk urutan terbalik.

Respons AI dengan pembungkus markdown atau teks pengantar dibaca dari objek JSON-nya, lalu tetap diperiksa tipe, panjang, dan pasangan katanya. Field tambahan dari respons AI tidak diteruskan ke game state.

Ronde dan deadline hanya disimpan di memory. Client memakai `room:resume` untuk menerima snapshot dan kata pribadi setelah refresh atau koneksi terputus, selama server masih berjalan. Server menolak aksi yang melewati deadline dan mengabaikan callback timer dari ronde yang sudah berubah. Jika anggota berubah saat AI sedang menyiapkan kata, start dibatalkan agar host dapat mencoba lagi.

Hasil dipertahankan sampai host memilih main lagi atau room dihapus. Replay mengosongkan state ronde lama dan mempertahankan kode room serta sesi anggota. Anggota offline kembali mengikuti reservasi lobby 30 detik. Restart server menghapus seluruh state tersebut.
