/**
 * geminiService.js
 * Modul pemanggil Gemini API untuk menghasilkan pasangan kata rahasia.
 *
 * Bertanggung jawab atas:
 * 1. Memanggil Gemini API dengan prompt terstruktur untuk menghasilkan { wordA, wordB }
 * 2. Memaksa output berformat JSON murni
 * 3. Membatasi waktu tunggu maksimal 5 detik (sesuai ADR)
 * 4. Memvalidasi hasil respons AI
 * 5. Fallback ke word bank lokal jika AI gagal, timeout, atau invalid
 */

require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getRandomWordPair } = require("./wordBank");

// Inisialisasi client Gemini dengan API key dari environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Nama model Gemini yang digunakan — flash-lite untuk ketersediaan tinggi dan latensi sangat cepat
const MODEL_NAME = "gemini-3.5-flash-lite";

// Timeout maksimal dalam milidetik (10 detik untuk testing jaringan lokal)
const AI_TIMEOUT_MS = 10000;

/**
 * Membangun prompt yang memaksa Gemini menghasilkan pasangan kata seru
 * dalam format JSON murni tanpa teks tambahan apapun.
 *
 * @param {string} category - Kategori kata (misal: "makanan", "teknologi")
 * @param {{ wordA: string, wordB: string } | null} previousPair - Pasangan kata ronde sebelumnya
 * @returns {string} Teks prompt lengkap
 */
function buildPrompt(category, previousPair = null) {
  const avoidClause = previousPair
    ? `\n5. WAJIB HINDARI pasangan ini karena sudah dipakai di ronde sebelumnya: "${previousPair.wordA}" dan "${previousPair.wordB}".`
    : "";

  return `Kamu adalah generator kata untuk game social deduction bernama "Kataflase".
Tugasmu adalah memberikan 2 kata benda dalam Bahasa Indonesia untuk kategori: "${category}".

ATURAN WAJIB:
1. Kedua kata HARUS berasal dari kategori "${category}" dan memiliki nuansa atau fungsi yang MIRIP, sehingga pemain sulit menebak mana yang berbeda (contoh bagus: "Kopi" vs "Teh", "Lift" vs "Eskalator", "Singa" vs "Harimau").
2. DILARANG KERAS menggunakan sinonim atau kata yang artinya hampir identik (contoh buruk: "HP" vs "Ponsel", "Mobil" vs "Kendaraan").
3. Setiap kata harus berupa 1-3 kata sederhana, umum, dan mudah dikenal oleh orang Indonesia dari semua kalangan.
4. Output HARUS berupa JSON murni. DILARANG menambahkan markdown seperti \`\`\`json, komentar, atau teks penjelasan apapun di luar JSON.${avoidClause}

Format output yang WAJIB diikuti (tidak boleh ada karakter lain di luar ini):
{"wordA": "Kata Pertama", "wordB": "Kata Kedua"}`;
}

/**
 * Memanggil Gemini API dengan batas waktu maksimal.
 * Melempar error "AI_TIMEOUT" jika melewati batas waktu.
 *
 * @param {string} category - Kategori kata
 * @param {{ wordA: string, wordB: string } | null} previousPair
 * @returns {Promise<{ wordA: string, wordB: string }>}
 */
async function callGeminiAPI(category, previousPair = null) {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      // Memaksa output berformat JSON murni
      responseMimeType: "application/json",
      // Batasi panjang output agar tidak bertele-tele
      maxOutputTokens: 100,
      temperature: 0.9, // Sedikit kreatif tapi tetap konsisten dengan format
    },
  });

  const prompt = buildPrompt(category, previousPair);

  // Buat race antara pemanggilan API dan timer timeout
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("AI_TIMEOUT")),
      AI_TIMEOUT_MS
    )
  );

  const apiCallPromise = model.generateContent(prompt);

  // Promise.race: mana yang selesai duluan, itulah hasilnya
  const result = await Promise.race([apiCallPromise, timeoutPromise]);

  const rawText = result.response.text().trim();

  return parseAndValidateResponse(rawText, previousPair);
}

/**
 * Mem-parse teks JSON dari Gemini dan memvalidasi strukturnya.
 * Melempar error jika format tidak valid atau kata tidak memenuhi syarat.
 *
 * @param {string} rawText - Teks mentah dari respons Gemini
 * @param {{ wordA: string, wordB: string } | null} previousPair
 * @returns {{ wordA: string, wordB: string }}
 */
function parseAndValidateResponse(rawText, previousPair = null) {
  let parsed;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`AI_INVALID_JSON: Tidak bisa parse JSON dari: "${rawText}"`);
  }

  const { wordA, wordB } = parsed;

  // Validasi 1: Kedua field harus ada dan berupa string tidak kosong
  if (
    typeof wordA !== "string" ||
    typeof wordB !== "string" ||
    wordA.trim() === "" ||
    wordB.trim() === ""
  ) {
    throw new Error("AI_INVALID_WORDS: wordA atau wordB kosong atau bukan string.");
  }

  const normalizedA = wordA.trim().toLowerCase();
  const normalizedB = wordB.trim().toLowerCase();

  // Validasi 2: Kedua kata tidak boleh identik setelah normalisasi
  if (normalizedA === normalizedB) {
    throw new Error("AI_IDENTICAL_WORDS: wordA dan wordB identik setelah normalisasi.");
  }

  // Validasi 3: Tidak boleh mengulang pasangan ronde sebelumnya (inklusif urutan terbalik)
  if (previousPair) {
    const prevA = previousPair.wordA.trim().toLowerCase();
    const prevB = previousPair.wordB.trim().toLowerCase();
    if (
      (normalizedA === prevA && normalizedB === prevB) ||
      (normalizedA === prevB && normalizedB === prevA)
    ) {
      throw new Error("AI_REPEATED_PAIR: Pasangan kata sama dengan ronde sebelumnya.");
    }
  }

  // Kembalikan kata dengan trim tapi pertahankan kapitalisasi aslinya
  return { wordA: wordA.trim(), wordB: wordB.trim() };
}

/**
 * Fungsi utama yang dipakai oleh roundManager.
 * Mencoba memanggil Gemini API, lalu otomatis fallback ke word bank lokal
 * jika terjadi error apapun (timeout, invalid JSON, kata tidak valid, dsb).
 *
 * @param {string} category - Kategori yang dipilih host
 * @param {{ wordA: string, wordB: string } | null} previousPair - Kata ronde sebelumnya
 * @returns {Promise<{ wordA: string, wordB: string, source: "ai" | "wordbank" }>}
 */
async function generateWordPair(category, previousPair = null) {
  try {
    console.log(`[Gemini] Memanggil API untuk kategori: "${category}"...`);
    const wordPair = await callGeminiAPI(category, previousPair);
    console.log(`[Gemini] Berhasil: ${wordPair.wordA} vs ${wordPair.wordB}`);

    // Tambahkan field 'source' agar server bisa mencatat/log asal-usul kata
    return { ...wordPair, source: "ai" };
  } catch (error) {
    // Log alasan kegagalan untuk debugging, lalu gunakan fallback
    console.warn(`[Gemini] Gagal (${error.message}). Menggunakan word bank lokal...`);

    const fallbackPair = getRandomWordPair(category, previousPair);
    console.log(`[WordBank] Fallback: ${fallbackPair.wordA} vs ${fallbackPair.wordB}`);

    return { ...fallbackPair, source: "wordbank" };
  }
}

module.exports = {
  generateWordPair,
};

