# TEF French Tutor — Product Spec

Status: v0.3 (living document — update this before/alongside implementation, not after)

## 1. Vision

A web app that helps a learner prepare for the TEF (Test d'Évaluation de Français) through a
Duolingo-style learning loop rather than a Grammarly-style correction tool: the learner masters
TEF-relevant vocabulary, phrases, and grammar in **Learn & Practice**, and those mastered
expressions carry over into **the Call** — a live voice conversation with an AI tutor that's
biased toward giving the learner natural chances to use what they've just learned.

Non-negotiables:
- Every exercise is **tap-only** — a word bank of choices or ordered word tiles, never a text
  input. The learner never types French into this app.
- It must feel like *one* tutor across features, not two disconnected apps — mastery earned in
  Learn & Practice visibly shapes what the Call talks about (§3.2.6), and weak categories surfaced
  in the Call inform the Mistake Bank the same way (§3.2.5).
- Every feature maps to something that actually appears on the TEF, not generic "let's chat."

## 2. TEF grounding

The app targets **Expression Orale** (speaking) and **Compréhension Orale** (listening, since the
learner must understand the tutor to respond) via the Call, and builds the vocabulary/phrase/
grammar foundation for both **Expression Orale** and **Expression Écrite** via Learn & Practice's
curriculum (even though Learn & Practice itself never requires typed writing).

**Scoring rubric** (used for the call recap and mock exam report), modeled on the dimensions the
real TEF grades and mapped to CLB/NCLC bands:

| Dimension | What it measures |
|---|---|
| Task achievement | Did they accomplish the task (got the info / defended a position)? |
| Fluency & flow | Hesitation, filler words, pace, ability to keep going without breaking down |
| Grammar range & accuracy | Correct and varied verb tenses/moods, agreement, sentence structure |
| Vocabulary range & precision | Appropriate register, idiomatic phrasing vs. anglicisms |
| Coherence & discourse | Logical connectors, organized argument, appropriate turn-taking |

Each dimension is scored 0–5; the scores map to an approximate CLB level band (shown to the
learner, e.g. "Grammar: 3/5 → roughly CLB 6-7") so progress reads in TEF-relevant terms, not an
arbitrary app score. The real TEF's speaking exam has two spoken tasks (Task A — obtain
information; Task B — express and defend a point of view), which the Call mirrors directly
(§3.1.2).

## 3. Core features

The app has two features: the Call (spoken practice) and Learn & Practice (the structured
curriculum that feeds it). Learn & Practice is the default landing view (§4) — a learner opens the
app to build vocabulary/phrases, not to a blank call screen.

### 3.1 The Call

A live voice call with an AI tutor, strictly scoped to TEF-relevant spoken conversation (free
chat, Task A info-seeking scenarios, Task B opinion/debate scenarios, or full mock exam).

#### 3.1.1 In-call experience
- Full-screen "in a call" UI: tutor name/avatar, call timer, a single mic-forward control (hold or
  tap-to-talk, not a chat input box front-and-center).
- **Live speech-to-text**: the learner's speech is transcribed in real time and shown as it's
  recognized (interim + final results from `SpeechRecognition`), so they can see what the AI heard.
- Tutor responses are *spoken* (TTS) and appear as text after/while speaking, not before.
- Barge-in not required for v1 (learner waits for tutor to finish, like a real phone call turn).
- **In-call guidance**: if the learner goes silent too long, gives a very short/broken answer, or
  the recognizer flags very low confidence, the tutor proactively helps rather than waiting
  awkwardly. (Not yet built — no UI surfaces it yet.)
- **Pronunciation feedback**: using `SpeechRecognition` confidence scores plus a comparison between
  what was said and the expected/likely intended phrase, flag words that were likely
  mispronounced or unintelligible. Flagged words are surfaced in the end-of-call recap.

#### 3.1.2 Modes (what the call is about)
- **Free conversation** — open-ended French chat, any topic, tutor adapts to learner's level.
- **Task A drills** — pick/random-draw a scenario card, tutor plays the interlocutor, learner asks
  questions to resolve it.
- **Task B drills** — pick/random-draw an opinion topic, tutor states a counter-position, learner
  defends theirs.
- **Mock exam** — both tasks back to back, timed like the real exam, in-call guidance and
  corrections suppressed (like the real test); full evaluation report only at the end.

