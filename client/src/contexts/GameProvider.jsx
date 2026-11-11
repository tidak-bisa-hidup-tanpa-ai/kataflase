import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { isExpiredCode } from '../constant/errors'
import { roomCleared, roomReceived, selectRoom } from '../features/game/gameSlice'
import { clearSession, loadSession, saveSession } from '../helpers/session'
import { socket } from '../socket'
import { GameContext } from './GameContext'

const ACK_TIMEOUT_MS = 8000
const AI_ACK_TIMEOUT_MS = 15000
const CONNECT_TIMEOUT_MS = 6000
const ROOM_FALLBACK_MS = 2000

// ACK server: { ok: true, data } atau { ok: false, error: { code, message } }
function normalizeAck(res) {
  if (res?.ok === true) return { ok: true, data: res.data ?? {} }
  if (res?.ok === false) {
    return { ok: false, code: res.error?.code ?? 'UNKNOWN', message: res.error?.message }
  }
  return { ok: false, code: 'UNKNOWN' }
}

async function emitConnected(event, payload) {
  if (!socket.connected) return { ok: false, code: 'NETWORK' }
  try {
    const args = payload === undefined ? [] : [payload]
    const timeout = event === 'game:start' || event === 'clue:hint'
      ? AI_ACK_TIMEOUT_MS
      : ACK_TIMEOUT_MS
    const res = await socket.timeout(timeout).emitWithAck(event, ...args)
    return normalizeAck(res)
  } catch {
    return { ok: false, code: 'TIMEOUT' }
  }
}

function waitForConnection() {
  if (socket.connected) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off('connect', onConnect)
      resolve(false)
    }, CONNECT_TIMEOUT_MS)
    function onConnect() {
      clearTimeout(timer)
      resolve(true)
    }
    socket.once('connect', onConnect)
    socket.connect()
  })
}

async function emitWithAck(event, payload) {
  const ready = await waitForConnection()
  if (!ready) return { ok: false, code: 'NETWORK' }
  return emitConnected(event, payload)
}

