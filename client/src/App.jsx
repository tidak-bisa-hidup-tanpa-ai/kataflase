import { BrowserRouter, Route, Routes } from 'react-router'
import ConnectionBanner from './components/ConnectionBanner'
import { GameProvider } from './contexts/GameProvider'
import HomePage from './views/HomePage'
import NotFoundPage from './views/NotFoundPage'
import ResultPage from './views/ResultPage'
import RoomPage from './views/RoomPage'

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <ConnectionBanner />
        <main className="relative mx-auto w-full max-w-md overflow-x-clip px-4 pt-5 pb-8 lg:max-w-6xl lg:px-10 lg:pt-8 lg:pb-12">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/rooms/:code" element={<RoomPage />} />
            <Route path="/rooms/:code/result" element={<ResultPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </GameProvider>
    </BrowserRouter>
  )
}
