# Kataflase

Game multiplayer realtime untuk 3–6 pemain. Semua pemain memberi petunjuk dan berdiskusi untuk menebak siapa yang mendapat kata berbeda. AI membuat pasangan kata untuk ronde baru.

## Dokumen proyek

- [PRD](docs/PRD.md) memuat aturan permainan, cakupan MVP, dan pembagian kerja.
- [ADR](docs/ADR.md) memuat keputusan arsitektur dan kontrak integrasi client–server.
- [API server](server/API.md) memuat setup PostgreSQL, endpoint REST, event Socket.IO, dan payload untuk client.

## Struktur project

```text
kataflase/
├── client/
├── docs/
│   ├── PRD.md
│   └── ADR.md
├── server/
│   ├── bin/www.js
│   ├── config/config.json
│   ├── helpers/
│   ├── migrations/
│   ├── models/
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

`app.js` menyiapkan Express, `bin/www.js` menjalankan HTTP dan Socket.IO, `routers/` menangani endpoint REST, dan `sockets/` menangani aksi realtime. `helpers/` berisi generator kata, word bank, serta fungsi pengacakan, validasi, dan perhitungan hasil. Model dan migration mengikuti struktur Sequelize CLI.

## Menjalankan server

```sh
cd server
npm ci
cp -n .env.example .env
```

Sesuaikan koneksi PostgreSQL pada `config/config.json`. Jika database development belum dibuat, jalankan `npx sequelize-cli db:create`. Isi `GEMINI_API_KEY` di `.env`; jika key belum tersedia, permainan memakai word bank.

```sh
npx sequelize-cli db:migrate
npm start
```

Server berjalan di `http://localhost:3000`. Dokumentasi payload untuk pengembangan client tersedia di [API server](server/API.md).

## Mulai kontribusi

1. Clone repo, lalu pindah ke branch `development`.
2. Buat branch fitur dari `development` terbaru dengan format `fardian/nama-fitur`, `rockwell/nama-fitur`, atau `arief/nama-fitur`.
3. Ajukan PR dari branch fitur ke `development`. Versi stabil masuk ke `main` melalui PR dari `development`.
