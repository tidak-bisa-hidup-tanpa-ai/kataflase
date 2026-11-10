# Kataflase Server

Jalankan `npm ci` lalu `npm start` dari folder server. Port bawaan adalah `3000` dan origin frontend bawaan adalah `http://localhost:5173`. Gunakan `PORT` dan `CLIENT_ORIGIN` di environment server untuk mengganti keduanya. Saat development, konfigurasi bisa dimuat dari `.env`.

Express dan Socket.IO menggunakan port yang sama.

## GET /health

Memeriksa bahwa server HTTP dapat merespons. Respons HTTP `200 OK`.

```json
{
  "data": {
    "status": "ok"
  }
}
```
