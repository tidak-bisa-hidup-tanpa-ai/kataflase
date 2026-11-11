# ADR-001 Kataflase — Server sebagai sumber state permainan

|             |                                 |
| ----------- | ------------------------------- |
| **Status**  | Baseline MVP untuk ditinjau tim |
| **Tanggal** | 11 November 2026                |
| **Terkait** | [PRD Kataflase](PRD.md)         |

## Konteks

Kataflase memerlukan sinkronisasi realtime untuk 3–6 pemain, pembagian kata rahasia, giliran, dan voting yang konsisten. Client wajib memakai Vite, React, React Router, dan React Context. Tim terdiri dari tiga developer dengan waktu terbatas. Game perlu berjalan di URL publik dan memanggil provider AI tanpa mengekspos API key ke browser.

Mengikuti arahan instructor, MVP tidak menggunakan database. Tim menerima bahwa restart atau redeploy server menghapus room dan ronde aktif. Main Lagi setelah ronde normal tetap mempertahankan kode room dan sesi pemain.

## Keputusan

| Bagian          | Pilihan MVP                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Client**      | SPA Vite + React. Rute `/` untuk Home, `/rooms/:code` untuk lobby dan ronde, serta `/rooms/:code/result` untuk hasil. `ThemeContext` menangani preferensi tema lokal. Redux menyimpan snapshot publik room. `GameProvider` menangani sesi, koneksi, dan state pribadi; komponen tetap dapat memakai `useGame()`. Fase server menentukan tampilan aktif, termasuk saat halaman dibuka langsung. |
| **Server**      | Satu proses Node.js menjalankan Express dan Socket.IO. Server memeriksa keanggotaan room, memvalidasi aksi, menyimpan state, menjalankan timer, membagikan kata, dan menetapkan hasil.                                                                                              |
| **Penyimpanan** | Satu `Map` di memory proses Node.js menyimpan room, pemain, sesi, dan ronde aktif. Gunakan satu instance server. Restart, crash, atau redeploy menghapus seluruh state; kode dan sesi lama tidak berlaku. |
| **HTTP**        | `GET /api/game-options` menyajikan kategori untuk pemilih di lobby. `GET /health` dipakai untuk memeriksa layanan. Dokumentasikan respons HTTP dan contoh payload socket.                                                                                                           |
| **AI**          | Server memanggil satu provider yang sudah bisa diakses tim. API key berada di environment server. Word bank lokal memakai kategori yang sama dan menyediakan minimal dua pasangan valid per kategori.                                                                               |
| **Deployment**  | Deploy client dan satu instance server publik. Siapkan fallback rute SPA, URL server di konfigurasi client, dan origin client yang diizinkan oleh server. Uji Socket.IO dari dua perangkat melalui URL publik.                                                                      |

## Game state

**`WAITING` → `WORD_REVEAL` → `CLUE` → `DISCUSSION` → `VOTING` → `RESULT` → `WAITING`**

- **Start.** Hanya host yang bisa start saat 3–6 anggota room online. Kunci permintaan start sebelum memanggil AI. Jika susunan anggota aktif berubah selama proses, batalkan start dan buka kembali tombol. Periksa ulang revisi room dan anggota setelah menunggu AI; hasil dari percobaan yang dibatalkan diabaikan.
- **Fase dan waktu.** Server menyimpan `deadlineAt` di memory dan mengirimkannya untuk hitung mundur di browser. Sebelum memproses aksi atau callback timer, periksa `roundId`, fase, dan giliran yang masih aktif. Saat batas voting terlewati, tolak suara baru meskipun callback timer belum berjalan. Startup selalu dimulai dengan daftar room kosong.
- **Voting.** Daftar peserta dikunci saat ronde dimulai. Simpan suara dengan `playerId` sebagai kunci. Validasi, pencatatan suara, dan perubahan ke `RESULT` dilakukan secara sinkron dalam satu proses tanpa `await` di antaranya. Timer dan suara terakhir hanya bisa menutup satu hasil untuk ronde yang sama. Kirim pembaruan socket setelah state diperbarui.
- **Replay.** Pertahankan hasil selama fase `RESULT`. Saat host mengirim `game:restart` untuk `roundId` yang aktif, kosongkan state ronde lama, batalkan timer-nya, dan kembalikan room ke `WAITING`. Kode room, anggota, dan sesi tetap berlaku. Simpan hash pasangan kata terakhir di room untuk mencegah pengulangan langsung. Ronde baru mendapat `roundId` baru.

## Data dan batas akses

