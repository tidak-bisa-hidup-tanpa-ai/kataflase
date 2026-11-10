# ADR-001 Kataflase — Server sebagai sumber state permainan

|             |                                 |
| ----------- | ------------------------------- |
| **Status**  | Baseline MVP untuk ditinjau tim |
| **Tanggal** | 10 November 2026                |
| **Terkait** | [PRD Kataflase](PRD.md)         |

## Konteks

Kataflase memerlukan sinkronisasi realtime untuk 3–6 pemain, pembagian kata rahasia, giliran, dan voting yang konsisten. Client wajib memakai Vite, React, React Router, dan React Context. Tim terdiri dari tiga developer dengan waktu terbatas. Game perlu berjalan di URL publik dan memanggil provider AI tanpa mengekspos API key ke browser.

## Keputusan

| Bagian          | Pilihan MVP                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Client**      | SPA Vite + React. Rute `/` untuk Home, `/rooms/:code` untuk lobby dan ronde, serta `/rooms/:code/result` untuk hasil. Satu `GameContext` menangani sesi, koneksi, snapshot publik, dan state pribadi. Fase server menentukan tampilan aktif, termasuk saat halaman dibuka langsung. |
| **Server**      | Satu proses Node.js menjalankan Express dan Socket.IO. Server memeriksa keanggotaan room, memvalidasi aksi, menyimpan state, menjalankan timer, membagikan kata, dan menetapkan hasil.                                                                                              |
| **Penyimpanan** | Room dan sesi aktif disimpan di memory satu instance. Hapus room setelah tidak ada pemain online selama 60 detik. Restart dan redeploy menghapus room aktif, sehingga client perlu menangani sesi yang hilang.                                                                      |
| **HTTP**        | `GET /api/game-options` menyajikan kategori untuk pemilih di lobby. `GET /health` dipakai untuk memeriksa layanan. Dokumentasikan respons HTTP dan contoh payload socket.                                                                                                           |
| **AI**          | Server memanggil satu provider yang sudah bisa diakses tim. API key berada di environment server. Word bank lokal memakai kategori yang sama dan menyediakan minimal dua pasangan valid per kategori.                                                                               |
| **Deployment**  | Deploy client dan satu instance server publik. Siapkan fallback rute SPA, URL server di konfigurasi client, dan origin client yang diizinkan oleh server. Uji Socket.IO dari dua perangkat melalui URL publik.                                                                      |

## Game state

**`WAITING` → `WORD_REVEAL` → `CLUE` → `DISCUSSION` → `VOTING` → `RESULT` → `WAITING`**

- **Start.** Hanya host yang bisa start saat 3–6 anggota room online. Kunci permintaan start sebelum memanggil AI. Jika susunan anggota aktif berubah selama proses, batalkan start dan buka kembali tombol. Hasil AI dari percobaan start yang sudah dibatalkan diabaikan.
- **Fase dan waktu.** Server menyimpan `deadlineAt` dan mengirimkannya untuk hitung mundur di browser. Sebelum memproses aksi atau callback timer, periksa `roundId`, fase, dan giliran yang masih aktif. Saat batas voting terlewati, tolak suara baru meskipun callback timer belum berjalan.
- **Voting.** Daftar peserta dikunci saat ronde dimulai. Simpan suara dengan `playerId` sebagai kunci. Validasi dan pencatatan suara serta perubahan ke `RESULT` dilakukan dalam satu langkah sinkron pada server. Timer dan suara terakhir hanya bisa menutup satu hasil untuk ronde yang sama.
- **Replay.** Aksi host dari `RESULT` kembali ke `WAITING`, membersihkan data ronde, dan mempertahankan kode room serta pasangan sebelumnya untuk pemeriksaan variasi. Ronde baru memperoleh `roundId` baru.

## Data dan batas akses

| Data                | Isi minimum                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Room**            | `code`, `hostId`, fase, `deadlineAt`, `revision`, status start, pemain, dan pasangan kata sebelumnya.                                                           |
| **Pemain dan sesi** | `playerId`, nickname, urutan bergabung, status online, socket aktif, dan token sesi acak. Token hanya dibagikan ke pemain terkait.                              |
| **Ronde internal**  | `roundId`, daftar peserta, urutan dan posisi giliran, kata per pemain, impostor, clue, riwayat chat terbatas, suara per pemain, dan hasil.                      |
| **Snapshot publik** | Daftar pemain, host, status start, fase, giliran, deadline, clue, chat, progres vote, dan hasil saat `RESULT`. Susun snapshot dari daftar field yang diizinkan. |
| **State privat**    | `roundId`, kata sendiri, dan status apakah suara sendiri sudah diterima. Kirim hanya ke socket aktif pemain.                                                    |

