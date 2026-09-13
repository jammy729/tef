// Static scenario library for Call modes (spec §3.2.2) — Task A (obtain information) and Task B
// (express and defend a point of view), the TEF's two real speaking tasks. `fr` is what's actually
// used server-side (api/tutor.js imports this same file so scenario content never drifts); `en` is
// a short gloss so an English-UI learner knows what they're walking into before they call.
export const TASK_A_SCENARIOS = [
  {
    id: 'hotel-cancel',
    fr: "Tu appelles un hôtel pour annuler ta réservation car tes plans de voyage ont changé.",
    en: 'Call a hotel to cancel your reservation because your travel plans changed.',
  },
  {
    id: 'internet-bill',
    fr: "Tu appelles ton fournisseur internet parce que ta facture a doublé sans explication.",
    en: 'Call your internet provider because your bill doubled with no explanation.',
  },
  {
    id: 'doctor-appointment',
    fr: 'Tu appelles une clinique pour prendre un rendez-vous médical le plus tôt possible.',
    en: 'Call a clinic to book a medical appointment as soon as possible.',
  },
  {
    id: 'apartment-viewing',
    fr: "Tu appelles un propriétaire pour organiser une visite d'appartement ce week-end.",
    en: 'Call a landlord to arrange an apartment viewing this weekend.',
  },
]

export const TASK_B_SCENARIOS = [
  {
    id: 'remote-work',
    fr: 'Le télétravail devrait devenir la norme pour tous les emplois de bureau.',
    en: 'Remote work should become the norm for all office jobs.',
  },
  {
    id: 'social-media',
    fr: 'Les réseaux sociaux font plus de mal que de bien à la société.',
    en: 'Social media does more harm than good to society.',
  },
  {
    id: 'nuclear-energy',
    fr: 'Le nucléaire est la meilleure solution pour lutter contre le changement climatique.',
    en: 'Nuclear energy is the best solution to fight climate change.',
  },
  {
    id: 'four-day-week',
    fr: 'La semaine de quatre jours devrait être obligatoire dans tous les pays.',
    en: 'The four-day work week should be mandatory in every country.',
  },
]

export function pickScenario(list) {
  return list[Math.floor(Math.random() * list.length)]
}
