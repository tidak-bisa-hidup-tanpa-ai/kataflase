const defaultServerUrl = import.meta.env.PROD
  ? 'https://kataflase-server.dipatipaw.web.id'
  : 'http://localhost:3000'

export const SERVER_URL = (
  import.meta.env.VITE_SERVER_URL?.trim() || defaultServerUrl
).replace(/\/+$/, '')
