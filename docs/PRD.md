# PRD Kataflase

|              |                                                      |
| ------------ | ---------------------------------------------------- |
| **Versi**    | 0.3                                                  |
| **Status**   | Baseline MVP untuk ditinjau tim                      |
| **Proyek**   | Hacktiv8 Full Stack JavaScript Phase 2 Group Project |
| **Tim**      | 3 developer                                          |
| **Deadline** | Kamis, 12 November 2026 pukul 12.00 WIB              |

## Tujuan

Kataflase adalah game tebak siapa yang mendapat kata berbeda. Tiga sampai enam orang bergabung dengan kode room dari browser masing-masing. Semua pemain melihat kata pribadinya, lalu mencoba mengenali impostor dari petunjuk, diskusi, dan voting. Permainan berhasil jika pemain baru bisa mengikuti satu ronde dan menjelaskan alasan pilihannya dari petunjuk yang muncul.

Contoh ronde dengan empat pemain. Tiga pemain mendapat **Kopi** dan satu pemain mendapat **Teh**. Petunjuk seperti “pagi” atau “seduh” bisa cocok untuk kedua kata. Petunjuk “daun” bisa membuat pemain lain mulai curiga. Identitas impostor baru dibuka di hasil, termasuk bagi pemain yang ternyata mendapat kata berbeda.

## Alur dan aturan MVP

| Tahap                   | Yang dialami pemain                                                                                                                                                                                                              | Kapan lanjut                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Home dan lobby**      | Masukkan nickname, buat room, atau masuk dengan kode. Lobby menampilkan aturan singkat, daftar pemain online, dan tombol **Salin Kode Room**. Host memilih kategori bawaan, **Acak**, atau mengetik **Kategori Sendiri**.                               | Hanya host yang bisa mulai ketika ada 3–6 anggota dan semuanya online.                             |
| **Kata rahasia**        | Server memilih satu impostor dan membagikan satu kata kepada tiap pemain. Di layar room, kata pribadi tersedia dalam kartu yang bisa dibuka kembali sepanjang ronde.                                                             | Setelah 10 detik, giliran pertama dimulai.                                                         |
| **Petunjuk**            | Urutan diacak setiap ronde. Layar menunjukkan siapa yang sedang giliran. Setiap pemain boleh mengirim satu petunjuk singkat. Penyebutan literal kata sendiri ditolak. Petunjuk yang diterima langsung muncul untuk semua pemain. | Setelah semua giliran selesai. Pemain yang melewati batas 30 detik per giliran dilewati.           |
| **Diskusi**             | Semua peserta membaca daftar petunjuk dan bisa berdiskusi melalui chat teks.                                                                                                                                                     | Setelah 60 detik.                                                                                  |
| **Voting**              | Daftar petunjuk tetap terlihat. Pemain bisa memilih satu peserta lain. Pilihan terkunci saat diterima. Semua pemain melihat progres seperti “3 dari 4 sudah memilih”.                                                            | Saat semua peserta telah memilih atau 45 detik habis. Peserta yang belum memilih dianggap abstain. |
| **Hasil dan main lagi** | Tampilkan impostor, kata tiap pemain, jumlah suara per kandidat, pemenang, dan alasan singkat. Saat host menekan **Main Lagi**, data ronde lama dihapus. Pemain kembali ke lobby dengan kode room dan sesi yang sama.                                                     | Ronde berikutnya memakai pasangan kata berbeda dari ronde sebelumnya.                              |

Jika satu kandidat memperoleh suara terbanyak dan dia impostor, pemain biasa menang. Jika kandidat teratas adalah pemain biasa, posisi teratas seri, atau semua pemain abstain, impostor menang. Angka timer di tabel adalah nilai awal untuk playtest.

Layar lobby, kata, clue, diskusi, dan voting memakai tampilan room yang sama. Konten berganti saat fase berubah. Hasil memiliki tampilan sendiri. Untuk MVP, utamakan instruksi yang jelas, ukuran teks yang terbaca di HP, dan umpan balik setelah mengirim clue atau vote.

