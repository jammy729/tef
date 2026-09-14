# Roadmap

Phased implementation checklist for [PRODUCT_SPEC.md](./PRODUCT_SPEC.md). Work top to bottom; check
items off as they land. If a task turns out to need something the spec doesn't cover, update the
spec first, then the roadmap.

> Note: spec v0.2 repositioned the Writing Assistant as the primary feature (§3.1) and demoted the
> Call to a secondary practice mode (§3.2, was §3.1) — the Roadmap moved from §3.2 to §3.3. Phases
> 0–0.7 below predate that change and are labeled with the section numbers valid *at the time they
> were built*; their content is unaffected, only the spec anchors moved.
>
> Spec v0.3 then **removed the Writing Assistant entirely** (Phase 0.8 and the writing-specific
> parts of Phase 7 below are dead code as of Phase 8) in favor of a Learn-first product: master
> expressions in Learn & Practice, then use them in the Call. Every exercise (including the old
> free-form "production" type) became tap-only, and the curriculum can now grow via an
> AI-generated-unit action. See Phase 8. Section numbers in phases before Phase 8 are left as they
> were when written and may no longer resolve in the current spec (§3.1 is now the Call, §3.2 is
> now Learn & Practice — there is no §3.3 or §3.4 any more).

## Phase 0 — Call MVP
Goal: prove the core loop of the Call feature works before anything else is built on top of it.
- [x] `useVoiceCall` hook: mic capture → `SpeechRecognition` (fr-FR), interim + final live transcript
- [x] `speechSynthesis` playback of tutor replies with a French voice
- [x] Serverless LLM proxy endpoint (single function, holds API key) — free-chat conversational turn only
- [x] Minimal "in a call" screen: mic button, live transcript, call timer
- [x] Unsupported-browser fallback message (no SpeechRecognition/synthesis)
- [x] Mode-aware spoken French greeting opens the call (free / Task A / Task B / mock) — no dead-silence start
- [x] Mic-permission-denied / speech-recognition errors surface a clear specific message on the call (no silent failure)
- Spec refs: §3.2.1, §5

## Phase 0.5 — Home dashboard (navigation shell)
Goal: give the learner a choice between the two features instead of dropping straight into a call.
- [x] `HomeScreen` component: two equally-weighted options — "Start a call" and "Continue learning" (spec §4.1)
- [x] Minimal `RoadmapScreen` placeholder (real content lands in Phase 4) so "Continue learning" goes somewhere
- [x] Top-level view state (profile picker stubbed out until Phase 1 → dashboard → Call/Roadmap) via React context, no router (spec §5)
- [x] Way back to the dashboard from inside Call/Roadmap (not mid-call)
- Status context (last session result, roadmap progress, weak categories) deferred to Phase 1/4 — no data to show yet
- Spec refs: §4.1, §5

## Phase 0.6 — Tailwind + shadcn/ui migration
Goal: move off hand-rolled CSS onto Tailwind + shadcn/ui (spec §5) before more screens get built on
top of the old styling, and redesign the dashboard properly on the new system.
- [x] Install/configure Tailwind CSS (Vite plugin) and shadcn/ui (`components.json`, `src/lib/utils.js`)
- [x] Generate the shadcn primitives the app actually uses now (Button, Card) — add more only when a screen needs them
- [x] Re-theme `src/index.css` tokens (light/dark) as Tailwind/shadcn CSS variables, drop `src/App.css`
- [x] Adopt `wireframe/design-system.png` as the token/type-scale source of truth (Fraunces + Inter,
      papier/encre/terracotta/ambre/sauge palette, pill buttons, `.text-h1`/`.text-h2`/`.label-caps`)
- [x] Rebuild `CallScreen` on the new components (sidebar shell, insights panel) per
      `wireframe/reference.png`, keep existing behavior/accessibility (aria-label, aria-live,
      keyboard reachability) intact
