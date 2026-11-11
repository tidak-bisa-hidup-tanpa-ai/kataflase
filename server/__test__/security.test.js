const assert = require("node:assert/strict");
const test = require("node:test");
const { validateClue, validateVote } = require("../helpers/validator");
const { extractJsonBlock, parseAndValidateResponse } = require("../helpers/gemini");
const { getWordPairHash } = require("../helpers/wordBank");

test("clue menolak kata yang disamarkan tanpa menolak kata lain", () => {
  for (const clue of ["kopi manis", "k o p i", "k.o.p.i", "k-o_p!i", "k\u200bo\u200bp\u200bi", "ＫＯＰＩ", "aku suka k ☕ o ☕ p ☕ i"]) {
    assert.equal(validateClue(clue, "Kopi").valid, false, clue);
  }
  assert.equal(validateClue("aku suka g.o.r.e.n.g", "Nasi Goreng").valid, false);
  assert.equal(validateClue("e s", "Es Krim").valid, false);
  for (const clue of ["eskalator", "besar", "segar", "bersih"]) {
    assert.equal(validateClue(clue, "Es Krim").valid, true, clue);
  }
  assert.equal(validateClue("minuman hitam pekat", "Kopi").valid, true);
});

test("clue mempertahankan batas kontrak dan menolak input kosong", () => {
  for (const clue of [undefined, null, 123, {}, "", "   ", "a".repeat(101)]) {
    assert.equal(validateClue(clue, "Kopi").valid, false);
  }
  assert.equal(validateClue("a".repeat(100), "Kopi").valid, true);
  for (const word of [undefined, null, "", "   "]) {
    assert.equal(validateClue("hangat", word).valid, false);
  }
});

test("vote memakai suara tersimpan dan mempertahankan kode error", () => {
  const base = { voterId: 1, targetPlayerId: 2, activePlayers: [{ playerId: 1 }, { playerId: 2 }, { playerId: 3 }], votes: {} };
  assert.equal(validateVote(base).valid, true);
  assert.equal(validateVote({ ...base, votes: { 1: 3 } }).code, "ALREADY_VOTED");
  assert.equal(validateVote({ ...base, targetPlayerId: 1 }).code, "CANNOT_VOTE_SELF");
  for (const targetPlayerId of [0, 4, "2", null, {}, "__proto__"]) {
    assert.equal(validateVote({ ...base, targetPlayerId }).code, "INVALID_TARGET");
  }
  assert.equal(validateVote({ ...base, activePlayers: null }).code, "INVALID_TARGET");
});

test("parser menerima JSON dengan pembungkus, hanya mengembalikan kata", () => {
  const json = '{"wordA":"Kopi","wordB":"Teh","extra":{"impostorId":1}}';
  for (const response of [json, `\x60\x60\x60json\n${json}\n\x60\x60\x60`, `Berikut jawabannya: ${json}`]) {
    assert.deepEqual(parseAndValidateResponse(response), { wordA: "Kopi", wordB: "Teh" });
    assert.equal(extractJsonBlock(response), json);
  }
});

test("parser menolak JSON invalid, tipe salah, dan kata identik", () => {
  for (const response of [undefined, null, "", "tanpa JSON", "{}", "null", "[]", '[{"wordA":"Kopi","wordB":"Teh"}]', '{"wordA":2,"wordB":"Teh"}', '{"wordA":"","wordB":"Teh"}', '{"wordA":"Kopi","wordB":"kopi"}', '{"wordA":"ＫＯＰＩ","wordB":"kopi"}', JSON.stringify({ wordA: "a".repeat(61), wordB: "Teh" }), '{"wordA":"Kopi","wordB":}']) {
    assert.throws(() => parseAndValidateResponse(response));
  }
  assert.equal(extractJsonBlock(null), null);
  assert.equal(extractJsonBlock("tanpa JSON"), null);
});

test("parser mempertahankan pemeriksaan hash pasangan ronde terakhir", () => {
  const previous = { wordA: "Kopi", wordB: "Teh" };
  for (const lastPair of [previous, getWordPairHash(previous)]) {
    assert.throws(() => parseAndValidateResponse('{"wordA":" TEH ","wordB":"kopi"}', lastPair), /AI_REPEATED_PAIR/);
    assert.deepEqual(parseAndValidateResponse('{"wordA":"Soto","wordB":"Bakso"}', lastPair), { wordA: "Soto", wordB: "Bakso" });
  }
});