### Saat koneksi putus

- Di lobby, slot pemain dipertahankan selama 30 detik. Selama ronde aktif, identitas pemain dipertahankan sampai hasil dan batas waktu ronde tetap berjalan. Pemain yang tersambung kembali dengan sesi valid menerima fase, kata, dan status voting yang sama.
- Peserta yang offline tetap bisa menjadi kandidat voting. Anggota baru masuk ketika room berada di lobby.
- Jika host keluar atau putus koneksi, pemain online yang paling awal bergabung mengambil alih. Host sebelumnya kembali sebagai anggota biasa jika sesi masih valid.
- Room, sesi, dan ronde aktif disimpan sementara di memory satu proses server tanpa database. Refresh atau reconnect bisa memulihkan sesi selama server masih berjalan. Restart, crash, atau redeploy menghapus room dan ronde; client kembali ke Home, host membuat room baru, lalu pemain lain memasukkan kode baru.

## AI pendukung

**AI Word Generator** meminta satu pasangan kata dalam bahasa Indonesia saat host menekan **Mulai**. Prompt memakai kategori yang dipilih dan satu tingkat kesulitan tetap. Pasangan yang baik cukup dekat untuk memunculkan petunjuk ambigu, tetapi maknanya berbeda. Contohnya **Kopi–Teh** atau **Lift–Eskalator**. Pasangan seperti **HP–Ponsel** terlalu mirip untuk ronde yang menarik.

Server memeriksa respons terstruktur dan mencoba model cadangan jika model utama gagal. Jika kedua model gagal, kategori bawaan memakai word bank lokal. Untuk **Kategori Sendiri**, host tetap di lobby dan bisa mencoba lagi atau memilih kategori bawaan. Kualitas pasangan diuji saat playtest. Satu ronde dengan pasangan dari AI dan satu ronde dengan fallback harus bisa ditunjukkan saat pengujian.

Pemain dapat meminta **saran privat** saat gilirannya memberi petunjuk. Saran diperiksa agar tidak menyebut kata rahasianya dan tidak otomatis dikirim ke pemain lain. Setelah hasil voting tampil, pemain menerima **ulasan ronde**. Keduanya punya cadangan lokal jika Gemini tidak tersedia.

## Batas MVP

| Prioritas                       | Cakupan                                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**                          | Room privat lewat kode, sesi nickname, satu ronde lengkap, clue bergiliran, chat, vote, hasil, main lagi dengan kode yang sama, reconnect selama server masih berjalan, penanganan sesi yang hilang setelah restart, AI dan fallback, tampilan mobile, serta client dan server publik. |
| **P1 setelah alur inti stabil** | Variasi difficulty, voting ulang, scoreboard lintas ronde, timer yang bisa diatur host, dan animasi tambahan.                                                                                        |
| **Di luar cakupan versi ini**   | Akun permanen, leaderboard persisten, matchmaking publik, friend list, voice/video, dan role tambahan.                                                                                            |

## Kesesuaian dengan rubrik Hacktiv8

| Poin rubrik                        | Yang ditunjukkan tim                                                                                                                                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 dan 7 · Tema dan fitur utama** | Multiplayer social deduction dengan kata pribadi, clue, diskusi, dan voting. Bahas fitur utama dengan buddy dan instructor, cek apakah tema masih tersedia, lalu submit melalui form instructor.                             |
| **2 · GitHub Workflow**            | Repo berada di GitHub Organization. Undang seluruh instructor Phase 2. Kerjakan fitur di branch dan gabungkan ke `main` hanya melalui PR. Setiap developer ikut coding dan membuat minimal empat commit deskriptif per hari. |
| **3 dan 5 · Realtime dan client**  | Vite + React SPA, React Router, komponen per fase, React Context, dan Socket.IO untuk pembaruan antarpemain.                                                                                                                 |
| **4 dan 6 · Client–server**        | Node.js + Express, Socket.IO, serta dokumentasi REST dan event. Rencana awal menyediakan `GET /api/game-options` dan `GET /health`. Konfirmasi cakupan REST dengan instructor.                                               |
| **8 · Deploy**                     | Client di-deploy ke URL publik. Server ikut di-deploy supaya client publik bisa menjalankan game.                                                                                                                            |
| **9 · AI pendukung**               | Tunjukkan pasangan kata yang dibuat AI saat memulai ronde dan fallback ketika provider gagal.                                                                                                                                |

