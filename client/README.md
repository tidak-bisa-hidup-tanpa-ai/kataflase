# Kataflase — Client

SPA Vite + React untuk Kataflase. Lihat [PRD](../docs/PRD.md), [ADR](../docs/ADR.md), dan [kontrak API server](../server/API.md).

## Menjalankan

Jalankan server terlebih dahulu mengikuti dokumentasi server, lalu buka terminal lain:

```bash
cd client
npm ci
cp -n .env.example .env
npm run dev
```

Isi `VITE_SERVER_URL` dengan URL server Express + Socket.IO. Nilai bawaan adalah `http://localhost:3000`; Vite berjalan di `http://localhost:5173`.

```bash
npm run lint
npm test
npm run build
```

Tes client memeriksa render clue, kandidat voting, dan hasil menggunakan bentuk snapshot server. Pengujian permainan lengkap tetap dilakukan dengan server dan beberapa browser.

Fallback rute SPA tersedia untuk Netlify (`public/_redirects`) dan Vercel (`vercel.json`). Saat deployment, isi `VITE_SERVER_URL` sebelum build dan sesuaikan `CLIENT_ORIGIN` pada server dengan origin client.

## Struktur

```text
__test__/                   Pemeriksaan integrasi data server dengan komponen
src/
  App.jsx                   Router: /, /rooms/:code, /rooms/:code/result
  constant/                 URL server, fase, batas, pesan error
  socket/index.js           Instance socket.io-client
  contexts/GameContext.js   Context dan hook useGame
  contexts/GameProvider.jsx Sesi, socket, snapshot publik, state privat, aksi
  views/                    HomePage, RoomPage, ResultPage, NotFoundPage
  components/RoomGate.jsx   Sesi kedaluwarsa, tautan langsung, resume
  components/room/          Header, pemain, kata, clue, chat
  components/phases/        Lobby, WordReveal, Clue, Discussion, Voting
  helpers/                  API, session, room, toast, countdown
```

## Kontrak integrasi

Client mengikuti [API server](../server/API.md) sebagai acuan payload:

- Room berisi **3–6 pemain**. Hanya host yang dapat memulai, ketika semua anggota online.
- ACK sukses berbentuk `{ ok: true, data }`; penolakan berbentuk `{ ok: false, error: { code, message } }`.
- Create/join mengembalikan `{ code, playerId, sessionToken }`. Sesi disimpan per tab di `sessionStorage`; resume mengirim `{ code, sessionToken }`.
- `room:leave` dikirim tanpa payload, dengan callback ACK.
- ID pemain berupa angka. `players` dan `participants` berisi objek dengan `playerId` dan `nickname`; peserta ronde tetap menjadi kandidat meskipun sudah keluar.
- `GET /api/game-options` mengembalikan `{ data: { categories: [...] } }`. Kategori acak bernilai `acak`.
- Snapshot `room:state` mengganti state publik; revisi yang lebih lama diabaikan. Progres voting memakai `voting.submitted` dan `voting.total`.
- Kata sendiri berasal dari `player:state` dan hanya ditampilkan ketika `roundId` cocok.
- Saat `RESULT`, kata dan suara memakai `result.playerWords` dan `result.voteTally`. Pemenang bernilai `CIVILIANS` atau `IMPOSTOR`.
- Main Lagi membersihkan ronde dan mempertahankan room. Restart server menghapus seluruh room; sesi lama ditolak dan pemain harus membuat atau bergabung ke room baru.

## Pemeriksaan manual integrasi

1. Buka tiga tab atau browser. Buat room, gabungkan dua pemain lain, dan periksa host serta daftar pemain.
2. Pilih kategori dan mulai. Periksa kata pribadi, urutan clue, chat diskusi, penguncian vote, progres, dan hasil yang sama pada ketiganya.
3. Refresh salah satu pemain saat ronde berjalan. Kata, giliran, dan status vote tetap pulih selama proses server belum berhenti.
4. Keluar sebagai host dan pastikan host berpindah. Peserta yang keluar saat ronde tetap muncul pada clue, voting, dan hasil.
5. Klik Main Lagi. Kode dan sesi tetap, sedangkan kata, clue, chat, vote, dan hasil lama hilang.
6. Restart server. Sesi lama berakhir dengan pesan yang jelas; room baru dapat dibuat dan diikuti kembali.