- [x] Build `HistoriqueScreen` (end-of-call results, §3.2.4) per `wireframe/historique.png`
- [x] Build `ObjectifScreen` (pre-call prep, §3.2.5) per `wireframe/objectif.png`
- [x] `RoadmapScreen` is reachable from `AppSidebar` (added once Phase 4/5 built it out for real);
      `HomeScreen` was deleted (dead code — every feature is directly reachable from the sidebar
      and there's no gating picker screen, §4, so nothing referenced it any more)
- Spec refs: §3.2.1, §3.2.4, §3.2.5, §4.1, §5

## Phase 0.7 — App UI internationalization (EN default / FR)
Goal: the app's own chrome text is translatable, English by default, so it's legible while building.
- [x] `src/lib/i18n/en.js` / `fr.js`: flat dictionaries covering every chrome string in the 5 built
      components — nav, headers, buttons, section labels, aria-labels
- [x] `LocaleContext` (`src/lib/i18n/LocaleContext.jsx`): `{locale, setLocale, t}`, persisted to
      `localStorage`, default `'en'`
- [x] EN/FR toggle — now in the Settings screen's Language card (moved from `AppSidebar`, see
      Phase 1's sidebar-cleanup line)
- [x] Hard boundary enforced: the tutor's French speech, the learner's transcript, and
      corrections/vocabulary from the LLM proxy are never run through `t()` — they're always
      rendered as the raw French the API/recognizer returned
- Spec refs: §5 (UI language)

## Phase 0.8 — Writing Assistant MVP — REMOVED in Phase 8
Goal (at the time): ship the Grammarly-style writing correction editor that spec v0.2 made the
app's flagship feature and default landing view. **The entire feature was deleted in Phase 8** —
`WritingScreen.jsx`, its storage (`writingSessions`), its i18n keys, and its LLM request types
(`check`, `levelUp`, `evaluate`) are all gone. Left below for history only; none of these checkmarks
reflect current code.
- [x] `api/tutor.js` `type: "check"`: bounded French text in, `{issues: [{start, end, said,
      correction, reason, category}], scores, strengths}` out, reusing the existing shared
      Gemini-call/JSON-mode helper (same bounding/timeout/error-code conventions as `turn`/`score`);
      offsets are computed server-side via substring search rather than trusting the model's own
      character math (`locateIssues` in `api/tutor.js`)
- [x] `WritingScreen` component on the existing `AppSidebar` shell: plain `<textarea>` editor,
      debounced (~1.5s after typing stops) call to `type: "check"`
- [x] Annotated read-only view: swap the textarea for a rendering of the same string with issue
      spans wrapped in highlighted inline `<button>` elements (keyboard/screen-reader reachable),
      colored by category — no contentEditable/rich-text library
- [x] Click/tap a highlighted span → popover with flagged text, correction, and a one-line reason;
      "Apply" applies the correction to the editor text
- [x] "Check my writing" session-summary action: full-document rubric scores (task achievement,
      grammar, vocabulary, coherence, spelling) + strengths list
- [x] Persist each finished writing session to `writingSessions` (`src/lib/storage.js`
      `addWritingSession`, sharing `bumpErrorStats` with `addSession`)
- [x] `WritingScreen` is the app's default landing view (`App.jsx`); Call is a normal sidebar entry
- [x] "Writing" nav entry in `AppSidebar` (first item, ahead of Appeler)
- Spec refs: §3.1, §5, §6 (non-goals: no style/tone rewriting beyond grammar/spelling/vocabulary)

## Phase 1 — Profiles + persistence

Superseded by real accounts below — the two-static-profile/local-only model (static `PROFILES`
array, sidebar profile-switcher, `resetOnboarding()`-as-fake-logout) has been fully replaced, not
just supplemented. Kept for history:
- [x] ~~Two static profiles, sidebar profile-switcher~~ — removed (see Phase 1.5)
- [x] Settings screen reorganized as three tabs — Profile (edit name/starting level,
      `saveProfile()`), Language (the EN/FR toggle), AI provider — via a new
      `src/components/ui/tabs.jsx` (Radix `Tabs` wrapper, no new dependency) —
      `src/components/SettingsScreen.jsx`
- [x] Save each completed call's transcript + corrections + scores to that profile's `sessions`
      (`src/lib/storage.js` `addSession`, spec §5 data model)
- [x] `HistoriqueScreen` reads the active profile's most recent session (basic session history —
      always "latest", no session-by-id browsing/list view yet)
- [x] Optional placement quiz in onboarding (spec §4): `getPlacementExercises()`
      (`src/content/course.js`) samples existing A2/B1-tagged exercises, run through
      `ExerciseRunner`; score maps to a pre-filled (editable) level chip via a threshold heuristic

## Phase 1.5 — Supabase accounts + progress (spec §4/§5)

- [x] `supabase/migrations/20260914063036_create_profiles_table.sql`: one `public.profiles` table
      (`id uuid` = auth user id, `data jsonb`), RLS enabled, `auth.uid() = id` policies for
      select/insert/update (`TO authenticated`, `WITH CHECK` on update) — applied to the live
      project and verified (table + policies confirmed via `psql`, a real sign-up/onboarding/
      sign-out/sign-in round trip confirmed the row is written and read back correctly)
- [x] `src/lib/supabase/client.js`: shared `supabase` singleton (`@supabase/ssr`'s
      `createBrowserClient`); `server.js` (an SSR cookie-client template that doesn't fit this
      SPA + proxy architecture) removed
- [x] `src/lib/storage.js`: `readBlob`/`writeBlob` now back an in-memory cache instead of
      `localStorage` directly — `hydrateFromSupabase(userId)` populates it after sign-in, every
      write pushes a debounced (~800ms) background upsert; every other exported function's
      signature/body is unchanged, so none of the 9 components calling into `storage.js` needed
      to change. `getLastProfileId`/`setLastProfileId` removed (no longer meaningful)
- [x] `src/lib/profiles.jsx`: static `PROFILES` array removed; `ProfileProvider` now tracks a real
      Supabase session (`getSession` + `onAuthStateChange`), exposes `session`/`ready`/
      `signUp`/`signIn`/`signOut` alongside the unchanged `profile`/`completeOnboarding`/
      `saveProfile` shape; `resetOnboarding` removed (superseded by real `signOut`)