Identitas impostor, kata pemain lain, pasangan kata, dan pilihan vote per pemain disimpan di server selama ronde. Pada `RESULT`, publikasi cukup mencakup kata tiap pemain, identitas impostor, tally per kandidat, dan pemenang. Gunakan broadcast room untuk data publik dan pengiriman langsung untuk data privat. [Dokumentasi Socket.IO Rooms](https://socket.io/docs/v4/rooms/)

## Kontrak integrasi Socket.IO

| Arah            | Event                        | Data atau fungsi                                                                                                               |
| --------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Client → server | `room:create`, `room:join`   | Nickname dan kode untuk join. ACK sukses mengembalikan kode room, `playerId`, dan token sesi.                                  |
| Client → server | `room:resume`, `room:leave`  | Resume memakai kode room dan token. Leave mencabut sesi dan memperbarui presence.                                              |
| Client → server | `game:start`, `game:restart` | Start membawa kategori. Restart membawa `roundId`. Server memeriksa host dan fase.                                             |
| Client → server | `clue:submit`, `chat:send`   | `roundId` dan teks. Clue memerlukan giliran yang benar dan satu pengiriman per pemain. Chat dibuka saat diskusi.               |
| Client → server | `vote:submit`                | `roundId` dan `targetPlayerId`. Server memeriksa peserta, fase, deadline, target, dan suara sebelumnya.                        |
| Server → room   | `room:state`                 | Snapshot publik terbaru dengan `revision`. Client mengganti snapshot ketika revisi lebih baru.                                 |
| Server → pemain | `player:state`               | State privat untuk ronde terkait, termasuk ketika resume. Cocokkan `roundId` dengan ronde yang aktif sebelum menampilkan kata. |

Gunakan ACK untuk mengonfirmasi penerimaan aksi atau memberi alasan penolakan seperti `NOT_YOUR_TURN`, `ALREADY_VOTED`, atau `SESSION_EXPIRED`. Server mengambil identitas dari sesi yang terikat ke socket aktif. Client menunggu konfirmasi sebelum menampilkan bahwa clue atau vote sudah diterima.

Simpan token di `sessionStorage` per tab. Saat reconnect atau refresh, validasi token, ikat sesi ke socket yang baru, lalu kirim snapshot terbaru dan state privat. Socket lama yang sudah digantikan kehilangan akses aksi. Snapshot menggantikan event yang terlewat saat koneksi putus. [Socket.IO Delivery Guarantees](https://socket.io/docs/v4/delivery-guarantees/) · [Connection State Recovery](https://socket.io/docs/v4/connection-state-recovery/)

## Integrasi AI

1. Validasi kategori dari pilihan yang didukung. Jika host memilih acak, server memilih kategori sebelum memanggil provider.
2. Minta pasangan kata dalam bahasa Indonesia dengan keluaran terstruktur `wordA` dan `wordB`. Tetapkan timeout awal lima detik.
3. Periksa dua nilai teks yang pendek dan tidak kosong. Tolak kata yang identik setelah normalisasi dan pasangan yang mengulang ronde terakhir, termasuk jika urutannya dibalik.
4. Gunakan word bank jika provider gagal, timeout, atau respons tidak lolos. Pilih pasangan berbeda dari ronde terakhir, lalu acak satu impostor dan bagikan kata.

Validasi struktur dilakukan otomatis. Kelayakan makna dan kualitas petunjuk dinilai lewat playtest. Uji jalur AI sukses dan fallback sebelum demo publik.

## Alternatif dan konsekuensi

| Alternatif                                       | Pertimbangan                                                                                                                                                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Realtime terkelola dengan aturan di client**   | Mengurangi setup server, tetapi pemeriksaan fase, kata privat, suara, dan pemanggilan AI tetap perlu dijalankan di lingkungan tepercaya. Satu server Node menyatukan aturan tersebut dengan room dan timer. |
| **Database atau beberapa instance sejak awal**   | Memungkinkan room bertahan melewati restart atau tersebar ke beberapa proses, dengan tambahan penyimpanan, koordinasi timer, dan sinkronisasi state. Satu instance in-memory cukup untuk batas MVP.         |
| **Event publik terpisah untuk setiap perubahan** | Payload lebih kecil. Snapshot publik lebih sederhana untuk room kecil dan pemulihan koneksi, dengan biaya mengirim ulang beberapa field. Batasi riwayat chat agar payload tetap ringkas.                    |

Pertahankan folder `client/` dan `server/`. Developer 1 memiliki tampilan dan Context. Developer 2 memiliki transport, sesi, dan penyusunan payload. Developer 3 memiliki aturan ronde dan AI. Sepakati contoh `room:state` dan `player:state` sebelum menyambungkan pekerjaan.

**Masih terbuka.** Provider dan hosting spesifik mengikuti akses tim. Cakupan endpoint REST dikonfirmasi ke instructor. Durasi timer bisa disesuaikan setelah playtest dan dicatat di PRD.