#### 3.1.3 In-call corrections
- During free/drill modes, the tutor can weave in a correction naturally in-conversation for
  significant errors ("on dirait plutôt...") rather than interrupting for every small slip.
- Mock exam mode suppresses in-call correction entirely.
- Each logged correction in the live panel can expand into a **"Why?"** mini-lesson (`WhyExplain`)
  — a one-sentence grammar rule, 2-3 French examples, and a tap-only practice question (`ChoiceBank`
  of options, not typed) the learner can answer on the spot — without interrupting the call itself.

#### 3.1.4 End-of-call results
Every call ends with a results screen:
- **Rubric scores** (§2): task achievement, fluency, grammar, vocabulary, coherence, each 0–5 with
  an approximate CLB-band note.
- **Error recap**: what was said → corrected form → one-line reason, grouped by category (grammar /
  vocabulary / register / pronunciation).
- **"What to work on"**: a short, explicit list of 1-3 focus areas for next time, derived from this
  session plus recurring categories across past sessions (§3.2.5).

#### 3.1.5 Personalization (Mistake Bank)
- The app tracks recurring error *categories* (e.g. "gender agreement," "subjunctive," "passé
  composé vs. imparfait," "pronunciation: nasal vowels," "spelling") across calls per profile, in
  one shared `errorStats` model.
- **Mistake Bank**: the Progress dashboard's recurring-category list (§6) expands to show 2-3 real
  past example corrections drawn straight from the learner's own call history (a read-time scan
  over `sessions`, §5).
- **Practice your mistakes**: from an expanded category, a "Practice this" button generates 3-5
  fresh tap-only exercises for that category (`api/tutor.js` `type: "drill"` — a `ChoiceBank` of
  options per exercise, not free text) and walks the learner through them one at a time with
  immediate right/wrong feedback. Supplementary retrieval practice, not a scored session.

#### 3.1.6 Themed by mastered expressions
The Call is not gated by Learn & Practice progress — a learner can call Camille with zero mastery.
But `storage.js` `getLearnerLearningContext(profileId).masteredExpressions` (phrases at mastery ≥
61, §3.2.4) is sent with every `type: "turn"` request, and the tutor's system prompt is nudged to
find natural, unforced occasions to let the learner use phrases they've already mastered — biasing
the conversation toward reinforcement, never turning it into a quiz.

### 3.2 Learn & Practice (the default view)

A Duolingo-mechanics-inspired, self-paced TEF curriculum. The loop is **Learn → Practice → Recall →
Produce → Review → Master**: every lesson introduces a small number of concepts and then requires
the learner to demonstrate understanding through progressively harder tap-only exercises, and every
mistake becomes something the learner can deliberately drill later.

