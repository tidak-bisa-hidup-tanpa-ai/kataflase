# Kataflase

Kataflase adalah game tebak impostor untuk **3–6 pemain**. Mayoritas pemain mendapat kata yang sama, sementara satu pemain mendapat kata berbeda. Beri petunjuk tanpa menyebut kata sendiri, diskusikan tebakan, lalu pilih siapa impostornya.

**[Main Kataflase](https://kataflase.dipatipaw.web.id)** · [Status API](https://kataflase-server.dipatipaw.web.id/health)

## Cara main

1. Masukkan nickname dan buat room. Bagikan kode atau tautan undangan. Host bisa mulai saat ada 3–6 pemain dan semuanya online.
2. Pilih kategori bawaan, **Acak**, atau **Kategori Sendiri**. Setiap pemain hanya melihat kata miliknya, misalnya mayoritas mendapat **Kopi** dan satu pemain mendapat **Teh**.
3. Beri satu petunjuk saat giliranmu. Tombol **Minta Saran** memberi ide privat yang bisa kamu pertimbangkan sebelum mengirim petunjuk sendiri.
4. Diskusikan petunjuk di chat, lalu pilih satu pemain lain. Pemain biasa menang jika impostor menjadi satu-satunya orang dengan suara terbanyak. Seri atau salah tebak berarti impostor menang.
5. Lihat identitas impostor, kata semua pemain, jumlah suara, dan ulasan ronde. Host bisa menekan **Main Lagi** untuk memulai ronde baru dengan kode yang sama.

## Cara kerja

Client memakai React, Vite, React Router, Tailwind CSS, React Context, dan Redux Toolkit. Express menyajikan REST untuk status dan kategori, sementara Socket.IO mengirim perubahan room secara realtime. Server menentukan fase, giliran, dan hasil. Browser menerima kata sendiri melalui pesan privat.

Gemini membuat pasangan kata, memberi saran privat, dan menulis ulasan ronde. Kategori bawaan memakai word bank saat Gemini tidak tersedia. Saran dan ulasan memiliki cadangan lokal. Kategori sendiri memerlukan respons Gemini yang valid.

Room dan sesi berada di memory satu proses server. Refresh atau reconnect dapat memulihkan sesi yang masih berlaku. Restart server menghapus room dan ronde, sehingga pemain perlu membuat room baru.

## Menjalankan secara lokal

Gunakan Node.js 24 dan npm. Jalankan server dan client dari terminal terpisah.

~~~bash
cd server
npm ci
cp -n .env.example .env
npm start
~~~

Server berjalan di `http://localhost:3000`. Isi `GEMINI_API_KEY` di `server/.env` untuk mengaktifkan Gemini.

~~~bash
cd client
npm ci
npm run dev
~~~

Buka `http://localhost:5173`. Gunakan `VITE_SERVER_URL` jika client lokal perlu menunjuk ke alamat server lain.

Dari root repo, jalankan pemeriksaan berikut. Tes server menggunakan timer ronde dan memerlukan sekitar satu menit.

~~~bash
npm --prefix server test
npm --prefix client test
npm --prefix client run lint
npm --prefix client run build
~~~

## Rilis EC2 dan Vercel

| Layanan | Konfigurasi produksi |
| --- | --- |
| Client | [kataflase.dipatipaw.web.id](https://kataflase.dipatipaw.web.id). Vercel memakai preset **Vite**, Root Directory `client`, dan Production Branch `main`. |
| Server | [kataflase-server.dipatipaw.web.id](https://kataflase-server.dipatipaw.web.id/health). Satu proses PM2 menjalankan `server/bin/www.js` di EC2. |
| Koneksi | Build produksi client memakai domain server. Jika `VITE_SERVER_URL` diatur di Vercel, pakai `https://kataflase-server.dipatipaw.web.id`. Konfigurasi `env` PM2 memakai `NODE_ENV=production` dan `CLIENT_ORIGIN: "https://kataflase.dipatipaw.web.id"`. |

Setelah rilis masuk `main`, ambil versi terbaru di folder clone EC2.

~~~bash
git switch main
git pull --ff-only origin main
~~~

Jalankan `npm ci` dari `server` jika dependency berubah. Dari folder konfigurasi PM2, jalankan `pm2 restart ecosystem.config.js --only kataflase --update-env`. Restart menghapus room aktif. Tunggu deployment Vercel berstatus **Ready**, cek status API, lalu coba satu ronde dengan tiga pemain dari domain publik.

## Dokumentasi dan kontribusi

- [PRD](docs/PRD.md) menjelaskan aturan, cakupan, dan kriteria penerimaan.
- [ADR](docs/ADR.md) menjelaskan keputusan arsitektur, penyimpanan, dan batas akses.
- [Dokumentasi API](server/API.md) memuat endpoint REST, event Socket.IO, payload, dan respons.
- [README client](client/README.md) menjelaskan rute, state, dan langkah uji dari browser.

Kataflase dibuat sebagai Group Project Hacktiv8 Full Stack JavaScript Phase 2. Perbaikan lanjutan dikerjakan di `rockwell/project-maintenance`. Setelah pemeriksaan lokal, ajukan PR ke `development`, lalu ajukan versi stabil dari `development` ke `main`. Gunakan **Create a merge commit** untuk mempertahankan commit asli anggota tim. Sinkronkan maintenance dengan `origin/development` setelah merge, misalnya dengan `git fetch origin` lalu `git merge --ff-only origin/development` dari branch maintenance.
