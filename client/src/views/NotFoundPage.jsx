import { Link } from 'react-router'
import AppHeader from '../components/AppHeader'
import Mascot from '../components/ui/Mascot'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md">
      <AppHeader />
      <Mascot mood="confused" className="mt-10 w-28 motion-safe:animate-bob" />
      <h1 className="display mt-4 text-5xl leading-none lg:text-7xl">
        Halaman <span className="misreg">salah</span> cetak
      </h1>
      <p className="mt-4 text-sm text-muted">Halaman yang kamu cari tidak ada.</p>
      <Link to="/" className="btn btn-ink mt-8 w-full">
        Kembali ke Home
      </Link>
    </div>
  )
}
