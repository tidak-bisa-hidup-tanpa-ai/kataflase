import { Outlet } from 'react-router'
import ConnectionBanner from '../components/ConnectionBanner'

export default function BaseLayout() {
  return (
    <>
      <ConnectionBanner />
      <main className="relative mx-auto w-full max-w-md overflow-x-clip px-4 pt-5 pb-8 lg:max-w-6xl lg:px-10 lg:pt-8 lg:pb-12">
        <Outlet />
      </main>
    </>
  )
}