| Data                | Isi minimum                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Room**            | `code` unik, `hostId`, fase, `revision`, status start, pemain, ronde, dan hash pasangan kata terakhir. Simpan di `Map` selama proses server berjalan. |
| **Pemain dan sesi** | `playerId` berupa angka, nickname, urutan bergabung, hash token sesi, dan batas reservasi lobby disimpan di memory room. Token asli hanya dibagikan ke pemain terkait. Socket aktif dan status online berasal dari koneksi saat ini. |
| **Ronde internal**  | `roundId`, daftar peserta, `deadlineAt`, urutan dan posisi giliran, kata per pemain, impostor, clue, riwayat chat terbatas, suara per pemain, dan hasil. Simpan di memory sampai replay atau server berhenti. |
| **Snapshot publik** | Daftar pemain, host, status start, fase, giliran, deadline, clue, chat, progres vote, dan hasil saat `RESULT`. Susun snapshot dari daftar field yang diizinkan. |
| **State privat**    | `roundId`, kata sendiri, dan status apakah suara sendiri sudah diterima. Kirim hanya ke socket aktif pemain.                                                    |

Identitas impostor, kata pemain lain, pasangan kata, dan pilihan vote per pemain disimpan di memory yang hanya diakses server selama ronde. Pada `RESULT`, publikasi cukup mencakup kata tiap pemain, identitas impostor, tally per kandidat, dan pemenang. Gunakan broadcast room untuk data publik dan pengiriman langsung untuk data privat. [Dokumentasi Socket.IO Rooms](https://socket.io/docs/v4/rooms/)

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

Simpan token di `sessionStorage` per tab. Saat reconnect atau refresh selama server masih berjalan, validasi token dari sesi yang tersimpan, ikat sesi ke socket baru, gabungkan socket ke room, lalu kirim snapshot dan state privat. Socket lama yang digantikan kehilangan akses aksi. Sesudah server restart, `room:resume` mengembalikan `SESSION_EXPIRED`; client membersihkan sesi dan kembali ke Home. Host membuat room baru dan peserta memakai kode baru. Snapshot menggantikan event yang terlewat saat koneksi putus. [Socket.IO Delivery Guarantees](https://socket.io/docs/v4/delivery-guarantees/) · [Connection State Recovery](https://socket.io/docs/v4/connection-state-recovery/)

## Integrasi AI

1. Validasi kategori dari pilihan yang didukung. Jika host memilih acak, server memilih kategori sebelum memanggil provider.
2. Minta pasangan kata dalam bahasa Indonesia dengan keluaran terstruktur `wordA` dan `wordB`. Model utama mendapat waktu tujuh detik dan model cadangan lima detik. Client menunggu ACK `game:start` hingga 15 detik.
3. Periksa dua nilai teks yang pendek dan tidak kosong. Tolak kata yang identik setelah normalisasi. Bandingkan hash dari pasangan yang dinormalisasi dan diurutkan dengan hash ronde terakhir, sehingga urutan terbalik juga terdeteksi.
4. Coba model cadangan jika model utama gagal, timeout, atau respons tidak lolos. Gunakan word bank jika kedua model gagal atau key tidak tersedia. Pilih pasangan berbeda dari ronde terakhir, lalu acak satu impostor dan bagikan kata.

Validasi struktur dilakukan otomatis. Kelayakan makna dan kualitas petunjuk dinilai lewat playtest. Uji jalur AI sukses dan fallback sebelum demo publik.

## Alternatif dan konsekuensi

| Alternatif                                       | Pertimbangan                                                                                                                                                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Realtime terkelola dengan aturan di client**   | Mengurangi setup server, tetapi pemeriksaan fase, kata privat, suara, dan pemanggilan AI tetap perlu dijalankan di lingkungan tepercaya. Satu server Node menyatukan aturan tersebut dengan room dan timer. |
| **Database persisten** | Dapat memulihkan room setelah restart, tetapi membutuhkan konfigurasi dan pengelolaan tambahan. Tidak digunakan pada MVP sesuai arahan instructor dan keputusan tim untuk menerima hilangnya room saat server berhenti. |
| **Event publik terpisah untuk setiap perubahan** | Payload lebih kecil. Snapshot publik lebih sederhana untuk room kecil dan pemulihan koneksi, dengan biaya mengirim ulang beberapa field. Batasi riwayat chat agar payload tetap ringkas.                    |

Pertahankan folder `client/` dan `server/`. Developer 1 memiliki tampilan dan Context. Developer 2 memiliki transport, sesi, dan penyusunan payload. Developer 3 memiliki aturan ronde dan AI. Sepakati contoh `room:state` dan `player:state` sebelum menyambungkan pekerjaan.

**Masih terbuka.** Provider dan hosting spesifik mengikuti akses tim. Cakupan endpoint REST dikonfirmasi ke instructor. Durasi timer bisa disesuaikan setelah playtest dan dicatat di PRD. Kebijakan retensi untuk room yang ditinggalkan perlu diputuskan terpisah dari **Main Lagi**.