- [x] `OnboardingScreen`: a real email+password sign-in/sign-up step (toggle, handles the
      email-confirmation-required case); sign-up also collects the display name directly, so a new
      account skips the separate name step and goes straight to level/quiz setup — the name step
      remains as a fallback for an account that signed up but never finished setup
- [x] `App.jsx`'s `Router` gates on `!session || !profile.onboarded` (was just `!profile.onboarded`)
      and shows a blank loading frame while `ready` is false
- [x] `AppSidebar`'s logout button now calls real `signOut()`; `ObjectifScreen`'s exam-date badge
      guarded like `CallInsights` already did (no seeded exam date for real accounts)
- [ ] Data migration of pre-Supabase local dev/test data — explicitly not attempted (no real
      account to attribute it to)
- [x] Real per-screen URL paths (`/learn`, `/lesson/:id`, `/call`, `/historique`, `/objectif`,
      `/progress`, `/settings`, `/registration`) via the native History API
      (`src/lib/router.js`, no router dependency) — back/forward and bookmarking work
- Spec refs: §4, §5

## Phase 2 — In-call corrections and results
- [x] `api/tutor.js` `type: "turn"` returns structured `{reply, correction}` (JSON mode) so a
      significant error is both woven into the spoken reply and logged for the live panel (§3.2.3)
- [x] `api/tutor.js` `type: "score"` — transcript → rubric scores + focusAreas + strengths +
      vocabSuggestions
- [x] End-of-call results screen (`HistoriqueScreen`): rubric scores (mapped to CECR band via
      `src/lib/rubric.js`), error recap, strengths, suggested vocabulary, "what to work on" (§3.2.4)
- [x] Store `corrections`, `scores`, `focusAreas`, `strengths`, `vocabSuggestions` on the session
      record; update `errorStats` on every `addSession` call
- [x] `ObjectifScreen`/`CallInsights` derive "point à travailler"/"Camille se souvient"/goal % from
      real `errorStats`/`sessions` (`src/lib/rubric.js` `goalPercent`, `categoryInfo`)
- [ ] Stuck-detection in `useVoiceCall` (silence timeout / very short reply / low recognizer
      confidence) → request a guidance turn from the LLM (rephrase, sentence starter, hint) (§3.2.1)
      — deliberately deferred, no current UI surfaces it
- Spec refs: §2 (rubric), §3.2.1, §3.2.3, §3.2.4, §3.2.5, §5

## Phase 3 — Call modes (Task A / Task B / Mock exam)
- [x] Light topic wiring: `ObjectifScreen`'s 4 static topic cards (immigration / daily /
      professional / free) pass a `topic` id into `CallScreen` → `useVoiceCall` → `api/tutor.js`,
      which themes the system prompt server-side via a fixed id→label map (`TOPIC_LABELS`)
- [x] Scenario library: Task A prompts (`src/content/scenarios.js` `TASK_A_SCENARIOS`,
      info-seeking situations) — imported by both `ObjectifScreen` (display) and `api/tutor.js`
      (prompting), so scenario content never drifts between client and server
- [x] Scenario library: Task B prompts (`TASK_B_SCENARIOS`, opinion statements)
- [x] Mode picker on `ObjectifScreen` (Free / Task A / Task B / Mock exam) feeding `api/tutor.js`
      `type: "turn"`'s `mode`/`scenarioId` fields, which theme the system prompt server-side
      (`modeLines` in `api/tutor.js`) — Task A has Camille play the interlocutor, Task B has her
      take the counter-position, mock combines both with corrections/hints instructed off
- [ ] Personalization: bias scenario pick toward top weak `errorStats` categories (§3.2.5) — today
      the learner still picks the mode/topic manually and scenarios draw randomly (with a
      "try a different scenario" redraw); only the *label* of "what Camille noticed" is derived
      from real data, not the draw itself
- [x] Mock exam mode: single call config (`mode: 'mock'`) walks Task A then Task B in one
      conversation via prompt instruction, with corrections/guidance told to stay off — no
      dedicated countdown timer UI (the existing call-elapsed clock is the only timing shown);
      revisit if a real per-task time limit is needed
- Spec refs: §2, §3.2.2, §3.2.5

## Phase 4 — Learn & Practice: replaced by Phase 7 below
The original Phase 4/5 plan (a static "Roadmap" of read-aloud passages) shipped, then was replaced
from scratch by the Duolingo-mechanics Learn & Practice system (Phase 7) per a later product
direction change — `src/content/roadmap.js` and `RoadmapScreen` were deleted, not kept alongside
the new system. `InteractiveText` (word/sentence click-to-hear/translate) survived and is now used
inside a Learn lesson's "Learn" stage (spec §3.3.3) instead of standalone Roadmap passages.
- Spec refs: §3.3 (see Phase 7)

