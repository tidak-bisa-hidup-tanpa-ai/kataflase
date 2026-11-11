import { ROUND_TABS } from '../../constant/game'
import { useGame } from '../../contexts/GameContext'

export default function PhaseTabs() {
  const { room } = useGame()
  const activeIndex = ROUND_TABS.findIndex((tab) => tab.phase === room.phase)

  return (
    <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Tahap ronde">
      {ROUND_TABS.map((tab, index) => (
        <li
          key={tab.phase}
          aria-current={index === activeIndex ? 'step' : undefined}
          className={`pill justify-center px-1 ${
            index === activeIndex ? 'bg-ink text-card' : index < activeIndex ? 'opacity-35' : ''
          }`}
        >
          {tab.label}
        </li>
      ))}
    </ol>
  )
}