export function GameProvider({ children }) {
  const dispatch = useDispatch()
  const store = useStore()
  const room = useSelector(selectRoom)
  const [session, setSession] = useState(loadSession)
  const [status, setStatus] = useState(session ? 'resuming' : 'idle')
  const [connected, setConnected] = useState(socket.connected)
  const [privateState, setPrivateState] = useState(null)
  const [expiredReason, setExpiredReason] = useState(null)

  const sessionRef = useRef(session)
  const serverClockRef = useRef(null)
  // true setelah socket saat ini terikat ke sesi (resume/create/join sukses).
  const boundRef = useRef(false)

  const now = useCallback(() => {
    const clock = serverClockRef.current
    if (!clock) return Date.now()
    return clock.serverTime + (performance.now() - clock.receivedAt)
  }, [])

  const updateSession = useCallback((next) => {
    sessionRef.current = next
    setSession(next)
    if (next) saveSession(next)
    else clearSession()
  }, [])

  const resetRoom = useCallback(() => {
    dispatch(roomCleared())
    setPrivateState(null)
  }, [dispatch])

  const receiveRoom = useCallback((next) => {
    if (!next?.code) return
    const current = sessionRef.current
    if (current && current.code !== next.code) return

    const prev = selectRoom(store.getState())
    if (
      prev &&
      prev.code === next.code &&
      Number(next.revision) < Number(prev.revision)
    ) {
      return
    }

    if (next.serverNow) {
      const serverTime = Date.parse(next.serverNow)
      if (!Number.isNaN(serverTime)) {
        serverClockRef.current = { serverTime, receivedAt: performance.now() }
      }
    }

    dispatch(roomReceived(next))
  }, [dispatch, store])

  const receivePlayer = useCallback((next) => {
    if (next) setPrivateState(next)
  }, [])

  const applyAckData = useCallback(
    (data) => {
      if (data?.room) receiveRoom(data.room)
      if (data?.player) receivePlayer(data.player)
    },
    [receiveRoom, receivePlayer],
  )

  const expire = useCallback(
    (code) => {
      updateSession(null)
      resetRoom()
      setExpiredReason(code || 'SESSION_EXPIRED')
      setStatus('expired')
    },
    [updateSession, resetRoom],
  )

  const resume = useCallback(async () => {
    const current = sessionRef.current
    if (!current) return
    boundRef.current = false
    setStatus('resuming')
    if (!socket.connected) {
      // Handler 'connect' akan memanggil resume lagi.
      socket.connect()
      return
    }
    const res = await emitConnected('room:resume', {
      code: current.code,
      sessionToken: current.sessionToken,
    })
    if (sessionRef.current !== current) return
    if (res.ok) {
      boundRef.current = true
      applyAckData(res.data)
      setStatus('ready')
    } else if (isExpiredCode(res.code)) {
      expire(res.code)
    } else {
      setStatus('error')
    }
  }, [applyAckData, expire])

  useEffect(() => {
    function onConnect() {
      setConnected(true)
      if (sessionRef.current) resume()
    }
    function onDisconnect() {
      boundRef.current = false
      setConnected(false)
    }
    function onConnectError() {
      onDisconnect()
      if (sessionRef.current) setStatus('error')
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('room:state', receiveRoom)
    socket.on('player:state', receivePlayer)

    let timer
    if (!socket.connected) socket.connect()
    else if (sessionRef.current) timer = setTimeout(resume, 0)

    return () => {
      clearTimeout(timer)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('room:state', receiveRoom)
      socket.off('player:state', receivePlayer)
    }
  }, [resume, receiveRoom, receivePlayer])

  const startSession = useCallback(
    (data) => {
      const next = {
        code: String(data.code),
        playerId: data.playerId,
        sessionToken: data.sessionToken,
      }
      const currentRoom = selectRoom(store.getState())
      if (currentRoom && currentRoom.code !== next.code) resetRoom()
      boundRef.current = true
      updateSession(next)
      setExpiredReason(null)
      setStatus('ready')
      applyAckData(data)

      // Jika room:state belum datang, minta snapshot lewat resume.
      setTimeout(() => {
        if (sessionRef.current === next && !selectRoom(store.getState())) resume()
      }, ROOM_FALLBACK_MS)
    },
    [resetRoom, updateSession, applyAckData, resume, store],
  )

  const leaveRoom = useCallback(async () => {
    const current = sessionRef.current
    boundRef.current = false
    updateSession(null)
    resetRoom()
    setExpiredReason(null)
    setStatus('idle')
    if (current) await emitConnected('room:leave')
  }, [updateSession, resetRoom])

  const createRoom = useCallback(
    async (nickname) => {
      if (sessionRef.current) await leaveRoom()
      const res = await emitWithAck('room:create', { nickname })
      if (res.ok) startSession(res.data)
      return res
    },
    [leaveRoom, startSession],
  )

  const joinRoom = useCallback(
    async (code, nickname) => {
      if (sessionRef.current) await leaveRoom()
      const res = await emitWithAck('room:join', { code, nickname })
      if (res.ok) startSession(res.data)
      return res
    },
    [leaveRoom, startSession],
  )

  const act = useCallback(
    async (event, payload) => {
      // Jangan kirim aksi sebelum socket baru selesai resume.
      if (!socket.connected || !boundRef.current) {
        return { ok: false, code: 'NETWORK' }
      }
      const current = sessionRef.current
      const res = await emitConnected(event, payload)
      if (!res.ok && current && sessionRef.current === current && isExpiredCode(res.code)) {
        expire(res.code)
      }
      return res
    },
    [expire],
  )

  const startGame = useCallback(
    (category, customCategory) => act('game:start', { category, customCategory }),
    [act],
  )

  const restartGame = useCallback(
    () => act('game:restart', { roundId: selectRoom(store.getState())?.roundId }),
    [act, store],
  )

  const submitClue = useCallback(
    (text) => act('clue:submit', { roundId: selectRoom(store.getState())?.roundId, text }),
    [act, store],
  )

  const requestClueHint = useCallback(
    () => act('clue:hint', { roundId: selectRoom(store.getState())?.roundId }),
    [act, store],
  )

  const sendChat = useCallback(
    (text) => act('chat:send', { roundId: selectRoom(store.getState())?.roundId, text }),
    [act, store],
  )

  const submitVote = useCallback(
    async (targetPlayerId) => {
      const roundId = selectRoom(store.getState())?.roundId
      const res = await act('vote:submit', { roundId, targetPlayerId })
      if (res.ok) {
        setPrivateState((prev) => ({
          ...(prev?.roundId === roundId ? prev : { roundId }),
          hasVoted: true,
        }))
      }
      return res
    },
    [act, store],
  )

  const dismissExpired = useCallback(() => {
    setExpiredReason(null)
    setStatus((prev) => (prev === 'expired' ? 'idle' : prev))
  }, [])

  const value = useMemo(() => {
    const playerId = session?.playerId ?? null
    const me = room?.players?.find((p) => p.playerId === playerId) ?? null
    // Kata hanya ditampilkan jika roundId cocok dengan ronde yang aktif.
    const activePrivate =
      privateState && room?.roundId && privateState.roundId === room.roundId
        ? privateState
        : null

    return {
      session,
      playerId,
      status,
      connected,
      canAct: connected && status === 'ready',
      room,
      me,
      isHost: Boolean(room && playerId && room.hostId === playerId),
      myWord: activePrivate?.word ?? null,
      hasVoted: Boolean(activePrivate?.hasVoted),
      expiredReason,
      now,
      resume,
      createRoom,
      joinRoom,
      leaveRoom,
      startGame,
      restartGame,
      submitClue,
      requestClueHint,
      sendChat,
      submitVote,
      dismissExpired,
    }
  }, [
    session,
    status,
    connected,
    room,
    privateState,
    expiredReason,
    now,
    resume,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    restartGame,
    submitClue,
    requestClueHint,
    sendChat,
    submitVote,
    dismissExpired,
  ])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
