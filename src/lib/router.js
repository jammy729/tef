// Real URL paths via the native History API — no router dependency (spec §5's "no router"
// decision was about not adding one; the History API is the platform feature that gives real,
// shareable/back-button-able URLs for free). One path per screen; onNavigate(view, param)'s
// existing signature is unchanged, this just keeps window.location in sync with it.

const VIEW_TO_PATH = {
  learn: '/learn',
  lesson: '/lesson',
  call: '/call',
  historique: '/historique',
  objectif: '/objectif',
  progress: '/progress',
  settings: '/settings',
}

export const ONBOARDING_PATH = '/registration'

export function pathToView(pathname) {
  if (pathname === ONBOARDING_PATH) return { view: 'registration' }
  const [, first, second] = pathname.split('/')
  if (first === 'lesson' && second) return { view: 'lesson', lessonId: second }
  const view = Object.keys(VIEW_TO_PATH).find((v) => VIEW_TO_PATH[v] === `/${first}`)
  return { view: view ?? 'learn' }
}

export function viewToPath(view, param) {
  if (view === 'lesson' && param) return `/lesson/${param}`
  return VIEW_TO_PATH[view] ?? '/learn'
}