Laporkan progres ke instructor minimal dua kali dan sertakan kontribusi anggota. Catat perubahan PRD yang disepakati tim beserta alasannya. Setelah submit, perubahan fitur dikonsultasikan dengan instructor dan tema mengikuti pengajuan yang sudah dikonfirmasi.

## Pembagian kerja dan target

| Owner                              | Deliverable                                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Developer 1 · Client**           | Home, room, hasil, Router, Context, komponen gameplay, tampilan mobile, dan deployment client. Mulai dari contoh data yang disepakati.    |
| **Developer 2 · Room dan koneksi** | Express/Socket.IO, room dan sesi di memory server, reconnect, host transfer, pengiriman data publik dan privat, REST, dokumentasi API, dan deployment satu instance server. |
| **Developer 3 · Aturan dan AI**    | Pembagian kata, fase dan timer, validasi clue/vote, hasil, replay, word bank, dan integrasi AI.                                           |

| Target                           | Bukti selesai                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **10 November · Lobby realtime** | Sepakati format data lebih dulu. Tiga browser masuk ke room yang sama dan daftar pemain ikut berubah. Gunakan hasil ini untuk laporan pertama.                         |
| **11 November · Ronde lengkap**  | Integrasikan satu ronde dengan word bank terlebih dahulu, lalu AI. Uji reconnect, penanganan sesi yang hilang setelah restart, timeout, seri, dan replay. Jalankan dari URL publik dan gunakan untuk laporan kedua. |
| **12 November · Siap demo**      | Perbaiki masalah yang menghalangi ronde. Targetkan demo siap pukul 10.30 WIB sebelum deadline pukul 12.00 WIB.                                                         |

## Kriteria penerimaan

- [ ] Tiga pemain menyelesaikan satu ronde dan bermain lagi. Start ditolak untuk dua pemain dan room menolak peserta ketujuh.
- [ ] Lobby, clue, chat, progres voting, dan hasil sinkron di perangkat berbeda. Room lain tidak menerima pembaruan ronde tersebut.
- [ ] Sebelum hasil, setiap browser hanya menerima kata pemainnya sendiri. Data publik tidak membocorkan identitas impostor atau pilihan vote.
- [ ] Giliran dan timer berfungsi. Server menolak clue di luar giliran, penyebutan literal kata sendiri, vote diri sendiri, vote ulang, dan aksi di fase yang salah.
- [ ] Vote bersamaan menghasilkan satu hasil. Seri, abstain, disconnect, host keluar, dan refresh ditangani sesuai aturan.
- [ ] Refresh atau reconnect dengan sesi valid memulihkan fase, kata pribadi, dan status vote selama server masih berjalan. Setelah restart server, sesi lama ditolak dengan pesan yang jelas; host membuat room baru dan peserta dapat bergabung dengan kode baru.
- [ ] Hasil tersedia sampai host menekan **Main Lagi**. Setelah itu, kode room, anggota, dan sesi tetap bisa dipakai, sementara kata, clue, chat, suara, dan hasil ronde lama dihapus.
- [ ] AI menghasilkan pasangan valid. Jika kedua model gagal, kategori bawaan memakai word bank dan kategori sendiri tetap di lobby. Replay tidak mengulang pasangan ronde sebelumnya.
- [ ] Client dan server berfungsi di URL publik. Tautan room yang dibuka langsung dan halaman yang di-refresh bisa dipulihkan sesuai sesi.
- [ ] Dokumentasi REST dan socket tersedia, kontribusi ketiga developer tercatat, dan dua laporan progres sudah disampaikan.

Keputusan teknis dan kontrak integrasi ada di [ADR Kataflase](ADR.md).
