import { Link } from 'react-router'

export default function AppHeader({ right = null }) {
  return (
    <header className="flex min-h-9 items-center justify-between gap-3">
      <Link to="/" className="font-display text-lg font-extrabold tracking-tight text-ink">
        Kata<span className="text-cobalt">flase</span>
      </Link>
      {right}
    </header>
  )
}
