import { Outlet } from 'react-router'
import ConnectionBanner from '../components/ConnectionBanner'
import { useTheme } from '../contexts/ThemeContext'

export default function BaseLayout() {
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      <ConnectionBanner />
      <div className="mx-auto flex w-full max-w-md justify-end px-4 pt-3 lg:max-w-6xl lg:px-10">
        <button
          type="button"
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
          className="pill min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt aria-pressed:bg-ink aria-pressed:text-card"
        >
          Tema gelap
        </button>
      </div>
      <main className="relative mx-auto w-full max-w-md overflow-x-clip px-4 pt-5 pb-8 lg:max-w-6xl lg:px-10 lg:pt-8 lg:pb-12">
        <Outlet />
      </main>
    </>
  )
}
