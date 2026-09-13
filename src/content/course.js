// Static Learn & Practice content (spec §3.2) — Course → Level → Unit → Lesson, written once,
// not fetched from a CMS/database (this app has no database at all, per spec §5). Every
// LearningItem and Exercise has a stable id so progress/review records can reference it across
// sessions, and so the Call's mastered-expression theming and a future fuller AI Coach can read
// the same ids (spec §3.2.6/§3.2.7). Every exercise is tap-only — no typing anywhere (spec §3.2.2).

export const LEARNING_ITEMS = {
  essentiel: {
    id: 'essentiel',
    type: 'vocabulary',
    word: 'essentiel',
    meaning: 'essential',
    partOfSpeech: 'adjective',
    level: 'B1',
    topic: 'Opinion',
    example: 'Cette question est essentielle.',
    related: ['important', 'indispensable', 'primordial'],
  },
  benefique: {
    id: 'benefique',
    type: 'vocabulary',
    word: 'bénéfique',
    meaning: 'beneficial',
    partOfSpeech: 'adjective',
    level: 'B1',
    topic: 'Opinion',
    example: 'Le télétravail est bénéfique pour beaucoup de salariés.',
    related: ['avantageux', 'positif'],
  },
  avantage: {
    id: 'avantage',
    type: 'vocabulary',
    word: 'avantage',
    meaning: 'advantage',
    partOfSpeech: 'noun (m.)',
    level: 'B1',
    topic: 'Opinion',
    example: 'Le principal avantage, c’est la flexibilité.',
    related: ['bénéfice', 'atout'],
  },
  inconvenient: {
    id: 'inconvenient',
    type: 'vocabulary',
    word: 'inconvénient',
    meaning: 'drawback',
    partOfSpeech: 'noun (m.)',
    level: 'B1',
    topic: 'Opinion',
    example: 'Le principal inconvénient, c’est l’isolement.',
    related: ['désavantage'],
  },
  solution: {
    id: 'solution',
    type: 'vocabulary',
    word: 'solution',
    meaning: 'solution',
    partOfSpeech: 'noun (f.)',
    level: 'B1',
    topic: 'Opinion',
    example: 'Cette solution me semble efficace.',
    related: ['réponse'],
  },

  'a-mon-avis': {
    id: 'a-mon-avis',
    type: 'phrase',
    phrase: 'À mon avis',
    meaning: 'In my opinion',
    function: 'Opinion',
    level: 'B1',
    topic: 'Opinion',
    tefUsage: 'Expression orale / écrite',
    example: 'À mon avis, le télétravail présente plusieurs avantages.',
    related: ['Selon moi', 'Je pense que'],
  },
  'selon-moi': {
    id: 'selon-moi',
    type: 'phrase',
    phrase: 'Selon moi',
    meaning: 'In my opinion / According to me',
    function: 'Opinion',
    level: 'B1',
    topic: 'Opinion',
    tefUsage: 'Expression orale / écrite',
    example: 'Selon moi, cette solution est efficace.',
    related: ['À mon avis'],
  },
  'en-revanche': {
    id: 'en-revanche',
    type: 'phrase',
    phrase: 'En revanche',
    meaning: 'On the other hand',
    function: 'Contrast',
    level: 'B1',
    topic: 'Opinion',
    tefUsage: 'Expression orale / écrite — argumentation',
    example:
      'Le télétravail est pratique. En revanche, il peut être difficile de séparer vie privée et vie professionnelle.',
    related: ['Cependant', 'Toutefois'],
  },
  'de-plus': {
    id: 'de-plus',
    type: 'phrase',
    phrase: 'De plus',
    meaning: 'Furthermore / In addition',
    function: 'Adding an argument',
    level: 'B1',
    topic: 'Opinion',
    tefUsage: 'Expression écrite — structurer un argument',
    example: 'De plus, cette solution coûte moins cher.',
    related: ['En outre', 'Par ailleurs'],
  },
  'par-exemple': {
    id: 'par-exemple',
    type: 'phrase',
    phrase: 'Par exemple',
    meaning: 'For example',
    function: 'Giving an example',
    level: 'B1',
    topic: 'Opinion',
    tefUsage: 'Expression orale / écrite',
    example: 'Par exemple, on peut travailler de chez soi deux jours par semaine.',
    related: ['Prenons le cas de'],
  },

  'subject-verb-agreement': {
    id: 'subject-verb-agreement',
    type: 'grammar',
    title: 'Subject-verb agreement',
    level: 'B1',
    explanation: 'The verb must agree in number with its subject — a plural subject needs a plural verb form.',
    examples: ['Il peut travailler.', 'Ils peuvent travailler.'],
    counterexamples: ['Ils peut travailler. (incorrect — plural subject, singular verb)'],
  },
  'adjective-agreement': {
    id: 'adjective-agreement',
    type: 'grammar',
    title: 'Adjective agreement',
    level: 'B1',
    explanation:
      'An adjective must agree in gender and number with the noun it describes — add -e for feminine, -s for plural.',
    examples: ['Un avantage important.', 'Une solution importante.', 'Des solutions importantes.'],
    counterexamples: ['Une solution important. (incorrect — feminine noun, masculine adjective)'],
  },
}

