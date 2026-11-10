# Kataflase Server

Jalankan `npm ci` dari folder server. Siapkan PostgreSQL sesuai langkah di bawah, lalu jalankan `npm start`. Port bawaan adalah `3000` dan origin frontend bawaan adalah `http://localhost:5173`. Gunakan `PORT` dan `CLIENT_ORIGIN` di environment server untuk mengganti keduanya. Saat development, konfigurasi bisa dimuat dari `.env`.

Express dan Socket.IO menggunakan port yang sama.

## PostgreSQL

Gunakan `config/config.json` dari setup Sequelize CLI. Jika file itu belum ada, jalankan `npx sequelize-cli init:config` dari folder server. Isi bagian `development` dengan koneksi lokal dan set `dialect` ke `postgres`. Gunakan database yang terpisah untuk `test`. File konfigurasi lokal ini diabaikan oleh Git.

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
| `room:leave` | Callback ACK saja | Mengakhiri sesi room pada koneksi ini dan langsung melepas slot pemain. ACK sukses berisi `{ "ok": true }`. |

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