#### 3.2.1 Hierarchy
`Course → Level → Unit → Lesson → { LearningItems, Exercises }`, mirroring real TEF competencies
(e.g. the seeded B1 unit "Expressing Opinions" — TEF Task B's core skill). A **LearningItem** is
vocabulary, a grammar concept, or a phrase/expression, each with a stable id so progress, mistakes,
review scheduling, and the Call's mastered-expression theming (§3.1.6) all reference the same
object. Lessons are gated linearly (a lesson unlocks once the previous one in its unit is done, and
a unit's first lesson unlocks once the previous unit is fully done); the path screen always shows
one obvious next action ("Continue learning").

The curriculum is not fixed to one hand-authored unit: a learner can grow it on demand via
**"Generate a new unit"** (§3.2.6), so the path can extend to arbitrarily many TEF-relevant topics
without every one being hand-written up front.

#### 3.2.2 Exercise types (v1) — all tap-only, no typing
Four types, evaluated by `src/lib/learningEngine/evaluate.js` (pure functions, never an LLM call
and never a UI component directly):
- **multiple choice**: `content.options`, tap the correct one.
- **fill-in-the-blank** / **translation**: `content.options` (correct answer + 2-3 distractors)
  rendered as a `ChoiceBank` of tappable chips — exact-match against the accepted answer,
  case/whitespace-normalized.
- **production** ("write a sentence"): `content.tiles` (the correct words + a couple of distractor
  words, shuffled) rendered by `TileBuilder` — the learner taps tiles in order to construct the
  target sentence, checked by normalized string comparison against `answer`. No LLM evaluation in
  this path at all.

Deferred to a later pass, not built: sentence-ordering, matching, and listening-prep exercise
types — the engine is designed so adding one doesn't require rewriting the lesson/runner
components.

#### 3.2.3 Lesson flow
Two stages per lesson, run by `LessonScreen`/`ExerciseRunner`:
1. **Learn** — each LearningItem renders as a card (word/phrase/grammar-appropriate template)
   showing its meaning, an example sentence, rendered through `InteractiveText` so the learner can
   click/hover any word or the whole sentence to hear it (TTS) and see an English gloss
   (`type: "translate"`, §5).
2. **Practice** — `ExerciseRunner` steps through the lesson's exercises one at a time, all tap-only
   (§3.2.2). Every incorrect answer gets a **"Try again"** and a **"Continue"** option (never forced
   to move on, but never blocked either) plus an explanation of *why*. A `hints` array on an
   exercise (when authored) reveals progressively, and using a hint counts as a data point for
   mastery (§3.2.4) without penalizing as harshly as an outright miss. A lesson ends with an
   accuracy/mastery summary, not just an XP number.

#### 3.2.4 Mastery & review (the learning engine)
Pure functions in `src/lib/learningEngine/` — no learning logic lives in a React component:
- `mastery.js`: each LearningItem has a per-profile progress record (`timesSeen`, `timesCorrect`,
  `timesIncorrect`, `currentStreak`, `mastery` 0-100, `lastPracticedAt`). A correct answer raises
  mastery by an amount that scales with exercise difficulty (production > completion/transformation
  > recognition/recall), halved if a hint was used; a miss lowers it. Bands: 0-20 New, 21-40
  Learning, 41-60 Familiar, 61-80 Strong, 81-100 Mastered. A phrase-type item at Strong or above
  (mastery ≥ 61) is what the Call's mastered-expression theming reads (§3.1.6).
- `reviewScheduler.js`: a replaceable scheduling function — a correct review advances through a
  fixed interval ladder (1/3/7/14/30 days), a miss resets to the first interval.
- The **review queue**: `storage.js` `getDueReviewItems` — a plain filter/sort over existing
  progress (weakest overdue items first), no separate schedule table. Reviewing an item reuses the
  exercise already authored for it in its home lesson (`getReviewExercises` in
  `src/content/course.js`) rather than generating new content per review.
- **Today's practice**: the Learn screen's daily-practice card surfaces the due-review count and
  the app's practice streak (shared with the Call, §3.1.5) with a one-tap "Start review."

#### 3.2.5 Extension point: `getLearnerLearningContext`
`storage.js` `getLearnerLearningContext(profileId)` returns a read-only shape (strong/weak
vocabulary, weak grammar concepts, recently-practiced expressions, and `masteredExpressions`)
derived from real mastery data. `masteredExpressions` feeds the Call (§3.1.6); the rest is reserved
for a future fuller AI Coach.

#### 3.2.6 AI-generated units (growing the curriculum)
Beyond the hand-authored seed unit in `src/content/course.js`, a learner can tap **"Generate a new
unit"** on the Learn screen to grow the course:
- `api/tutor.js` `type: "generateUnit"`: input `{level, existingTopics, locale}` (existing unit
  titles are passed so the model picks something new), output `{unit, items}` matching
  `course.js`'s existing unit/lesson/learningItem/exercise shapes (including tap-only exercise
  content, §3.2.2). Reuses the shared Gemini JSON-mode helper — no new backend surface.
- `src/lib/learningEngine/importGeneratedUnit.js` (pure, no I/O) namespaces every id in the
  response (`gen_<runId>_<originalId>`) and rewrites internal references, so generated content can
  never collide with static content or a previous generation run.
- `src/lib/generatedContent.js` persists the namespaced result to `localStorage`, **global, not
  per-profile** — generated units are shared curriculum, the same way the static seed unit is;
  only progress (`learningProgress`) is per-profile.
- `src/content/course.js`'s lookup functions (`getAllUnits`, `getAllLessons`, `getLesson`,
  `getUnit`, `getReviewExercises`, `learningItem`) transparently merge generated content with the
  static seed unit, so `LearnScreen`/`LessonScreen`/review all pick it up with no per-caller
  changes. A newly generated unit appears at the end of the path, locked-gated the same way static
  units are (§3.2.1).