## Phase 7 — Learn & Practice (Duolingo-mechanics curriculum, core-loop MVP)
Goal: a real learning system — structured path, exercises with feedback/retry, mastery tracking,
and a review queue — not a quiz-screen clone. Scoped to a first slice per the user's own priority:
core loop end-to-end for one unit, 4 exercise types, mastery + review scheduling, real seed content.
Kept the "no backend database" architecture decision intact — the "Learning Service"/"Learning
Engine" layering the original proposal called for is a plain client-side module layer
(`src/lib/learningEngine/`) over `localStorage`, not a server + database.
- [x] Hierarchy: `Course → Level → Unit → Lesson → {LearningItems, Exercises}`
      (`src/content/course.js`), stable ids throughout for progress/review/future-AI-Coach
      reference (spec §3.3.1)
- [x] Seed content: B1 "Expressing Opinions" unit, 3 lessons (Opinion Expressions / Giving Reasons
      / Adding Examples & Contrast), 5 vocabulary items, 5 phrases, 2 grammar concepts, 18
      exercises total — not a single fake lesson
- [x] 4 exercise types — multiple choice, fill-in-the-blank, translation, pronunciation
      (`ExerciseRunner` renders by `exercise.type`, no per-lesson hardcoding) — word-selection,
      sentence-ordering, matching, and listening-prep deferred (spec §3.4)
