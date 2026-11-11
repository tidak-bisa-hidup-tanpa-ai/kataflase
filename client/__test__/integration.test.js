import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { build, createServer } from 'vite'

let vite
let GameContext
let CluePhase
let VotingPhase
let ResultPage

before(async () => {
  vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true },
  })
  ;({ GameContext } = await vite.ssrLoadModule('/src/contexts/GameContext.js'))
  ;({ default: CluePhase } = await vite.ssrLoadModule('/src/components/phases/CluePhase.jsx'))
  ;({ default: VotingPhase } = await vite.ssrLoadModule('/src/components/phases/VotingPhase.jsx'))
  ;({ default: ResultPage } = await vite.ssrLoadModule('/src/pages/ResultPage.jsx'))
})

after(async () => {
  await vite?.close()
})

const participants = [
  { playerId: 1, nickname: 'Rockwell' },
  { playerId: 2, nickname: 'Fardian' },
  { playerId: 3, nickname: 'Arief' },
]

function render(Component, overrides = {}) {
  const room = {
    code: 'ABC123', hostId: 1, phase: 'VOTING', revision: 8,
    players: [{ ...participants[0], online: true }, { ...participants[2], online: false }],
    participants, roundId: 'round-1', turnOrder: [1, 2, 3], currentTurnPlayerId: 1,
    clues: [{ playerId: 2, text: 'Hangat', skipped: false }], deadlineAt: null,
    voting: { submitted: 2, total: 3 },
    ...overrides,
  }
  const value = {
    room, playerId: 1, isHost: true, canAct: true, status: 'ready',
    session: { code: room.code, playerId: 1 }, myWord: 'Kopi', now: Date.now,
  }
  const routes = createElement(Routes, null, createElement(Route, {
    path: '/rooms/:code/result', element: createElement(Component),
  }))
  const provider = createElement(GameContext.Provider, { value }, routes)
  return renderToStaticMarkup(createElement(MemoryRouter, {
    initialEntries: [`/rooms/${room.code}/result`],
  }, provider))
    .replace(/<!--.*?-->/g, '')
}

test('peserta dengan playerId angka melihat giliran dan nama pengirim clue', () => {
  const html = render(CluePhase, { phase: 'CLUE' })
  assert.match(html, /Giliran kamu/)
  assert.match(html, /Petunjukmu muncul di sini/)
  assert.match(html, /Minta Saran/)
  assert.match(html, /Fardian/)
  assert.match(html, /Hangat/)
})

test('voting memakai peserta ronde, termasuk pemain yang keluar, dan progres server', () => {
  const html = render(VotingPhase)
  assert.match(html, /2 dari 3 sudah memilih/)
  assert.equal((html.match(/role="radio"/g) ?? []).length, 2)
  assert.match(html, /Fardian/)
  assert.match(html, /Arief/)
  assert.doesNotMatch(html, /Kamu tidak ikut ronde ini/)
})

test('hasil menampilkan kata, tally, impostor, dan abstain dari kontrak server', () => {
  const html = render(ResultPage, {
    phase: 'RESULT',
    result: {
      winner: 'CIVILIANS', impostorId: 2, reason: 'Impostor tertangkap.',
      playerWords: { 1: 'Kopi', 2: 'Teh', 3: 'Kopi' },
      voteTally: { 1: 0, 2: 2, 3: 0 },
      recap: { recap: 'Warga kompak menangkap impostor.', source: 'fallback' },
    },
  })
  assert.match(html, /Pemain biasa menang/)
  assert.match(html, /Kamu menang ronde ini!/)
  assert.match(html, />Fardian</)
  assert.match(html, />Kopi</)
  assert.match(html, />Teh</)
  assert.match(html, />2<\/span>/)
  assert.match(html, /1 pemain abstain/)
  assert.match(html, /Main Lagi/)
  assert.match(html, /Kartu impostor tertangkap/)
  assert.match(html, /Warga kompak menangkap impostor\./)
})

test('build menghasilkan CSS untuk layout mobile dan desktop', async () => {
  const { output } = await build({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    build: { write: false },
  })
  const css = output
    .filter((file) => file.type === 'asset' && file.fileName.endsWith('.css'))
    .map((file) => String(file.source))
    .join('\n')
  assert.match(css, /\.flex\s*\{\s*display:\s*flex/)
  assert.match(css, /\.px-4\s*\{/)
  assert.match(css, /\.lg\\:grid\s*\{/)
})