export const COURSE = {
  id: 'french',
  levels: [
    {
      id: 'b1',
      label: 'B1',
      units: [
        {
          id: 'opinions',
          title: 'Expressing Opinions',
          description: 'State an opinion clearly and back it up — the core of TEF Task B.',
          lessons: [
            {
              id: 'opinion-expressions',
              title: 'Opinion Expressions',
              learningItemIds: ['a-mon-avis', 'selon-moi', 'essentiel'],
              exercises: [
                {
                  id: 'oe-1',
                  learningItemId: 'a-mon-avis',
                  type: 'multiple_choice',
                  stage: 'recognition',
                  prompt: 'What does "À mon avis" mean?',
                  content: { options: ['In my opinion', 'On the other hand', 'For example', 'Even so'] },
                  answer: 'In my opinion',
                  explanation: '"À mon avis" introduces a personal opinion — "in my opinion."',
                },
                {
                  id: 'oe-2',
                  learningItemId: 'essentiel',
                  type: 'multiple_choice',
                  stage: 'recognition',
                  prompt: 'What does "essentiel" mean?',
                  content: { options: ['optional', 'difficult', 'essential', 'expensive'] },
                  answer: 'essential',
                  explanation: '"Essentiel" means "essential" — necessary or very important.',
                },
                {
                  id: 'oe-3',
                  learningItemId: 'essentiel',
                  type: 'translation',
                  stage: 'recall',
                  prompt: 'Translate: essential',
                  content: { direction: 'en_to_fr', options: ['essentiel', 'important', 'difficile', 'cher'] },
                  answer: 'essentiel',
                  explanation: '"Essential" translates to "essentiel" (masculine singular).',
                },
                {
                  id: 'oe-4',
                  learningItemId: 'essentiel',
                  type: 'fill_blank',
                  stage: 'context',
                  prompt: 'Complete the sentence',
                  content: {
                    sentence: 'Cette question est ________.',
                    options: ['essentielle', 'essentiel', 'essentiels', 'essentielles'],
                  },
                  answer: 'essentielle',
                  explanation: '"Question" is feminine, so the adjective agrees: "essentielle."',
                },
                {
                  id: 'oe-5',
                  learningItemId: 'selon-moi',
                  type: 'fill_blank',
                  stage: 'context',
                  prompt: 'Complete the sentence',
                  content: {
                    sentence: '________, cette solution est efficace.',
                    options: ['Selon moi', 'En revanche', 'Par exemple', 'De plus'],
                  },
                  answer: 'Selon moi',
                  explanation: '"Selon moi" ("in my opinion") fits naturally at the start of a sentence.',
                },
                {
                  id: 'oe-6',
                  learningItemId: 'a-mon-avis',
                  type: 'production',
                  stage: 'production',
                  prompt: 'Build the sentence: "À mon avis, le télétravail présente plusieurs avantages."',
                  content: {
                    tiles: [
                      'À',
                      'mon',
                      'avis,',
                      'le',
                      'télétravail',
                      'présente',
                      'plusieurs',
                      'avantages.',
                      'Cependant',
                      'inconvénients',
                    ],
                  },
                  answer: 'À mon avis, le télétravail présente plusieurs avantages.',
                  explanation: '"À mon avis" opens the opinion, then subject + verb + object in order.',
                },
              ],
            },
            {
              id: 'giving-reasons',
              title: 'Giving Reasons',
              learningItemIds: ['avantage', 'inconvenient', 'subject-verb-agreement'],
              exercises: [
                {
                  id: 'gr-1',
                  learningItemId: 'subject-verb-agreement',
                  type: 'multiple_choice',
                  stage: 'recognition',
                  prompt: 'Which sentence is correct?',
                  content: {
                    options: ['Les étudiants peut travailler.', 'Les étudiants peuvent travailler.'],
                  },
                  answer: 'Les étudiants peuvent travailler.',
                  explanation: '"Les étudiants" is plural, so "pouvoir" becomes "peuvent."',
                  hints: ['Look at the subject.', '"Les étudiants" is plural — the verb must be plural too.'],
                },
                {
                  id: 'gr-2',
                  learningItemId: 'subject-verb-agreement',
                  type: 'fill_blank',
                  stage: 'completion',
                  prompt: 'Complete the sentence',
                  content: {
                    sentence: 'Les étudiants ______ travailler le week-end.',
                    options: ['peuvent', 'peut', 'pouvons', 'pouvez'],
                  },
                  answer: 'peuvent',
                  explanation: 'Plural subject "les étudiants" requires the plural verb form "peuvent."',
                },
                {
                  id: 'gr-3',
                  learningItemId: 'subject-verb-agreement',
                  type: 'fill_blank',
                  stage: 'transformation',
                  prompt: 'Change to plural: "Il peut travailler." → "Ils ______ travailler."',
                  content: { sentence: 'Ils ______ travailler.', options: ['peuvent', 'peut', 'peux', 'pouvait'] },
                  answer: 'peuvent',
                  explanation: 'Singular "il peut" becomes plural "ils peuvent."',
                },
                {
                  id: 'gr-4',
                  learningItemId: 'avantage',
                  type: 'translation',
                  stage: 'recall',
                  prompt: 'Translate: advantage',
                  content: { direction: 'en_to_fr', options: ['avantage', 'inconvénient', 'solution', 'exemple'] },
                  answer: 'avantage',
                  explanation: '"Advantage" translates to "avantage" (masculine noun).',
                },
                {
                  id: 'gr-5',
                  learningItemId: 'inconvenient',
                  type: 'translation',
                  stage: 'recall',
                  prompt: 'Translate: drawback',
                  content: { direction: 'en_to_fr', options: ['inconvénient', 'avantage', 'bénéfice', 'solution'] },
                  answer: 'inconvénient',
                  explanation: '"Drawback" translates to "inconvénient" (masculine noun).',
                },
                {
                  id: 'gr-6',
                  learningItemId: 'avantage',
                  type: 'production',
                  stage: 'production',
                  prompt: 'Build the sentence: "Ils peuvent travailler le week-end."',
                  content: {
                    tiles: ['Ils', 'peuvent', 'travailler', 'le', 'week-end.', 'peut', 'il'],
                  },
                  answer: 'Ils peuvent travailler le week-end.',
                  explanation: 'Plural subject "Ils" takes the plural verb form "peuvent."',
                },
              ],
            },
            {
              id: 'adding-examples',
              title: 'Adding Examples & Contrast',
              learningItemIds: ['de-plus', 'par-exemple', 'en-revanche', 'benefique', 'solution', 'adjective-agreement'],
              exercises: [
                {
                  id: 'ae-1',
                  learningItemId: 'en-revanche',
                  type: 'multiple_choice',
                  stage: 'recognition',
                  prompt: 'What does "En revanche" express?',
                  content: { options: ['An example', 'A contrast', 'A conclusion', 'A cause'] },
                  answer: 'A contrast',
                  explanation: '"En revanche" means "on the other hand" — it introduces a contrast.',
                },
                {
                  id: 'ae-2',
                  learningItemId: 'adjective-agreement',
                  type: 'multiple_choice',
                  stage: 'recognition',
                  prompt: 'Which sentence is correct?',
                  content: { options: ['Une solution important.', 'Une solution importante.'] },
                  answer: 'Une solution importante.',
                  explanation: '"Solution" is feminine, so the adjective takes the feminine ending: "importante."',
                },
                {
                  id: 'ae-3',
                  learningItemId: 'benefique',
                  type: 'fill_blank',
                  stage: 'context',
                  prompt: 'Complete the sentence',
                  content: {
                    sentence: 'Le télétravail est ________ pour beaucoup de salariés.',
                    options: ['bénéfique', 'inconvénient', 'essentiel', 'difficile'],
                  },
                  answer: 'bénéfique',
                  explanation: '"Bénéfique" ("beneficial") describes "le télétravail" here.',
                },
                {
                  id: 'ae-4',
                  learningItemId: 'par-exemple',
                  type: 'fill_blank',
                  stage: 'context',
                  prompt: 'Complete the sentence',
                  content: {
                    sentence: '________, on peut travailler de chez soi deux jours par semaine.',
                    options: ['Par exemple', 'En revanche', 'De plus', 'Selon moi'],
                  },
                  answer: 'Par exemple',
                  explanation: '"Par exemple" introduces a concrete example.',
                },
                {
                  id: 'ae-5',
                  learningItemId: 'de-plus',
                  type: 'translation',
                  stage: 'recall',
                  prompt: 'Translate: furthermore',
                  content: { direction: 'en_to_fr', options: ['de plus', 'en revanche', 'par exemple', 'à mon avis'] },
                  answer: 'de plus',
                  explanation: '"Furthermore" translates to "de plus."',
                },
                {
                  id: 'ae-6',
                  learningItemId: 'en-revanche',
                  type: 'production',
                  stage: 'production',
                  prompt: 'Build the sentence: "En revanche, il peut être difficile de se concentrer."',
                  content: {
                    tiles: [
                      'En',
                      'revanche,',
                      'il',
                      'peut',
                      'être',
                      'difficile',
                      'de',
                      'se',
                      'concentrer.',
                      'Cependant',
                    ],
                  },
                  answer: 'En revanche, il peut être difficile de se concentrer.',
                  explanation: '"En revanche" opens the contrast, then the rest follows normal word order.',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export function getAllUnits() {
  return [...COURSE.levels[0].units, ...getGeneratedUnits()]
}

export function getAllLessons() {
  return getAllUnits().flatMap((unit) => unit.lessons.map((lesson) => ({ ...lesson, unitId: unit.id })))
}

export function getLesson(lessonId) {
  return getAllLessons().find((lesson) => lesson.id === lessonId) ?? null
}

export function getUnit(unitId) {
  return getAllUnits().find((unit) => unit.id === unitId) ?? null
}

// Reuses each item's already-authored exercises for review rather than generating new content on
// the fly — keeps review sessions free/instant and avoids a second content-authoring surface.
export function getReviewExercises(itemIds) {
  const allExercises = getAllLessons().flatMap((lesson) => lesson.exercises)
  const byItem = new Map()
  for (const exercise of allExercises) {
    if (itemIds.includes(exercise.learningItemId) && !byItem.has(exercise.learningItemId)) {
      byItem.set(exercise.learningItemId, exercise)
    }
  }
  return itemIds.map((id) => byItem.get(id)).filter(Boolean)
}

export function learningItem(id) {
  return LEARNING_ITEMS[id] ?? getGeneratedItem(id) ?? null
}

// Imported at the bottom to avoid a circular-looking top-of-file dependency read — generatedContent.js
// is a leaf module (localStorage only), so this is a plain one-way dependency, not a real cycle.
import { getGeneratedItem, getGeneratedUnits } from '../lib/generatedContent'
