import { createSlice } from '@reduxjs/toolkit'

const gameSlice = createSlice({
  name: 'game',
  initialState: { room: null },
  reducers: {
    roomReceived(state, action) {
      state.room = action.payload
    },
    roomCleared(state) {
      state.room = null
    },
  },
})

export const { roomReceived, roomCleared } = gameSlice.actions
export const selectRoom = (state) => state.game.room
export default gameSlice.reducer
