import { BrowserRouter, Route, Routes } from 'react-router'
import BaseLayout from './pages/BaseLayout'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import ResultPage from './pages/ResultPage'
import RoomPage from './pages/RoomPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<BaseLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms/:code" element={<RoomPage />} />
          <Route path="/rooms/:code/result" element={<ResultPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
