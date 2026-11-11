import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GameProvider } from './contexts/GameProvider'
import 'toastify-js/src/toastify.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
)