- [x] Answer evaluation as a pure/engine concern, not in the UI: `src/lib/learningEngine/evaluate.js`
      (exact/lenient-normalized matching for MC/fill-blank/translation) + `api/tutor.js`
      `type: "evaluate"` for free-form production answers (the "backend evaluation abstraction"
      the original proposal asked for, realized as this app's existing stateless LLM proxy rather
      than a new service, since there's no server framework to host one)
- [x] "Build the sentence" (tile-based `production` exercise, `TileBuilder`) replaced by a speaking
      exercise (`type: "pronunciation"`, `SpeakingPrompt.jsx`): the learner reads the target
      sentence aloud via `SpeechRecognition` (fr-FR, tap mic to start, tap again to stop early);
      `evaluatePronunciation()` passes on an exact normalized match or ≥ 70% word-overlap against
      the target — a text-similarity heuristic, not true phoneme scoring (spec §6). All 31
      hand-authored exercises across the 15 unit files migrated (one-off script, verified by
      `bun test` + diff spot-checks); `api/tutor.js`'s `EXERCISE_TYPES`/`EXERCISE_SHAPE_NOTE`/
      `itemDrillSystemPrompt`/`generateUnitSystemPrompt` updated so AI-generated content produces
      `pronunciation` exercises too; `TileBuilder.jsx`/`evaluateProduction()` deleted
- [x] Conjugation/agreement depth for real grammar (spec §3.2.1): `vocabulary` items gain optional
      `conjugation` (verb person forms, je/tu/il-elle/nous/vous/ils-elles) and `agreement`
      (adjective gender/number forms) fields, rendered as tap-to-hear tables by
      `LessonScreen`'s `LearningItemCard`/`FormsGrid`. Authored by `generateUnitSystemPrompt` for
      new content **and** backfilled across all 15 hand-authored unit files (28 variant tables in
      total): every verb / verb-phrase / expression item with a genuine person paradigm carries
      `conjugation`, every qualifying adjective carries `agreement`, nouns and invariant phrases
      correctly none. Non-present-tense phrases set `conjugation.tense` (_on devrait_, _je
      voudrais_ → `conditional`); cells where elision or a clitic/reflexive pronoun would make a
      bare form misleading are authored as full phrases including the subject ("J'ai mal à", "Je
      m'occupe de") and `FormsGrid` renders/speaks them as-is instead of doubling the pronoun
      label. `course.test.js` validates table shape (all six person cells, all four agreement
      cells, `tense` ∈ present/conditional) and that only verb/adjective items carry them
- [x] Lesson flow: **Learn is a sequential study session** (not a wall of cards) — the learner
      steps through each LearningItem one at a time with Prev/Next + a "Studying item X of Y"
      progress header, the item's term auto-spoken aloud on entry (ref-guarded against dev
      double-mounts), and its full conjugation/agreement table laid out tap-to-hear so the forms
      are *understood* before any exercise → Practice stage (`ExerciseRunner`) → completion
      summary (accuracy + items practiced, not XP)
- [x] Practice **covers all cases** (spec §3.2.3): on entering Practice, `LessonScreen` fires
      `type: "itemDrill"` for each conjugation/agreement-bearing item in the lesson (bounded to 4
      items so one lesson never makes more than a handful of proxy calls) and merges the fresh
      form-spread exercises after the authored ones, behind a "preparing practice" loading state —
      practice runs the whole je/tu/il-elle/nous/vous/ils-elles / agreement-plural range; falls
      back to authored-only when the proxy is quota'd/unavailable
- [x] "Ask your AI tutor" on lessons (spec §3.2.7): `LessonAsk.jsx` renders at the bottom of every
      lesson stage — Learn, Practice, and the completion summary — a free-form text question (the
      one deliberate `<textarea>` in the app, since it's comprehension Q&A, not an exercise)
      answered by the learner's chosen provider via new `type: "ask"` proxy request
      `{question, lessonTitle, itemTerm, locale}` → `{answer}` in the UI locale. Question capped
      client-side (300 chars) and re-bounded server-side in the `user` role only; answers rendered
      raw (generated teaching content, not chrome); errors via `llmErrorKey`; ephemeral per-session
      history
- [x] "Practice more" per learning item (`ItemPractice.jsx`, on every Learn-stage card): new
      `type: "itemDrill"` request generates 8 fresh exercises (was 5) for just that word/
      expression/grammar point, in the `generateUnit` exercise shape so they run through
      `ExerciseRunner` (and count toward mastery) rather than a bespoke mini-stepper. When the item
      has a `conjugation`/`agreement` table, that's sent along too (`variants`) so the generated
      exercises spread across different forms instead of always testing the base form
- [x] `ExerciseRunner` shuffles its exercises (Fisher-Yates) once per mount — lesson practice,
      review, and the placement quiz all run in a fresh random order every session instead of the
      fixed authored order
- [x] `generateUnitSystemPrompt` bumped from 4-6 to 10-16 exercises per lesson, with guidance to
      cover an item's different grammatical forms across those exercises when it has
      `conjugation`/`agreement` — `generateUnit`'s `maxTokens` raised 8192→16384 to match
- [x] Feedback that teaches: every correct/incorrect answer shows *why*, not just right/wrong;
      "Try again" + "Continue" both always available on a miss; a `hints` array (when authored)
      reveals progressively — demonstrated on one exercise, not every exercise
- [x] `ExerciseRunner` speaks each question aloud on load and plays a distinct synthesized chime on
      submit, correct or incorrect (`src/lib/audio.js` `speak`/`speakFrench`/`playCorrectSound`/
      `playIncorrectSound`) — covers lesson practice, review, and the onboarding placement quiz
      (§4) for free, since all three share this one component
- [x] `frenchTermFor()` (`ExerciseRunner.jsx`): a `multiple_choice` exercise on a vocabulary/phrase
      item shows+speaks just the French term (tap to hear again) instead of a "What does X mean?"
      sentence; exercise types where the French form is the answer, or that already show their
      French content directly, are left alone so nothing leaks the answer
- [x] Settings screen gained a **Speaker** tab (`src/lib/settings.js` `voice: {rate, gender}`):
      a speed slider and a female/male voice preference (name-based heuristic over available
      browser voices), with a live Preview button — read by `speak`/`speakFrench` everywhere
- [x] Fixed: the Male/Female toggle silently no-op'ing to the same voice on platforms where the
      name heuristic matched neither gender — `pickFrenchVoice()` now falls back to a stable
      first/last split of available French voices instead of both genders converging on the same
      "prefer non-local voice" pick; also fixed `getVoices()` returning empty on the very first
      call after page load (`waitForVoices()`) and a Chrome bug where a stale `SpeechSynthesisVoice`
      reference gets silently ignored partway through a longer utterance (voice now re-resolved
      fresh per spoken segment, not cached once per call)
- [x] `speakSegments()` (`src/lib/audio.js`): splits spoken text on punctuation and inserts a
      pause between segments (longer after `.`/`!`/`?` than after `,`) so speech has real cadence
      instead of reading fast/flat — the Web Speech API has no SSML/break-tag support, so this is
      the only way to get deliberate pauses. `stopSpeaking()` cancels an in-flight chain via a
      generation counter, since `speechSynthesis.cancel()` alone doesn't stop already-scheduled
      chained segments; `useVoiceCall`'s mute now calls this instead of `cancel()` directly
- [x] Mastery engine (`src/lib/learningEngine/mastery.js`): per-item 0-100 mastery from real
      attempt history (New/Learning/Familiar/Strong/Mastered bands), not "lesson complete = 100%"
- [x] Review scheduler (`src/lib/learningEngine/reviewScheduler.js`): replaceable function, fixed
      1/3/7/14/30-day interval ladder, reset to first interval on a miss
- [x] Review queue + daily practice: `storage.js` `getDueReviewItems` (weakest overdue first,
      reuses each item's already-authored exercise rather than generating new review content) +
      a "Today's practice" card on `LearnScreen` combining the due count with the app's existing
      practice streak (shared with Call/Writing — one streak concept, not per-feature)
- [x] Mastery visible in the product: `ProgressScreen` gained a "Vocabulary & grammar mastery"
      section (not in the original core-loop scope, added after noticing mastery data had nowhere
      to surface — see Definition-of-Done item "see updated mastery")
- [x] Locked/unlocked lesson gating + "Continue learning" shortcut on `LearnScreen`
- [x] `getLearnerLearningContext(profileId)` extension point for a future AI Coach (spec §3.3.5) —
      implemented, not consumed anywhere yet
- [x] Tests: `bun test` (built-in runner, no new dependency) covering `mastery.js`,
      `reviewScheduler.js`, `evaluate.js` — first attempt wrong then right, repeated misses, a hint
      halving mastery gain, mastery clamping at 0/100, interval-ladder advancement/reset, overdue
      vs. future review items (`src/lib/learningEngine/*.test.js`)
- [ ] `/learn`, `/learn/:lessonId` etc. as literal URL routes — this app has no router (spec §5), so
      these are view-state navigation (`onNavigate('lesson', lessonId)`) like every other screen,
      not URL routes; add a router only if deep-linking becomes a real need
- [ ] UI/e2e tests (frontend exercise rendering, retry flow, lesson completion) — only the learning
      engine's pure functions are unit-tested so far
- [ ] Everything in spec §3.4 not already listed there as covered by this phase (adaptive
      recommendations, more exercise types, personalized curriculum sequencing, etc.)
- Spec refs: §3.3 (all subsections), §5, §6

## Phase 6 — Progress dashboard + usage-limit handling
- [x] Per-profile dashboard (`ProgressScreen`): combined call+writing session counts, streak,
      rubric-dimension trend (reuses `EvolutionChart`, no new chart library), top error categories,
      recent session list
- [x] Graceful "free tier exhausted" state on the LLM proxy: `callGemini` in `api/tutor.js` returns
      a distinct `quota_exceeded` error code for a Gemini 429, surfaced via `src/lib/errors.js`
      `llmErrorKey` as a specific message (vs. a generic connectivity failure) with a "Go to the
      Roadmap" CTA in both `CallScreen` and `WritingScreen` (§7)
- Spec refs: §3.1.4, §3.2.5, §7

## Phase 7 — Grammarly-inspired learning loop (top-5 MVP slice) — partially REMOVED in Phase 8
Goal: turn corrections into mini-lessons and give the learner a way to actively drill their own
recurring mistakes, per the user's Grammarly-critique proposal — top 5 of their own priority list.
The Mistake Bank/drill/"Why?" items below survived Phase 8 (now tap-only, `WhyExplain`'s practice
uses `ChoiceBank` instead of a typed answer); vocabulary-repetition coaching and "Level up my
writing" were `WritingScreen`-only and were deleted along with it.
- [x] Richer "Why?" explanation: `type: "turn"`'s `correction` and `type: "check"`'s `issues` gain
      `rule`/`examples`/`practice` (§3.1.2); `WhyExplain` component (expand/collapse + inline
      practice check) reused on `CallInsights`' live corrections and `WritingScreen`'s issue popover
- [x] Locale-aware meta-text: `type: "turn"`/`"check"`/`"drill"` now send `locale`, and their system
      prompts write `reason`/`rule` in it while `examples`/practice/rewrites stay French (§5)
- [x] Mistake Bank: `ProgressScreen`'s recurring-category rows expand to show real past examples via
      `storage.js` `getMistakeExamples` (a read-time scan, no new persisted structure) (§3.1.4)
- [x] Practice your mistakes: new `type: "drill"` request + `MistakeDrill` component, mounted from
      the Mistake Bank's "Practice this" — ephemeral, not persisted as a session (§3.1.4)
- [x] Vocabulary-repetition coaching: `type: "check"` also returns `vocabRepetition` (computed in
      the same call); `WritingScreen` renders a "Vocabulary" section after a check (§3.1.5)
- [x] Level up my writing: new `type: "levelUp"` request + a "Level up my writing" section on
      `WritingScreen` showing A2/B1/B2/C1 rewrites of the current draft (§3.1.6)
- [ ] The remaining 13 ideas from the same proposal (spaced review, difficulty slider, in-call Hint
      button, TEF Expression Toolkit, adaptive scenario selection, etc.) — recorded in spec
      §3.4 ("Considered, not built"), not started
- Spec refs: §3.1.2, §3.1.4, §3.1.5, §3.1.6, §3.2.3, §3.4, §5

## Phase 8 — Remove Writing Assistant; Learn-first, tap-only, AI-generated units
Goal: drop the Writing Assistant, make Learn & Practice the default landing view, remove all typed
input from every exercise, and grow the curriculum via the LLM instead of only hand-authoring it —
per spec v0.3.
- [x] Deleted `WritingScreen.jsx`, its `writingSessions` storage, its i18n keys, and its exclusive
      LLM request types (`check`, `levelUp`, `evaluate`) — `WhyExplain` survived (still used by
      `CallInsights`); `App.jsx`'s default view is now `learn` (spec §3.2, §4)
- [x] `ProgressScreen`/`ObjectifScreen`/`AppSidebar` collapsed onto a single `getSessions` call-only
      source (no more writing/call merge)
- [x] Tap-only exercises: `fill_blank`/`translation` gained a `content.options` array rendered by a
      new `ChoiceBank` chip component; `production` became `{content.tiles, answer}` rendered by a
      new `TileBuilder` component, evaluated by a synchronous local `evaluateProduction` (string
      normalize + compare) — the old LLM-backed async evaluation is gone entirely (spec §3.2.2)
- [x] `ExerciseRunner` has no async/error states any more — every exercise type evaluates
      synchronously, client-side
- [x] `MistakeDrill` and `WhyExplain`'s inline practice both moved from a typed `<input>` to
      `ChoiceBank`; `api/tutor.js`'s `drill` and correction/`practice` schemas gained an `options`
      array to support this
- [x] AI-generated units: `api/tutor.js` `type: "generateUnit"`, `src/lib/generatedContent.js`
      (global localStorage store), `src/lib/learningEngine/importGeneratedUnit.js` (id namespacing +
      reference rewriting, unit-tested), and `course.js`'s lookup functions (`getAllUnits`,
      `getAllLessons`, `getLesson`, `getUnit`, `getReviewExercises`, `learningItem`) now merge
      generated content transparently (spec §3.2.6)
- [x] `LearnScreen` gained a "Generate a new unit" action (loading state + `llmErrorKey` fallback)
      and renders every unit (static + generated) as its own path section, with lesson-locking now
      chaining across units, not just within one
- [x] Call themed by mastered expressions: `getLearnerLearningContext` gained `masteredExpressions`
      (phrases at mastery ≥ 61); `CallScreen`/`useVoiceCall` thread it into `type: "turn"` requests;
      `api/tutor.js`'s `turnSystemPrompt` nudges the tutor to use them naturally, without gating the
      call on mastery (spec §3.1.6)
- [x] `bun run lint`/`bun run build` clean, `bun test src/lib/learningEngine` passing (added tests
      for `evaluateProduction` and `importGeneratedUnit`)
- Spec refs: §3.1.6, §3.2 (all subsections), §5, §6, §7

## Phase 9 — Full TEF theme coverage (hand-authored curriculum)
Goal: cover the whole official exam, not just the one foundation unit — "Expressing Opinions" plus a
hand-authored unit for each of the fourteen official TEF themes, all built from the same
argumentation toolkit and all exercising the same 4 tap-only types. Content moves out of
`course.js` into one module per unit (`src/content/units/*.js`), structurally identical to
AI-generated units so both merge transparently (spec §3.2.6); `course.js` becomes a thin assembler.
- [x] Move the Opinions seed unit into its own module `src/content/units/opinions.js` (unchanged
      content, same `{ unit, items }` export shape as generated units)
- [x] Author the 14 official-TEF-theme units in `src/content/units/`: Le travail,
      L'environnement, Les nouvelles technologies, La santé, L'éducation, La famille, La société,
      Les médias, La culture, L'économie, Les transports, La consommation, Le sport, La politique —
      each 3 lessons (Vocabulaire / Construire des idées / Argumenter) with ~12-15 learning items
      and 18 tap-only exercises, at least one authored `hints` array (spec §3.2.1, §3.2.2)
- [x] `src/content/course.js` slimmed to an assembler: imports all unit modules, builds
      `COURSE`/`LEARNING_ITEMS` (Opinions first, then the 14 themes), keeps `getAllUnits`,
      `getAllLessons`, `getLesson`, `getUnit`, `getReviewExercises`, `learningItem` exports stable
      and still merging generated content transparently (spec §3.2.6)
- [x] Shape/referential-integrity tests: `src/content/course.test.js` (bun build-in runner) — unit
      count/order, unique unit/item ids, every `learningItemId` on lessons *and* exercises
      resoluble, every exercise tap-only (`options` or `tiles`), non-empty ids/explanations
- [x] `bun run lint`/`bun run build`/`bun test` clean
- Spec refs: §3.2.1, §3.2.2, §3.2.6, §5

## Phase 10 — Choose-your-LLM-provider + Settings screen
Goal: stop hard-coding the proxy to one Gemini free-tier key — make the AI provider user-selectable
with Groq as the default, let the learner bring their own API key (Claude/OpenAI/Gemini/any
OpenAI-compatible endpoint), and give it a real Settings screen (the sidebar's long-disabled
"coming soon" item) instead of a `.env`-only setup.
- [x] Provider abstraction in `api/tutor.js`: `callGemini` → `callLLM` dispatching to Gemini
      `generateContent`, Anthropic `/v1/messages`, and the OpenAI-compatible `chat/completions`
      shape shared by Groq (default) / OpenAI / custom base-URL endpoints; `PROVIDERS`/`PROVIDER_MODELS`
      own URL+model server-side, `providerConfig(req.body)` validates/normalizes what the client
      sends; per-provider `.env` fallback keys (`GROQ_API_KEY`, `GEMINI_API_KEY`,
      `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) used when no BYOK key is supplied; `custom` requires a
      key (no env fallback), base URL validated `https://`, all fields length-bounded (spec §5)
- [x] BYOK settings store: `src/lib/settings.js` (`tef:settings:v1`, global localStorage — the
      selected provider + per-provider keys + custom baseUrl/model), with `llmRequestMeta()`
      building the provider/apiKey fields on each request; the four `/api/tutor` call sites
      (call turn+score, translate, drill, generateUnit) routed through the single `src/lib/llm.js`
      `tutorRequest` wrapper (spec §5)
- [x] `SettingsScreen`: provider radio cards (Groq default badge, Claude/Anthropic, OpenAI, Gemini,
      Custom), a password-field API key input for the active provider, base URL + model fields for
      the custom provider, Save with confirmation, and a privacy note explaining where keys live;
      wired into `App.jsx` `SCREENS` and the `AppSidebar` nav item (polished + converted `Settings`
      icons' disabled "coming soon" state to a real `view`)
- [x] i18n: full EN/FR key set for the Settings screen (chrome only — the *values* a learner enters
      are data and are never run through `t()`); added `.env.example` vars
- [x] Dev/preview serving of the proxy: `tutorApiPlugin` in `vite.config.js` mounts `/api/tutor`
      inside Vite's own dev *and* preview servers (body parsing + Express-style `status()`/`json()`
      shim), so `bun run dev`/`bun run preview` are single-process — the endpoint was previously
      never served at all in dev (POST 404 → every LLM call failed with a generic "tutor
      unavailable"); `.env` fallback keys backfilled into `process.env` via `loadEnv` (spec §5)
- [x] Groq default model fixed: `llama-3.3-70b-versatile` returns `model_not_found` on current Groq
      plans → switched `PROVIDER_MODELS.groq` to `openai/gpt-oss-20b` (verified live against
      `/api/tutor`: `translate` and `turn` both return 200, `turn` returning a real French tutor
      reply); the Groq transport was also moved to the current official shape and then to the official
      **`openai` SDK** (user-chosen dependency, proxy-only): `callGroq` builds a per-call
      `new OpenAI({apiKey, baseURL: "https://api.groq.com/openai/v1"})` and calls
      `client.responses.create({model, input, text.format: {type: "json_object"},
      max_output_tokens, reasoning: {effort: "low"}})`, reading the `response.output_text` the SDK
      synthesizes client-side — verified live, all six request types return 200/meaningful errors
      (spec §5)
- [x] Test-status discrimination: the proxy carriers a provider HTTP status on non-429 failures and
      the Settings test maps 401/403 to a distinct `auth_failed` message ("provider rejected your
      key"), so a bad key is no longer reported as a generic "no response"
- [x] `type: "test"` on the proxy + a "Test connection" button on the Settings screen: a
      6th request type doing a zero-content JSON ping through the selected provider/key (or `.env`
      fallback) so the learner gets a concrete connected / failed / quota(429) status before
      relying on the provider (spec §5)
- [x] `bun run lint`/`bun run build`/`bun test` clean
- Spec refs: §3.1 (all request types), §5, §7

## Phase 11 — Provider status + AI usage visibility on dashboard
Goal: surface AI provider status and client-side call-count usage on the Progress dashboard so the
learner is aware of their key config and how many proxy calls they've made.
- [x] `src/lib/usage.js` — client-side usage tracker (`tef:usage:v1` in `localStorage`, global like
      settings): `recordCall(provider, type)`, `recordTest(provider, status)`, `getUsage()`,
      `callsToday()`, `callsByType()`. Call counts only (proxy returns no token counts — §7).
      Bounded to the most recent 500 entries so the blob can't grow unbounded.
- [x] `src/lib/llm.js` — every proxy call that reaches the server (network failures excluded) is
      counted via `recordCall(meta.provider, payload.type)` after the response is parsed, so usage
      is accurate without needing proxy-side changes.
- [x] `SettingsScreen.jsx` — after a "Test connection" result, `recordTest(provider, status)` is
      called so the dashboard can show the most recent provider health state (ok/auth/quota/generic).
- [x] `ProgressScreen.jsx` — two new always-visible cards above the mastery/sessions sections:
      **AI provider** card (active provider name, key-configured badge with green/muted dot, last
      test result with color-coded status dot, "Manage in Settings" button), and **AI usage** card
      (total/today count stat cards, per-request-type breakdown sorted alphabetically, empty-state
      prompt when no calls yet). Both read from `settings.js`/`usage.js` on every render — no
      React state or caching layer needed.
- [x] `AppSidebar.jsx` — compact **AI provider status widget** above the target-level card so the
      provider + connection-status dot (green/red/amber/gray) + today's request count stay visible
      on every screen; the card is a button that navigates to Settings. Mirrors the dashboard's
      status semantics (reuses `settings.js`/`usage.js` + the `sidebar.provider*` i18n keys).
- [x] i18n: 20 new keys per language (progress.provider.*, progress.usage.*, usage.type.*) — chrome
      only; the provider name is rendered via `t(activeProvider.labelKey)`, never hardcoded.
- [x] `src/lib/usage.test.js` — unit tests for record/reads/count helpers: multi-call recording,
      today vs. yesterday filtering, 500-cap truncation, malformed-blob fallback, lastTest
      overwrite, empty state.
- [x] Spec + roadmap + CLAUDE.md updated: §5 (architecture, request-type paragraph, localStorage
      layer inventory), §7 (usage visibility paragraph), `ROADMAP.md` Phase 11, CLAUDE.md dashboard
      description and non-migrated-storage list.
- [x] `bun run lint`/`bun run build`/`bun test` clean
- Spec refs: §5, §7