- If the LLM proxy is unavailable or over its free-tier quota, "Generate a new unit" shows the same
  `llm_unavailable`/`quota_exceeded` messaging used elsewhere (§7) — the rest of Learn & Practice
  keeps working regardless, since no other part of it calls the LLM.

### 3.3 Considered, not built

Ideas raised and deliberately deferred — recorded so they aren't silently lost, per this repo's
"write down every mentioned feature" rule (`CLAUDE.md`):
- **Conversation-difficulty slider**: gradually raise the Call's expected level (A2 simple
  questions → C1 nuanced discussion) across sessions rather than a flat difficulty.
- **In-call Hint button**: a manual "I'm stuck" control offering a sentence starter, distinct from
  the already-deferred *automatic* stuck-detection (§3.1.1) — this one is learner-initiated.
- **"Try again" retrieval practice mid-call**: after a spoken correction, have the tutor prompt the
  learner to say the corrected sentence back, rather than just moving on.
- **Adaptive scenario/topic selection**: today `errorStats` only *labels* what Camille noticed
  (§3.1.5) — it doesn't yet bias which Task A/B scenario or Call topic gets served up, and
  `masteredExpressions` (§3.1.6) themes the conversation but doesn't pick the topic either.
- **Gating the Call on mastery**: explicitly rejected — the Call stays fully open regardless of how
  much (or how little) is mastered in Learn & Practice (§3.1.6).
- **Full mock-exam countdown timer**: a real per-task time limit UI for mock exam mode (§3.1.2
  currently only shows the ambient call-elapsed clock).
- **Personalized curriculum sequencing**: using `errorStats`/`learningProgress` together to
  auto-order or recommend units/lessons, instead of the current fixed linear list (§3.2.1) — even
  AI-generated units (§3.2.6) are appended, not reordered by weakness.
- **More exercise types**: sentence-ordering, matching, and listening-prep (§3.2.2).
- **Merging the Call's Mistake Bank and Learn & Practice's review queue**: two separate weak-signal
  surfaces today (§3.1.5 vs. §3.2.4) — a unified "everything you should review" view is future work.

## 4. Two-profile model

Exactly two static local profiles (the two learners), no accounts, no passwords:
- No gating picker screen. The app always boots straight into **Learn & Practice** (§3.2) using the
  last-used profile (or the first static profile on a brand-new browser). Clicking the avatar/name
  row in `AppSidebar` switches instantly to the other profile — no confirmation modal, no separate
  picker route. `src/lib/profiles.jsx` holds the static `PROFILES` list and the
  `ProfileProvider`/`useProfile()` context; `src/lib/storage.js` persists which profile id was last
  active.
- All data below is namespaced under the chosen profile's id in local storage, except AI-generated
  curriculum content (§3.2.6), which is shared across profiles. Switching profiles never mixes
  session/progress history.

## 5. Architecture

- **Frontend**: the existing Vite + React scaffold (`src/`). No new state-management library —
  React context for current profile/call state, `localStorage` for persistence.
- **Styling/components**: Tailwind CSS (utility classes) + shadcn/ui (Button, Card, and similar
  primitives, generated into `src/components/ui/` rather than pulled in as an opaque npm package).
  This is the app's one deliberate exception to "no new dependency without a reason." Light/dark
  theming stays token-based (CSS variables), matching shadcn's default approach.
- **Design system**: `wireframe/design-system.png` ("Allô Prof v1.0") is the source of truth for
  all visual design — palette, type scale, buttons, badges, cards, and iconography. Implemented as
  CSS variables in `src/index.css` (papier/encre/terracotta/ambre/sauge palette) and two shared
  typography classes (`.text-h1`, `.text-h2`, `.label-caps`). Any new screen or component must draw
  from this palette/type scale. Fonts: Fraunces (serif, headings/tutor voice/quotes) and Inter
  (sans, interface chrome), both self-hosted via `@fontsource-variable/*` — no external font CDN.
- **Screens implemented from `wireframe/`**: the sidebar-shell layout in `wireframe/reference.png`
  (Call, §3.1.1), `wireframe/historique.png` (end-of-call results, §3.1.4 — `HistoriqueScreen`), and
  `wireframe/objectif.png` (pre-call prep screen biasing the next call toward the learner's weak
  category, §3.1.5 — `ObjectifScreen`). `ProgressScreen` (§6) and `LearnScreen`/`LessonScreen`
  (§3.2) have no wireframe — built directly on the same design system/sidebar shell (`src/index.css`
  tokens, `AppSidebar`) rather than getting a new visual language each.
