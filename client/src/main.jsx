import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store'
import { GameProvider } from './contexts/GameProvider'
import { ThemeProvider } from './contexts/ThemeProvider'
import 'toastify-js/src/toastify.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
