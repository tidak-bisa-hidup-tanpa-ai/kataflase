import axios from 'axios'
import { RANDOM_CATEGORY } from '../constant/game'
import { SERVER_URL } from '../constant/url'

export const api = axios.create({ baseURL: SERVER_URL, timeout: 5000 })

function toCategory(item) {
  if (typeof item === 'string') return { id: item, label: item }
  const id = item?.id ?? item?.value ?? item?.slug ?? item?.name
  if (!id) return null
  return { id: String(id), label: item.label ?? item.name ?? String(id) }
}

// GET /api/game-options → { data: { categories: ["makanan", ...] } }
// Selalu mengembalikan "Acak" di urutan pertama.
export async function getGameOptions() {
  const { data } = await api.get('/api/game-options')
  const raw = data.data.categories
  const categories = raw
    .map(toCategory)
    .filter((c) => c && c.id !== RANDOM_CATEGORY.id)
  return [RANDOM_CATEGORY, ...categories]
}
