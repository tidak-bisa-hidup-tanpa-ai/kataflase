const assert = require("node:assert/strict");
const test = require("node:test");
const { getFallbackHint } = require("../helpers/wordBank");

/** Load gemini.js with a deterministic Gemini SDK stub for this test. */
function loadGemini({ apiKey = "test-key", responseText, networkError } = {}) {
  const sdkPath = require.resolve("@google/generative-ai");
  const helperPath = require.resolve("../helpers/gemini");
  const originalSdk = require.cache[sdkPath];
  const originalHelper = require.cache[helperPath];
  const originalApiKey = process.env.GEMINI_API_KEY;

  class GoogleGenerativeAIStub {
    getGenerativeModel() {
      return {
        generateContent: async () => {
          if (networkError) throw new Error(networkError);
          return { response: { text: () => responseText } };
        },
      };
    }
  }

  require.cache[sdkPath] = {
    id: sdkPath,
    filename: sdkPath,
    loaded: true,
    exports: { GoogleGenerativeAI: GoogleGenerativeAIStub },
  };
  delete require.cache[helperPath];
  if (apiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = apiKey;

  const gemini = require("../helpers/gemini");

  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
  delete require.cache[helperPath];
  if (originalHelper) require.cache[helperPath] = originalHelper;
  if (originalSdk) require.cache[sdkPath] = originalSdk;
  else delete require.cache[sdkPath];

  return gemini;
}

test("fallback hint tersedia sebagai string untuk semua kategori", () => {
  const categories = [
    "makanan",
    "hewan",
    "teknologi",
    "olahraga",
    "transportasi",
    "acak",
    "kategori_kustom",
    "constructor",
    "__proto__",
  ];

  for (const category of categories) {
    const hint = getFallbackHint(category);
    assert.equal(typeof hint, "string");
    assert.ok(hint.trim().length > 5, `Hint untuk ${category} harus > 5 karakter`);
  }
});

test("generateClueHint memberi hint AI yang valid tanpa membocorkan kata rahasia", async () => {
  const { generateClueHint } = loadGemini({ responseText: '{"hint":"aroma pagi"}' });
  const result = await generateClueHint("Kopi", "makanan");

  assert.equal(result.source, "ai");
  assert.equal(typeof result.hint, "string");
  assert.ok(result.hint.trim().length > 0);
  assert.ok(!result.hint.toLocaleLowerCase("id-ID").includes("kopi"));
});

test("generateClueHint memakai fallback saat API key kosong", async () => {
  const { generateClueHint } = loadGemini({ apiKey: "", responseText: "unused" });
  const result = await generateClueHint("Kopi", "makanan");

  assert.equal(result.source, "fallback");
  assert.equal(typeof result.hint, "string");
  assert.ok(result.hint.trim().length > 0);
  assert.ok(!result.hint.toLocaleLowerCase("id-ID").includes("kopi"));
});

test("generateClueHint menolak respons AI yang membocorkan kata rahasia", async () => {
  for (const hint of ["Kopi hangat", "k.o.p.i hangat"]) {
    const { generateClueHint } = loadGemini({ responseText: JSON.stringify({ hint }) });
    const result = await generateClueHint("Kopi", "makanan");
    assert.equal(result.source, "fallback");
    assert.ok(!result.hint.toLocaleLowerCase("id-ID").includes("kopi"));
  }
});

test("generateMatchRecap merangkum kemenangan warga dan impostor", async () => {
  const wargaRecap = "Warga jeli membaca petunjuk; penyamaran impostor akhirnya terbongkar!";
  const { generateMatchRecap } = loadGemini({
    responseText: JSON.stringify({ recap: wargaRecap }),
  });
  const wargaResult = await generateMatchRecap({
    winner: "CIVILIANS",
    impostorNickname: "Arief",
    majorityWord: "Kopi",
    impostorWord: "Teh",
    clues: [{ nickname: "Budi", text: "aroma pagi" }],
    reason: "Warga berhasil menebak Impostor",
  });
  assert.equal(wargaResult.source, "ai");
  assert.equal(wargaResult.recap, wargaRecap);

  const impostorRecap = "Impostor berhasil berbaur dan mengecoh warga sampai akhir ronde!";
  const { generateMatchRecap: generateImpostorRecap } = loadGemini({
    responseText: JSON.stringify({ recap: impostorRecap }),
  });
  const impostorResult = await generateImpostorRecap({
    winner: "IMPOSTOR",
    impostorNickname: "Fardian",
    majorityWord: "Laptop",
    impostorWord: "Tablet",
    clues: [{ nickname: "Fardian", text: "bisa dibawa" }],
    reason: "Warga salah menebak",
  });
  assert.equal(impostorResult.source, "ai");
  assert.equal(impostorResult.recap, impostorRecap);
});

test("generateMatchRecap memakai fallback saat terjadi gangguan jaringan", async () => {
  const { generateMatchRecap } = loadGemini({ networkError: "network unavailable" });
  const result = await generateMatchRecap({
    winner: "CIVILIANS",
    impostorNickname: "Arief",
    majorityWord: "Kopi",
    impostorWord: "Teh",
  });

  assert.equal(result.source, "fallback");
  assert.equal(typeof result.recap, "string");
  assert.ok(result.recap.trim().length > 10);
});
