/**
 * wordBank.js
 * Word Bank Lokal sebagai fallback ketika Gemini API tidak tersedia.
 * Digunakan saat AI timeout, error, atau respons tidak valid.
 */

const { createHash } = require("node:crypto");

function getWordPairHash(pair) {
  const words = [pair.wordA, pair.wordB]
    .map((word) => word.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " "))
    .sort();
  return createHash("sha256").update(JSON.stringify(words)).digest("hex");
}

// Daftar pasangan kata per kategori
// Setiap pasangan: [wordA (mayoritas), wordB (impostor)]
// Syarat: Dekat secara nuansa/fungsi, tapi bukan sinonim persis
const WORD_BANK = {
  makanan: [
    { wordA: "Nasi Goreng", wordB: "Mie Goreng" },
    { wordA: "Kopi", wordB: "Teh" },
    { wordA: "Pizza", wordB: "Burger" },
    { wordA: "Soto", wordB: "Bakso" },
    { wordA: "Roti", wordB: "Kue" },
    { wordA: "Es Krim", wordB: "Pudding" },
  ],
  hewan: [
    { wordA: "Kucing", wordB: "Anjing" },
    { wordA: "Singa", wordB: "Harimau" },
    { wordA: "Lumba-lumba", wordB: "Paus" },
    { wordA: "Elang", wordB: "Gagak" },
    { wordA: "Kuda", wordB: "Zebra" },
    { wordA: "Kelinci", wordB: "Hamster" },
  ],
  teknologi: [
    { wordA: "Laptop", wordB: "Tablet" },
    { wordA: "Keyboard", wordB: "Mouse" },
    { wordA: "Instagram", wordB: "TikTok" },
    { wordA: "Lift", wordB: "Eskalator" },
    { wordA: "Charger", wordB: "Power Bank" },
    { wordA: "Headphone", wordB: "Earphone" },
  ],
  olahraga: [
    { wordA: "Sepak Bola", wordB: "Futsal" },
    { wordA: "Basket", wordB: "Voli" },
    { wordA: "Renang", wordB: "Selam" },
    { wordA: "Tenis", wordB: "Badminton" },
    { wordA: "Lari", wordB: "Jalan Cepat" },
    { wordA: "Tinju", wordB: "Gulat" },
  ],
  transportasi: [
    { wordA: "Kereta", wordB: "Bus" },
    { wordA: "Pesawat", wordB: "Helikopter" },
    { wordA: "Motor", wordB: "Sepeda" },
    { wordA: "Kapal", wordB: "Feri" },
    { wordA: "Taksi", wordB: "Ojek" },
    { wordA: "MRT", wordB: "LRT" },
  ],
  acak: [], // Dikosongkan, diisi saat runtime dari semua kategori
};

// Daftar kategori yang tersedia untuk dipilih oleh host
const AVAILABLE_CATEGORIES = [
  "makanan",
  "hewan",
  "teknologi",
  "olahraga",
  "transportasi",
  "acak",
];

// Template petunjuk fallback offline berbasis kategori
// Digunakan saat AI offline atau timeout agar pemain tetap mendapat inspirasi petunjuk
const CATEGORY_HINT_TEMPLATES = {
  makanan: [
    "Pikirkan cita rasa khas, tekstur, atau aroma saat dinikmati.",
    "Bisa dinikmati saat sarapan, santai, atau momen tertentu.",
    "Sering dijumpai di meja makan, kafe, atau warung makan.",
  ],
  hewan: [
    "Perhatikan habitat tempat tinggal, gerakan, atau suara khasnya.",
    "Pikirkan apakah jinak atau liar, serta makanan alaminya.",
    "Fokus pada ciri fisik seperti ukuran, bulu, atau cara berpindahnya.",
  ],
  teknologi: [
    "Pikirkan fungsi utamanya dalam mempermudah pekerjaan sehari-hari.",
    "Bisa dibawa kemana-mana atau terpasang di ruangan tertentu.",
    "Memerlukan daya listrik, baterai, atau tombol navigasi.",
  ],
  olahraga: [
    "Pikirkan arena tempat memainkannya atau perlengkapan yang dipakai.",
    "Melibatkan ketangkasan fisik, kecepatan, atau kerja sama.",
    "Bisa dimainkan secara santai maupun dipertandingkan resmi.",
  ],
  transportasi: [
    "Pikirkan jalurnya: melaju di darat, rel, air, atau udara.",
    "Biasa digunakan untuk mobilitas harian atau perjalanan jauh.",
    "Memiliki kapasitas angkut khusus dan tujuan perjalanan.",
  ],
};

/**
 * Mengambil petunjuk fallback offline yang bervariasi sesuai kategori.
 *
 * @param {string} category - Kategori permainan
 * @returns {string} Petunjuk inspiratif yang aman dari spoiler
 */
function getFallbackHint(category) {
  const templates = Object.hasOwn(CATEGORY_HINT_TEMPLATES, category) ? CATEGORY_HINT_TEMPLATES[category] : [
    "Pikirkan ciri fisik, fungsi umum, atau suasana saat kamu menggunakannya.",
    "Fokus pada karakteristik unik tanpa menyebutkan wujud aslinya.",
  ];
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
}

/**
 * Mengambil satu pasangan kata secara acak dari kategori tertentu.
 * Menghindari pengulangan pasangan dari ronde sebelumnya.
 *
 * @param {string} category - Kategori yang dipilih host (misal: "makanan", "acak")
 * @param {{ wordA: string, wordB: string } | null} previousPair - Pasangan kata ronde sebelumnya
 * @returns {{ wordA: string, wordB: string }} Pasangan kata yang terpilih
 */
function getRandomWordPair(category, previousPair = null) {
  let pool;

  if (category === "acak") {
    // Gabungkan semua pasangan dari semua kategori (kecuali "acak" itu sendiri)
    pool = Object.entries(WORD_BANK)
      .filter(([key]) => key !== "acak")
      .flatMap(([, pairs]) => pairs);
  } else {
    pool = WORD_BANK[category] || [];
  }

  if (pool.length === 0) {
    throw new Error(`Kategori tidak dikenali atau kosong: ${category}`);
  }

  // Filter pasangan yang sama dengan ronde sebelumnya (juga cek urutan terbalik)
  let candidates = pool;
  if (previousPair) {
    const previousHash = typeof previousPair === "string" ? previousPair : getWordPairHash(previousPair);
    candidates = pool.filter((pair) => getWordPairHash(pair) !== previousHash);

    // Pasangan ronde sebelumnya tetap dilarang walaupun pool habis.
    if (candidates.length === 0) {
      throw new Error("Tidak ada pasangan kata berbeda yang tersedia.");
    }
  }

  // Pilih satu pasangan secara acak dari kandidat yang tersisa
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

/**
 * Mengembalikan daftar kategori yang tersedia untuk ditampilkan di lobby.
 * @returns {string[]}
 */
function getAvailableCategories() {
  return AVAILABLE_CATEGORIES;
}

/**
 * Memvalidasi apakah kategori yang dikirim client adalah kategori yang sah.
 * @param {string} category
 * @returns {boolean}
 */
function isValidCategory(category) {
  return AVAILABLE_CATEGORIES.includes(category);
}

module.exports = {
  getWordPairHash,
  getRandomWordPair,
  getFallbackHint,
  getAvailableCategories,
  isValidCategory,
  WORD_BANK,
  AVAILABLE_CATEGORIES,
};