- **UI language (i18n)**: the app's own chrome — nav labels, headers, buttons, section titles,
  aria-labels — supports English and French, English by default, via a hand-rolled dictionary
  (`src/lib/i18n/en.js` / `fr.js`) and a `LocaleContext` (`src/lib/i18n/LocaleContext.jsx`), no new
  dependency. Persisted to `localStorage`, switchable from a pill toggle in `AppSidebar`. **Hard
  boundary**: this mechanism never touches the tutor's spoken French, the learner's own transcript,
  or the flagged text/corrected form/exercise content of any correction or exercise — that content
  is the subject being taught and always stays French, regardless of UI locale. A correction's
  short *reason* and its "Why?" **rule** explanation (§3.1.3) are the exception — instructional
  metadata, not graded content, and may be localized; the current `locale` is sent with `type:
  "turn"`/`"drill"`/`"generateUnit"` requests so Gemini writes `reason`/`rule` in it. Everything
  else (`examples`, exercise prompts/tiles/options, generated unit content) is always French. The
  two string populations are structurally separate (i18n dictionary keys vs. LLM-proxy-returned
  content) so this can't blur by accident.
- **Navigation**: no router dependency. The app loads directly into Learn & Practice (default
  landing view — see §4). A small, fixed set of top-level screens (Learn / Lesson / Call /
  Historique / Objectif TEF / Progrès, plus the profile picker once built) is switched via React
  state in a top-level context — not URL-based routing.
- **Voice**:
  - STT: Web `SpeechRecognition` API, French locale (`fr-FR` or `fr-CA`), Chrome/Edge only.
  - TTS: Web `speechSynthesis` API, pick the best available French voice.
  - Wrapped behind a single hook (`useVoiceCall`) so the rest of the app never touches the raw
    browser APIs directly, and so unsupported browsers get one clear "use Chrome" message instead
    of scattered failures.
