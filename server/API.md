# Kataflase Server

Jalankan `npm ci` lalu `npm start` dari folder server. Port bawaan adalah `3000` dan origin frontend bawaan adalah `http://localhost:5173`. Gunakan `PORT` dan `CLIENT_ORIGIN` di environment server untuk mengganti keduanya. Saat development, konfigurasi bisa dimuat dari `.env`.

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
