# Kataflase

Game multiplayer realtime untuk 3–6 pemain. Semua pemain memberi petunjuk dan berdiskusi untuk menebak siapa yang mendapat kata berbeda. AI membuat pasangan kata untuk ronde baru.

## Dokumen proyek

- [PRD](docs/PRD.md) memuat aturan permainan, cakupan MVP, dan pembagian kerja.
- [ADR](docs/ADR.md) memuat keputusan arsitektur dan kontrak integrasi client–server.
- [API server](server/API.md) memuat setup server, endpoint REST, event Socket.IO, dan payload untuk client.

## Struktur project

```text
kataflase/
├── client/
├── docs/
│   ├── PRD.md
│   └── ADR.md
├── server/
│   ├── __test__/
│   ├── bin/www.js
│   ├── helpers/
│   ├── routers/index.js
│   ├── sockets/
│   ├── .env.example
│   ├── API.md
│   ├── app.js
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

`app.js` menyiapkan Express, `bin/www.js` menjalankan HTTP dan Socket.IO, `routers/` menangani endpoint REST, dan `sockets/` menangani aksi realtime. `helpers/` berisi generator kata, word bank, serta fungsi pengacakan, validasi, dan perhitungan hasil. Room, sesi, dan ronde disimpan di memory satu proses server tanpa database.

## Menjalankan server

```sh
cd server
npm ci
cp -n .env.example .env
```

Isi `GEMINI_API_KEY` di `.env`; jika key belum tersedia, permainan memakai word bank.

```sh
npm start
```

Server berjalan di `http://localhost:3000`. Dokumentasi payload untuk pengembangan client tersedia di [API server](server/API.md).

Jalankan `npm test` dari folder server untuk menguji keamanan dan alur Socket.IO. Tes tidak memanggil API Gemini. Tes integrasi memakai timer game sebenarnya, sehingga membutuhkan sekitar satu menit.

Deploy server sebagai satu instance. Refresh browser atau reconnect dapat memulihkan sesi selama server masih berjalan. Restart, crash, atau redeploy server menghapus seluruh room dan ronde. Kode lama tidak berlaku; host membuat room baru dan pemain lain bergabung memakai kode baru. Main Lagi setelah ronde normal tetap memakai kode room yang sama.

## Menjalankan client

Biarkan server berjalan, lalu buka terminal lain:

```sh
cd client
npm ci
cp -n .env.example .env
npm run dev
```

Client berjalan di `http://localhost:5173` dan memakai server `http://localhost:3000`. Atur `VITE_SERVER_URL` di environment client jika URL server berbeda, serta `CLIENT_ORIGIN` di server sesuai origin client. Setup, pemeriksaan, dan kontrak integrasi dijelaskan di [README client](client/README.md).

## Mulai kontribusi

1. Clone repo, lalu pindah ke branch `development`.
2. Buat branch fitur dari `development` terbaru dengan format `fardian/nama-fitur`, `rockwell/nama-fitur`, atau `arief/nama-fitur`.
3. Ajukan PR dari branch fitur ke `development`. Versi stabil masuk ke `main` melalui PR dari `development`.