- **LLM**: a free-tier hosted API (Google Gemini free tier). Called through **one small serverless
  function** (`api/tutor.js`) that holds the API key server-side; the client never embeds the key.
  This function is the only "backend" the app has — no server framework, no database.
  - Request types, all sharing one Gemini JSON-mode helper with the same bounding/timeout/
    error-code conventions:
    - `type: "turn"` — the tutor's next conversational turn given the transcript + optional
      `topic`/`mode`/`scenarioId` (fixed ids mapped server-side to French labels/scenario text,
      never raw client text, so none can be used to inject the system prompt) and
      `masteredExpressions` (§3.1.6, capped/truncated before leaving the client). Returns
      `{reply, correction}` — `correction` (when not null) carries `{said, correction, reason,
      category, rule, examples, practice: {prompt, answer, options}}` (§3.1.3's "Why?", `options`
      is what makes the practice tap-only) — `mode` also drives Task A/Task B/mock-exam behavior
      (§3.1.2).
    - `type: "score"` — a finished call transcript → `{scores, focusAreas, strengths,
      vocabSuggestions}` against the rubric (§2), requested once at hangup.
    - `type: "translate"` — a word/sentence in, `{translation}` out, for Learn's click-to-translate
      interaction (§3.2.3), cached client-side per exact string.
    - `type: "drill"` — a weak `category` in, `{exercises: [{prompt, answer, options, hint}]}` out
      (3-5 fresh tap-only exercises for the Mistake Bank's "Practice this," §3.1.5) — `options`
      built server-side from the model's `distractors` + `answer`, shuffled.
    - `type: "generateUnit"` — `{level, existingTopics, locale}` in, `{unit, items}` out (§3.2.6),
      matching `course.js`'s unit/lesson/learningItem/exercise shapes including tap-only exercise
      content; validated server-side before being returned (malformed generations are rejected as
      `llm_unavailable`, never passed through half-broken).
  - Still not built: in-call guidance (rephrase/hint) when the learner is stuck (§3.1.1 —
    deliberately deferred).
  - A Gemini `429` (free-tier quota exhausted) is surfaced as a distinct `quota_exceeded` error code
    (vs. a generic `llm_unavailable`), so the client can show a specific "come back tomorrow"
    message (§7).
- **Word/sentence audio**: `speechSynthesis.speak()` directly on the clicked word or sentence
  string — no pre-recorded audio files, no TTS dependency beyond the browser API already used for
  call replies.
- **Lesson content**: the seed course unit is static data (`src/content/course.js`), written once
  by hand — not fetched from a CMS or database. AI-generated units (§3.2.6) extend this at runtime
  but are still stored client-side (`generatedContent.js`), not in a database — this app has no
  database at all.
- **Learning engine** (§3.2.4): `src/lib/learningEngine/` holds mastery calculation, review
  scheduling, generated-unit id-namespacing, and answer evaluation as plain functions with no React
  and no I/O — the architecture rule "don't put learning logic inside components" is honored by a
  module layer instead of a server layer, since this app has neither a server framework nor a
  database to put a "Learning Service" in. `src/lib/storage.js` is the only layer that touches
  localStorage for per-profile data; `src/lib/generatedContent.js` is the only layer that touches
  localStorage for shared curriculum data. `ExerciseRunner`/`LessonScreen`/`LearnScreen` only render
  state and collect tap input.
- **Tests**: `bun test` (Bun's built-in runner, no new dependency) covers the learning engine's pure
  functions (`src/lib/learningEngine/*.test.js`) — mastery updates, review-interval scheduling,
  tile-based production evaluation, and generated-unit id-namespacing. UI/e2e tests for the rest of
  the app are not set up.
- **Data model** (per profile, in `localStorage['tef:v1']`, see `src/lib/storage.js`):
  ```
  profile: { id, name, initials, examDate }   // static, src/lib/profiles.jsx
  sessions: [{
    mode ("free" | "immigration" | "daily" | "professional" | "taskA" | "taskB" | "mock"),
    scenarioId,                    // set when mode is taskA/taskB/mock, src/content/scenarios.js id
    startedAt, durationSec, transcript: [{ speaker, text, ts }],
    corrections: [{ said, correction, reason, category, rule, examples, practice: {prompt, answer, options} }],
    scores: { taskAchievement, fluency, grammar, vocabulary, coherence },
    focusAreas: [category],        // "what to work on" list, §3.1.4
    strengths: [string],           // end-of-call recap, §3.1.4
    vocabSuggestions: [string],    // end-of-call recap, §3.1.4
  }]
  errorStats: { [category]: count }   // §3.1.5
  lessonProgress: { [lessonId]: "not_started" | "in_progress" | "done" }   // §3.2.1
  learningProgress: {              // §3.2.4, one record per LearningItem id
    [learningItemId]: {
      timesSeen, timesCorrect, timesIncorrect, currentStreak,
      mastery,                    // 0-100
      lastPracticedAt, reviewStage, nextReviewAt,
    }
  }
  ```
  AI-generated curriculum content lives in a separate, non-namespaced `localStorage` key
  (`src/lib/generatedContent.js`) — shared across both profiles, since it's course content, not
  personal data: `{ units: [...], items: { [id]: LearningItem } }`.

## 6. Non-goals (v1)

- No server-side accounts or authentication system.
- No payments/subscriptions.
- No native mobile app — responsive web only.
- No offline or self-hosted model support (no local Whisper/Ollama, no client-side NLP/grammar
  parser) — relies on the browser's built-in speech APIs and a hosted free-tier LLM.
- No support for browsers without the Web Speech API (Firefox/Safari) beyond a clear warning for
  the Call feature — Learn & Practice works in any modern browser.
- No true phoneme-level pronunciation scoring — pronunciation feedback is a best-effort heuristic
  from recognizer confidence, not a certified pronunciation-assessment product.
- No free-text writing surface anywhere in the app — every exercise and every practice interaction
  is tap-only (§3.2.2); a learner who wants open-ended writing practice is out of scope for v1.

## 7. Usage limits

The app runs entirely on free tiers (LLM API free quota, browser-native speech). There is no
billing/upgrade path in v1 — when the daily/monthly free-tier limit on the LLM proxy is hit, the
Call and "Generate a new unit" simply show a clear "come back tomorrow" message. Every exercise in
Learn & Practice (multiple-choice, fill-in-the-blank, translation, production) keeps working
regardless, since none of them call the LLM (§3.2.2) — only the Call, word/sentence translation,
and generating a brand-new unit need it, so a learner can always keep progressing through whatever
units already exist even if the daily quota is exhausted.
