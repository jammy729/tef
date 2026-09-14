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
- Full-screen "in a call" UI: tutor name/avatar, call timer, a single mic-forward control — a mute
  toggle, not a chat input box front-and-center.
- **Mic is always on for the whole call**, like an actual phone line — the learner never has to
  tap a button before every turn. The mic control mutes/unmutes the learner's own input; it does
  not gate the call into a rigid tutor-speaks-then-learner-speaks lockstep (`useVoiceCall`'s
  `SpeechRecognition` instance runs continuously for the call's duration and auto-restarts if the
  browser stops it after silence). While the tutor is speaking, recognized speech is discarded
  rather than appended to the transcript, since it's the tutor's own TTS audio looping back
  through the mic, not the learner.
- **Live speech-to-text, live-caption style, not a growing chat log**: the learner's speech is
  transcribed in real time and shown as it's recognized (interim + final results from
  `SpeechRecognition`), so they can see what the AI heard — but only the *current* line is ever
  on screen, replaced turn by turn, so a call feels like a normal conversation rather than reading
  a transcript as it accumulates. The full turn-by-turn transcript still exists internally
  (`useVoiceCall`'s `transcript` state) — it's what themes the tutor's next reply, what the
  end-of-call rubric score is computed from, and what's saved to the learner's Historique record
  (§3.1.4) — only the live on-screen *display* during the call itself is limited to the current
  turn.
- Tutor responses are *spoken* (TTS) and appear as text after/while speaking, not before, alongside
  an auto-fetched English/French translation of the tutor's line shown just below it (via the
  `type: "translate"` proxy request also used by Learn & Practice's `InteractiveText`, §3.3.2), so
  the learner can follow along without breaking the flow of the call.
- The call opens with a short spoken French greeting themed to the mode (free / Task A / Task B /
  mock), so the learner is never dropped into dead silence — the tutor initiates, like a real
  phone call.
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
`Course → Level → Unit → Lesson → { LearningItems, Exercises }`, mirroring real TEF competencies.
The course covers **every official TEF theme** — the "Expressing Opinions" foundation unit (TEF
Task B's core skill) plus hand-authored units for the fourteen themes it exists in (Le travail,
L'environnement, Les nouvelles technologies, La santé, L'éducation, La famille, La société, Les
médias, La culture, L'économie, Les transports, La consommation, Le sport, La politique), each
taught at B1. Each unit is built from the same argumentation toolkit as the foundation unit
(opinion phrases, reasons, examples, contrast), so the path doubles as Task B practice. A
**LearningItem** is vocabulary, a grammar concept, or a phrase/expression, each with a stable id
so progress, mistakes, review scheduling, and the Call's mastered-expression theming (§3.1.6) all
reference the same object. Lessons are gated linearly (a lesson unlocks once the previous one in
its unit is done, and a unit's first lesson unlocks once the previous unit is fully done); the
path screen always shows one obvious next action ("Continue learning"). A `vocabulary` item whose
`partOfSpeech` is a verb or adjective can carry the full grammatical-variant table alongside it —
`conjugation: {je, tu, ilElle, nous, vous, ilsElles}` (present tense by default, `word` holds the
infinitive) for a verb, `agreement: {masculineSingular, feminineSingular, masculinePlural,
femininePlural}` for an adjective — each form tap-to-hear, rendered by `LessonScreen`'s
`LearningItemCard`. Both fields are optional and absent for everything else (nouns, invariant
phrases like "Selon moi" have nothing to conjugate/agree). These tables are authored across **all**
content: `generateUnitSystemPrompt` (`api/tutor.js`) authors them for AI-generated verbs/
adjectives, and the 15 hand-authored unit files carry them too (every verb/verb-phrase/expression
item with a genuine person paradigm, every qualifying adjective — nouns and invariant phrases
correctly none). A phrase fixed in a non-present tense sets `conjugation.tense` (e.g. _on devrait_,
_je voudrais_ → `conditional`), and a cell where elision or a clitic/reflexive pronoun would make a
bare form misleading is authored as the full phrase including its subject ("J'ai mal à", "Je
m'occupe de") — `LessonScreen`'s `FormsGrid` detects the full-phrase style and renders/speaks it
as-is instead of doubling the pronoun label ("je J'ai mal à"). `src/content/course.test.js`
validates every table's shape and that only verb/adjective-type items carry them.

The curriculum is not fixed to the hand-authored themes: a learner can grow it on demand via
**"Generate a new unit"** (§3.2.6), so the path can extend to arbitrarily many TEF-relevant topics
without every one being covered by hand-authored content.

#### 3.2.2 Exercise types (v1) — tap or speak, never typed text
Four types, evaluated by `src/lib/learningEngine/evaluate.js` (pure functions, never an LLM call
and never a UI component directly):
- **multiple choice**: `content.options`, tap the correct one.
- **fill-in-the-blank** / **translation**: `content.options` (correct answer + 2-3 distractors)
  rendered as a `ChoiceBank` of tappable chips — exact-match against the accepted answer,
  case/whitespace-normalized.
- **pronunciation** ("say the sentence aloud"): `content.sentence` (the target French sentence)
  rendered by `SpeakingPrompt` — the learner taps a mic button and reads it aloud (Web
  `SpeechRecognition`, `fr-FR`, one attempt per tap, tap again to stop early). `evaluatePronunciation`
  checks the recognized transcript against `answer`: an exact normalized match passes immediately,
  otherwise a ≥ 70% word-overlap ratio passes — a text-similarity heuristic, not true
  phoneme-level pronunciation scoring (§6 still holds; this is the closest honest proxy a
  browser-only app can offer without an acoustic confidence signal, which `SpeechRecognition`
  doesn't reliably expose either). No LLM evaluation in this path at all. Replaced the earlier
  tile-based "production" ("build the sentence," `TileBuilder`) exercise type — the user found
  sentence-building tiles unhelpful; every hand-authored exercise across all 15 units was migrated,
  and AI-generated content (`generateUnit`/`itemDrill`) produces `pronunciation` exercises now too.

Deferred to a later pass, not built: sentence-ordering, matching, and listening-prep exercise
types — the engine is designed so adding one doesn't require rewriting the lesson/runner
components.

#### 3.2.3 Lesson flow
Two stages per lesson, run by `LessonScreen`/`ExerciseRunner`:
1. **Learn** — a sequential, one-item-at-a-time study session (not a wall of cards): the learner
   steps through each LearningItem in order with Prev/Next controls and a "Studying item X of Y"
   progress header, and the item's term is spoken aloud automatically the moment it appears
   (`src/lib/audio.js` TTS, the same voice the Call and `ExerciseRunner` use; ref-guarded so dev
   StrictMode double-mounts never speak it twice) — comprehension should start by ear. Each card
   renders with a word/phrase/grammar-appropriate template showing its meaning and an example
   sentence, rendered through `InteractiveText` so the learner can click/hover any word or the whole
   sentence to hear it (TTS) and see an English gloss (`type: "translate"`, §5), plus the item's
   full `conjugation`/`agreement` table (§3.2.1) laid out tap-to-hear so every form is *understood*
   before any exercise. A **"Practice more"** button (`ItemPractice.jsx`) lets the learner
   generate 8 fresh exercises for just that one item on demand — `api/tutor.js` `type: "itemDrill"`
   sends the item's term/meaning/level (plus its `conjugation`/`agreement` table when present, so
   the generated exercises spread across different forms — "vous coupez," not always "couper" —
   instead of only ever testing the base form) and gets back exercises in the same
   `{id, learningItemId, type, stage, prompt, content, answer, explanation}` shape `generateUnit`
   uses (the server assigns `id`/`learningItemId` itself rather than trusting the model, since
   there's exactly one real item per request). Unlike the Mistake Bank's ephemeral, unrecorded
   `MistakeDrill` (§3.1.5), these run through the same `ExerciseRunner` as lesson practice, so
   attempts count toward that item's mastery like any other practice.
2. **Practice** — when the lesson teaches verbal/adjectival forms it opens by merging a
   forms-covering batch: `LessonScreen` fires `type: "itemDrill"` for every item carrying a
   `conjugation`/`agreement` table (bounded to ~4 items so one lesson never makes more than a
   handful of proxy calls, §7) and appends the fresh form-spread exercises after the authored set,
   behind a brief "preparing practice" state — practice genuinely covers the whole range the Learn
   session just showed (je/tu/il-elle/nous/vous/ils-elles, all four agreement cells), not just the
   base form. If the proxy is unavailable or quota'd it falls back to the authored exercises alone —
   the learn/practice loop never depends on the LLM (§7). Then `ExerciseRunner` steps through the
   lesson's exercises one at a time, in a fresh shuffled order every session (Fisher-Yates,
   re-randomized on each mount — the same lesson, review queue, or placement quiz never walks
   exercises in a fixed authored order), tap-or-speak 
   (§3.2.2). Every incorrect answer gets a **"Try again"** and a **"Continue"** option (never forced
   to move on, but never blocked either) plus an explanation of *why*. A `hints` array on an
   exercise (when authored) reveals progressively, and using a hint counts as a data point for
   mastery (§3.2.4) without penalizing as harshly as an outright miss. A lesson ends with an
   accuracy/mastery summary, not just an XP number. Every exercise speaks its question aloud the
   moment it loads and plays a distinct synthesized chime on submit — correct or incorrect
   (`src/lib/audio.js`: `speak`/`speakFrench`, plain browser `speechSynthesis`; `playCorrectSound`/
   `playIncorrectSound`, Web Audio oscillators, no audio asset to source/host).
   `ExerciseRunner` is shared by lesson practice, the review queue, and the onboarding placement
   quiz (§4), so all three get this for free. A `multiple_choice` exercise built on a vocabulary/
   phrase `LearningItem` — where the French term is the stimulus and the options are English
   meanings — shows and speaks just that French term (`frenchTermFor()`, tap-to-hear-again, French
   voice) instead of a "What does X mean?" instructional sentence, matching how `InteractiveText`
   already presents French content elsewhere. Exercise types where the French form *is* the
   answer (translation) or that already display their French content directly (fill_blank's
   `content.sentence`, pronunciation's own sentence display in `SpeakingPrompt`) keep the plain
   instructional prompt — showing the term there would hand over the answer.

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
Beyond the hand-authored theme units in `src/content/units/`, a learner can tap **"Generate a new
unit"** on the Learn screen to grow the course:
- `api/tutor.js` `type: "generateUnit"`: input `{level, existingTopics, locale}` (existing unit
  titles are passed so the model picks something new), output `{unit, items}` matching
  `course.js`'s existing unit/lesson/learningItem/exercise shapes (including tap-only-or-spoken
  exercise content, §3.2.2). Each lesson gets 10-16 exercises (not 4-6) covering an item's
  different grammatical forms when it has a `conjugation`/`agreement` table, so practice is
  substantially deeper than one exercise per item. Reuses the shared JSON-mode helper — no new
  backend surface.
- `src/lib/learningEngine/importGeneratedUnit.js` (pure, no I/O) namespaces every id in the
  response (`gen_<runId>_<originalId>`) and rewrites internal references, so generated content can
  never collide with static content or a previous generation run.
- `src/lib/generatedContent.js` persists the namespaced result to `localStorage`, **global, not
  per-profile** — generated units are shared curriculum, the same way the static theme units are;
  only progress (`learningProgress`) is per-profile.
- `src/content/course.js`'s lookup functions (`getAllUnits`, `getAllLessons`, `getLesson`,
  `getUnit`, `getReviewExercises`, `learningItem`) transparently merge generated content with the
  static theme units, so `LearnScreen`/`LessonScreen`/review all pick it up with no per-caller
  changes. A newly generated unit appears at the end of the path, locked-gated the same way static
  units are (§3.2.1).
- If the LLM proxy is unavailable or over its free-tier quota, "Generate a new unit" shows the same
  `llm_unavailable`/`quota_exceeded` messaging used elsewhere (§7) — the rest of Learn & Practice
  keeps working regardless. Every other LLM touch-point in it ("Practice more" on a single item, the
  practice-stage forms-covering merge, the lesson Q&A below) fails over individually with its own
  message or a no-LLM fallback — no part of the core loop bricks when the proxy is down.

#### 3.2.7 Ask your AI tutor (lesson Q&A)
At the bottom of every lesson stage — **Learn, Practice, and the completion summary** — sits
**"Ask your AI tutor"** (`LessonAsk.jsx`) — a free-form text question run through the learner's
chosen provider via the same `/api/tutor` proxy (`type: "ask"`, §5), answered in-place by a short
teacher-style reply. It exists for exactly the comprehension questions that come up at any point in
a lesson ("What's the difference between _"à mon avis"_ and _"selon moi"_?"), answered without
leaving the lesson.
- Input `{question, lessonTitle, itemTerm, locale}` (the lesson/item are our own course content,
  provided so answers are contextualized), output `{answer}`. The `answer` is generated in the
  learner's current UI `locale` — it's instructional metadata like a correction's `reason`/`rule`
  (§3.1.3), not French course content — and rendered raw, never through `t()`.
- The text field is the **single deliberate `<textarea>` in the app**: user-initiated free-form Q&A
  is not an exercise, so the tap-or-speak-only rule (§3.2.2) applies to exercises and their answer
  evaluation, not to typing a question here. The question is capped client-side (300 characters),
  re-bounded server-side, and travels only in the request's `user` role — never concatenated into
  the system prompt (the same injection boundary as the call transcript, §5).
- Answers are ephemeral (kept only for the lesson session, not persisted), each ask is a stateless
  one-shot, and when the proxy is down or quota'd the panel shows the same
  `llm_unavailable`/`quota_exceeded` messaging as everywhere else (§7) — exercises keep working
  regardless.

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

## 4. Accounts (Supabase Auth)

Real accounts replace the earlier two-static-profile/local-only model — email + password sign-up
and sign-in via Supabase Auth, one `profiles` row per user (§5 has the schema):
- **No gating picker screen, but a real sign-in gate.** `App.jsx`'s `Router` renders
  `OnboardingScreen` at `/registration` whenever there's no session, or a session exists but the
  account hasn't finished local setup (`profile.onboarded` false). Once both are true, the app
  boots straight into **Learn & Practice** (§3.2) as before. `src/lib/profiles.jsx`'s
  `ProfileProvider` tracks the Supabase session (`supabase.auth.getSession()` +
  `onAuthStateChange`) and exposes `profile` (derived from the session + the hydrated per-user
  blob), `ready` (true once the initial session check and data hydration are both done —
  `Router` shows a blank loading frame until then, the one place true async loading exists),
  `signUp`/`signIn`/`signOut`, and the unchanged `completeOnboarding`/`saveProfile`.
- **Onboarding is now two real stages.** `OnboardingScreen`: an **auth** step (email + password,
  toggle between sign-in/sign-up; the sign-up form also collects the display name directly — "What
  should we call you?" alongside email/password — so a new account skips straight to the level
  step below; a sign-up that requires email confirmation shows a "check your email" message
  instead of erroring) followed, once signed in and not yet onboarded, by the **local setup**
  step — a self-assessed starting CEFR level (A1–C2, cosmetic/informational only; the curriculum is
  still a single fixed B1 track per §5, this doesn't gate or branch content), with the same
  optional placement quiz (`getPlacementExercises()` in `src/content/course.js`, run through
  `ExerciseRunner`, no new exercise type, no LLM call) pre-filling the level chip. A **name** step
  still exists as a fallback — reached only when signing in on an account that was created but
  never finished setup (name not yet saved), pre-filled from the account email. Finishing writes
  `{ name, startingLevel, onboarded: true }` via `saveProfile`/`completeOnboarding` into the
  Supabase-backed blob (§5), and `AppSidebar`'s footer displays that saved name. A returning user
  who signs back in skips straight past both stages.
- **Sidebar profile footer**: `AppSidebar`'s bottom-left corner shows the active profile (avatar
  initials, display name — display-only; there's no seeded exam date for real accounts, so
  `ObjectifScreen`'s exam badge is now conditionally rendered like `CallInsights` already did) with
  a **Log out** icon button that calls the real `signOut()` — an actual sign-out now, not a local
  reset.
- All data below is namespaced under the signed-in user's id, both in the Supabase `profiles` row
  and the client-side cache mirroring it (§5), except AI-generated curriculum content (§3.2.6),
  which is shared across all accounts.

## 5. Architecture

- **Frontend**: the existing Vite + React scaffold (`src/`). No new state-management library —
  React context for current profile/call state.
- **Accounts + progress persistence: Supabase.** One table, `public.profiles` (`id uuid` = the
  Supabase Auth user id, `data jsonb` holding exactly the shape `src/lib/storage.js` used to keep
  in `localStorage` — `sessions`, `errorStats`, `lessonProgress`, `learningProgress`, `meta`),
  RLS-protected with `auth.uid() = id` as the sole ownership rule (`select`/`insert`/`update`
  policies, `TO authenticated`, `WITH CHECK` on update — see `supabase/migrations/`). Every screen
  reads `storage.js` **synchronously** (no loading states scattered through the app), so the data
  layer keeps that shape rather than becoming async everywhere: `storage.js` holds an in-memory
  cache, hydrated once from Supabase right after sign-in (`hydrateFromSupabase`, awaited by
  `ProfileProvider` before it flips `ready`), and every write updates the cache instantly (the UI
  never waits on the network) then pushes the whole blob to Supabase in the background via a
  debounced (~800ms) upsert — `// ponytail:` marked in `storage.js`: no offline queue/retry, no
  cross-tab conflict resolution, fine at this app's scale, worth revisiting if usage grows.
  `src/lib/supabase/client.js` (`@supabase/ssr`'s `createBrowserClient`, reading
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`) is instantiated once as a shared singleton
  and imported by both `storage.js` and `profiles.jsx` — never call `createClient()` a second
  time. Unlike the LLM proxy's server-only keys, these **are** meant to reach the client bundle
  (`VITE_` prefix required for that) — the publishable key is safe to ship client-side by design,
  RLS is the actual security boundary. `SUPABASE_DATABASE_PASSWORD` is CLI/migration-only, never
  read by app code. Out of scope for this migration: `src/lib/settings.js` (bring-your-own LLM
  provider keys) and `src/lib/generatedContent.js` (shared AI-generated curriculum) — neither is
  "user or progress" data, both stay `localStorage`-only.
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
  dependency. Persisted to `localStorage`, switchable from a pill toggle in the **Settings
  screen**'s Language card (`SettingsScreen`) — not `AppSidebar`, which no longer carries any
  settings controls. **Hard
  boundary**: this mechanism never touches the tutor's spoken French, the learner's own transcript,
  or the flagged text/corrected form/exercise content of any correction or exercise — that content
  is the subject being taught and always stays French, regardless of UI locale. A correction's
  short *reason* and its "Why?" **rule** explanation (§3.1.3) are the exception — instructional
  metadata, not graded content, and may be localized; the current `locale` is sent with `type:
  "turn"`/`"drill"`/`"generateUnit"` requests so the provider model writes `reason`/`rule` in it. Everything
  else (`examples`, exercise prompts/tiles/options, generated unit content) is always French. The
  two string populations are structurally separate (i18n dictionary keys vs. LLM-proxy-returned
  content) so this can't blur by accident.
- **Navigation**: no router dependency, but real URL paths via the native History API
  (`src/lib/router.js` `pathToView`/`viewToPath`, wired into `App.jsx`'s `Router`) — one path per
  top-level screen (`/learn`, `/lesson/:id`, `/call`, `/historique`, `/objectif`, `/progress`,
  `/settings`, plus `/registration` for onboarding), so each screen is directly linkable/
  bookmarkable and back/forward work via `popstate`. Screen switching is still React state
  (`view`/`lessonId` in `App.jsx`), kept in sync with `window.location` by `pushState`/
  `replaceState` on every `onNavigate()` call — no route-matching library, no nested routes, no
  data-loader convention. The app loads directly into Learn & Practice (default landing view — see
  §4) when the path doesn't match a known screen.
- **Voice**:
  - STT: Web `SpeechRecognition` API, French locale (`fr-FR` or `fr-CA`), Chrome/Edge only.
  - TTS: Web `speechSynthesis` API, pick the best available French voice.
  - Wrapped behind a single hook (`useVoiceCall`) so the rest of the app never touches the raw
    browser APIs directly, and so unsupported browsers get one clear "use Chrome" message instead
    of scattered failures. `useVoiceCall.greet()` opens every call with a local, canned,
    mode-aware French greeting (free/Task A/Task B/mock — Task A/B name the actual scenario) —
    spoken immediately rather than waiting on an LLM round trip, so the learner is never dropped
    into dead silence; guarded against firing twice under React 18 StrictMode's double-invoked
    mount effects.
  - `src/lib/audio.js` centralizes the browser-native speech/sound-effect helpers used outside the
    call (`speakFrench` for known-French content — `InteractiveText`'s click-to-hear, `useVoiceCall`
    itself delegates to it, and `ExerciseRunner`'s French-term exercises; `speak` for exercise
    prompts that stay plain instructional text, no language forced; `playCorrectSound`/
    `playIncorrectSound`, two distinct synthesized Web Audio chimes) — one place instead of three
    separate `SpeechSynthesisUtterance` implementations.
  - **Speaker settings** (Settings screen's **Speaker** tab, `src/lib/settings.js` `voice: {rate,
    gender}`, device-local like the LLM provider config): a speed slider (0.5×-1.5×) and a female/
    male voice preference, both read by `speak`/`speakFrench` on every call (explicit `rate`/
    `gender` args let the Settings screen preview unsaved changes before hitting Save). Gender is
    a name-based heuristic (`\b`-boundary matched against a curated list covering common Edge/
    Windows, macOS, and Chrome/Google French voice names) over whatever French voices the
    browser/OS actually ships — the Web Speech API exposes no real `.gender` field.
    `pickFrenchVoice()` (`src/lib/audio.js`) never lets that heuristic silently collapse both
    settings onto the same voice: when a name match exists for the requested gender, it's used
    (preferring a non-local/cloud voice among ties, since those are usually more natural); when
    neither gender has a recognized name on a given platform, it falls back to a stable split of
    the available French voices by name order (first vs. last) rather than the same single
    default voice for both — so the toggle always audibly changes something, even on platforms
    with no recognizable voice names. `getVoices()` returning empty on the very first call after
    page load (a well-known async-loading quirk, mainly on Chrome) is also handled —
    `waitForVoices()` awaits the `voiceschanged` event (1s timeout fallback) before the first
    utterance ever speaks, so the very first thing said doesn't fall back to an unrelated default
    voice. The voice is re-resolved fresh per spoken segment rather than cached once per call,
    working around a Chrome bug where a `SpeechSynthesisVoice` reference can silently stop being
    honored if it isn't from the latest `getVoices()` call — otherwise audible as "the voice
    changes partway through a longer greeting."
  - **Deliberate speech pacing, not flat monotone TTS**: because `SpeechSynthesisUtterance` takes
    plain text with no SSML/break-tag support, `speakSegments()` (`src/lib/audio.js`) splits
    spoken text on punctuation (`,;:.!?`) and speaks each segment as its own utterance with a
    pause in between — longer after a sentence boundary (`.`/`!`/`?`) than after a comma — so
    French speech reads with real cadence. `stopSpeaking()` cancels an in-flight chain (mute,
    barge-in) via a generation counter, since `speechSynthesis.cancel()` alone only stops the
    *current* chained utterance, not ones still scheduled.
- **LLM**: a choose-your-provider setup fronted by **one small serverless function** (`api/tutor.js`)
  — the only "backend" the app has (no server framework, no database). **Groq is the default
  provider** (free tier, fast); Anthropic/Claude, OpenAI, Google Gemini, and any OpenAI-compatible
  custom endpoint (base URL + model) are selectable from the **Settings screen** (a standard sidebar
  screen alongside Learn/Call/Progress, reachable from `AppSidebar`). The Settings screen is
  organized as four tabs (`src/components/ui/tabs.jsx`, a thin Radix `Tabs`-primitive wrapper
  following the same shadcn-generated-not-installed pattern as `ui/button.jsx`/`ui/card.jsx` — no
  new dependency, `radix-ui` was already installed): **Profile** (edit display name/starting
  level — the same `LEVELS` chip picker `OnboardingScreen` uses, saved via
  `useProfile().saveProfile()`), **Language** (the EN/FR chrome toggle, moved here from the
  sidebar footer), **Speaker** (speed/voice-gender, above),
  and **AI provider** (below). Structured so
  a future settings section is just one more tab. The proxy owns each
  provider's URL/model (`PROVIDERS`/`PROVIDER_MODELS` in `api/tutor.js`) — the client never sends
  more than a provider id in the request payload. In dev and preview the handler is served **inside
  the Vite process itself** (`tutorApiPlugin` in `vite.config.js` mounts `/api/tutor` — it parses
  the JSON body and shims Node's `res` with the Express-style `status()`/`json()` the handler uses),
  so no separate server process is needed; a deployment that hosts the handler natively just runs
  the same plain `(req, res)` export. Keys work on a two-track model:
  - **App/development key**: lives in `.env` per provider (`GROQ_API_KEY`, `GEMINI_API_KEY`,
    `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`), read server-side, never bundled into the client.
  - **Bring-your-own-key**: a learner can type their own key into the Settings screen; it's stored
    in that browser's `localStorage` (`src/lib/settings.js`) and sent with each `/api/tutor`
    request (`src/lib/llm.js` `tutorRequest` is the single fetch wrapper) so the proxy can route
    it to the chosen provider. This is the deliberate, learner-chosen exception to "keys stay
    server-side" — the value is their own secret, never committed or logged.
  - Every request to the proxy (all eight types below) goes through `callLLM`, which shapes the
    JSON-mode payload per provider — Groq goes through the official **`openai` SDK**
    (`client.responses.create` against `https://api.groq.com/openai/v1`, reading
    `response.output_text`; a client is built per call with the resolved key), Gemini via
    `generateContent`, Anthropic via `/v1/messages`, and the OpenAI-compatible `chat/completions`
    shape shared by the openai/custom providers:
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
    - `type: "itemDrill"` — `{learningItemId, term, meaning, level, locale, variants}` in (`variants`
      is the item's `conjugation`/`agreement` table when it has one, bounded server-side), 8
      exercises out (`{exercises: [...]}`) spread across the word's different grammatical forms
      when `variants` was sent, in the richer `generateUnit` shape
      (`id`/`learningItemId`/`type`/`stage`/`prompt`/`content`/`answer`/`explanation`), so
      they run through `ExerciseRunner` like any other practice, not `drill`'s bespoke
      `{prompt, answer, options, hint}` mini-stepper. `id`/`learningItemId` are assigned
      server-side, never trusted from the model.
    - `type: "ask"` — `{question, lessonTitle, itemTerm, locale}` in, `{answer}` out (§3.2.7), the
      lesson's "Ask your AI tutor" free-form Q&A. `question` is the learner's own text — capped
      client-side and re-bounded server-side, passed only in the `user` role alongside bounded
      lesson/item context, never spliced into the system prompt. The `answer` is written in the
      learner's UI `locale` (instructional, like `reason`/`rule`) and rendered raw.
    - `type: "generateUnit"` — `{level, existingTopics, locale}` in, `{unit, items}` out (§3.2.6),
      matching `course.js`'s unit/lesson/learningItem/exercise shapes including tap-only exercise
      content; validated server-side before being returned (malformed generations are rejected as
      `llm_unavailable`, never passed through half-broken).
    - `type: "test"` — the Settings screen's "Test connection" button: a zero-content JSON ping
      (`{"status":"ok"}`) through the learner's chosen provider + key (or `.env` fallback), so the
      provider/key/config match is confirmed with a concrete good/bad/quota signal *before* relying
      on it, instead of discovering it on a real call.
  - Every proxy call the client makes is counted on-device for the Progress dashboard's AI usage
    card (`src/lib/usage.js`, `tef:usage:v1` in `localStorage` — global, like the settings store):
    total / today / by-request-type counts, plus the last "Test connection" result (recorded by the
    Settings screen). Call counts only, by design — the proxy returns no token counts, so
    tokens/cost are deliberately out of scope (§7).
  - Still not built: in-call guidance (rephrase/hint) when the learner is stuck (§3.1.1 —
    deliberately deferred).
  - A provider `429` (quota/rate limit hit) is surfaced as a distinct `quota_exceeded` error code
    (vs. a generic `llm_unavailable`), so the client can show a specific "come back tomorrow"
    message (§7) regardless of which provider is selected.
- **Word/sentence audio**: `speechSynthesis.speak()` directly on the clicked word or sentence
  string — no pre-recorded audio files, no TTS dependency beyond the browser API already used for
  call replies.
- **Lesson content**: the course's fifteen hand-authored units (Expressing Opinions + the fourteen
  official TEF themes, §3.2.1) are static data — one module per unit under `src/content/units/`,
  assembled into the course by `src/content/course.js` — written once by hand, not fetched from a
  CMS or database. AI-generated units (§3.2.6) extend this at runtime but are still stored
  client-side (`generatedContent.js`), not in a database — this app has no database at all.
- **Learning engine** (§3.2.4): `src/lib/learningEngine/` holds mastery calculation, review
  scheduling, generated-unit id-namespacing, and answer evaluation as plain functions with no React
  and no I/O — the architecture rule "don't put learning logic inside components" is honored by a
  module layer instead of a server layer, since this app has neither a server framework nor a
  database to put a "Learning Service" in. `src/lib/storage.js` is the only layer that touches
  localStorage for per-profile data; `src/lib/generatedContent.js` is the only layer that touches
  localStorage for shared curriculum data; `src/lib/usage.js` is the only layer that touches
  localStorage for device/app-level LLM activity (§7). `ExerciseRunner`/`LessonScreen`/`LearnScreen` only render
  state and collect tap input.
- **Tests**: `bun test` (Bun's built-in runner, no new dependency) covers the learning engine's pure
  functions (`src/lib/learningEngine/*.test.js`) — mastery updates, review-interval scheduling,
  pronunciation-transcript evaluation, and generated-unit id-namespacing. UI/e2e tests for the rest of
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

- No auth beyond plain Supabase email+password (§4) — no OAuth/social login, no MFA, no password
  reset UI beyond Supabase's own hosted flow.
- No payments/subscriptions.
- No native mobile app — responsive web only.
- No offline or self-hosted model support (no local Whisper/Ollama, no client-side NLP/grammar
  parser) — relies on the browser's built-in speech APIs and a hosted free-tier LLM.
- No support for browsers without the Web Speech API (Firefox/Safari) beyond a clear warning for
  the Call feature — Learn & Practice works in any modern browser.
- No true phoneme-level pronunciation scoring — the Learn & Practice `pronunciation` exercise type
  (§3.2.2) and the Call's post-call "pronunciation" rubric category are both best-effort heuristics
  (recognized-transcript word-overlap for the former, LLM judgment from the transcript for the
  latter), not a certified pronunciation-assessment product; `SpeechRecognition` doesn't reliably
  expose acoustic confidence for either to lean on instead.
- No free-text writing surface anywhere in the app — every exercise and practice interaction is
  answered by tapping or speaking a sentence aloud (§3.2.2), never typed; a learner who wants
  open-ended writing practice is out of scope for v1.

## 7. Usage limits

The app runs entirely on free tiers (LLM API free quota, browser-native speech). There is no
billing/upgrade path in v1 — when the daily/monthly free-tier limit on the LLM proxy is hit, the
Call and "Generate a new unit" simply show a clear "come back tomorrow" message. Every exercise in
Learn & Practice (multiple-choice, fill-in-the-blank, translation, pronunciation) keeps working
regardless, since none of them call the LLM (§3.2.2) — only the Call, word/sentence translation,
and generating a brand-new unit need it, so a learner can always keep progressing through whatever
units already exist even if the daily quota is exhausted.

The **Progress dashboard's AI usage card** keeps the learner aware of that usage without counting
calls by hand: per-request counts (total, today, and broken down by request type — call reply,
call results, translation, lesson Q&A, drills, generated units, connection tests) are tracked
client-side in `localStorage` (`src/lib/usage.js`, `tef:usage:v1`, global like settings), alongside
an **AI provider card** showing which provider is active, whether a bring-your-own key is
configured, and the result of the last "Test connection" run (§5). A compact **AI provider status
widget sits permanently in `AppSidebar`** above the target-level card, so the active provider,
its connection-status dot (green connected / red key rejected / amber quota / gray not-tested), and
today's request count stay in view on every screen — clicking it opens Settings. Call counts only,
deliberately — the proxy doesn't return token counts, so tokens/cost are out of scope. This is
awareness tooling, not a billing meter: the free-tier outcome above (a clear "come back tomorrow"
message) is unchanged.
