# Kataflase Client

Client Kataflase menampilkan lobby, kartu kata pribadi, giliran petunjuk, chat, voting, dan hasil ronde. Versi publik tersedia di [kataflase.dipatipaw.web.id](https://kataflase.dipatipaw.web.id). Aturan permainan dan pengaturan deployment ada di [README proyek](../README.md).

## Menjalankan client

Jalankan server di `http://localhost:3000`, lalu jalankan perintah berikut dari root repo.

~~~bash
cd client
npm ci
npm run dev
~~~

Vite berjalan di `http://localhost:5173`. Build produksi memakai `https://kataflase-server.dipatipaw.web.id`. Isi `VITE_SERVER_URL` sebelum menjalankan Vite atau build jika ingin mengganti alamat REST dan Socket.IO.

`vercel.json` menangani tautan langsung ke rute SPA di Vercel. `public/_redirects` menyediakan aturan setara untuk Netlify.

## Rute dan state

| Bagian | Peran |
| --- | --- |
| `/` | Membuat room atau bergabung dengan kode. |
| `/rooms/:code` | Membuka undangan jika belum bergabung, atau menampilkan lobby dan fase permainan. |
| `/rooms/:code/result` | Menampilkan hasil ketika server berada di fase `RESULT`. |
| Redux Toolkit | Menyimpan snapshot publik `room:state` dan menggantinya saat pembaruan diterima. |
| `GameProvider` dan `useGame()` | Menangani koneksi, ACK aksi, pemulihan sesi, dan data privat dari `player:state`. |
| `ThemeProvider` | Menyimpan preferensi tema terang atau gelap di `localStorage`. |

Token sesi disimpan di `sessionStorage` per tab. Kata pribadi dan status suara dicocokkan dengan `roundId` yang aktif. Client menghitung mundur dari `deadlineAt` dan waktu server, sementara server memutuskan kapan fase berpindah.

Pilihan kategori diambil dari `GET /api/game-options` dengan Axios. Aksi game dikirim lewat Socket.IO. **Minta Saran** menampilkan ACK privat dari server, dan ulasan muncul setelah snapshot hasil berisi `result.recap`. Lihat [kontrak API](../server/API.md) untuk payload dan kode kesalahan.

## Pemeriksaan

~~~bash
npm run lint
npm test
npm run build
~~~

Tes client memeriksa render clue, kandidat voting, halaman hasil, dan utility CSS hasil build. Tailwind dan plugin Vite dipatok ke `4.2.4` karena versi yang lebih baru pernah gagal membaca source saat diuji dengan Application Control di Windows.

Untuk uji manual, gunakan tiga tab yang masing-masing dibuka dari URL awal. Buat room, bagikan tautan, lalu mainkan satu ronde. Cek bahwa saran muncul hanya untuk pemain yang sedang giliran, chat dan vote sinkron, serta kata dan ulasan tampil di hasil. Refresh salah satu tab saat ronde berjalan untuk menguji resume. **Main Lagi** harus mempertahankan kode room dan membersihkan data ronde sebelumnya.
