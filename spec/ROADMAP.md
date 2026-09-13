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
- [x] EN/FR toggle in `AppSidebar`
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
- [x] Two static profiles (spec §4) via `src/lib/profiles.jsx` (`PROFILES`, `ProfileProvider`,
      `useProfile()`) — no gating picker screen; a click on the sidebar avatar/name row switches
      instantly, last-used profile id persisted in local storage
- [x] Save each completed call's transcript + corrections + scores to that profile's `sessions` in
      local storage (`src/lib/storage.js` `addSession`, spec §5 data model)
- [x] `HistoriqueScreen` reads the active profile's most recent session (basic session history —
      always "latest", no session-by-id browsing/list view yet)
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
- [x] 4 exercise types — multiple choice, fill-in-the-blank, translation, production
      (`ExerciseRunner` renders by `exercise.type`, no per-lesson hardcoding) — word-selection,
      sentence-ordering, matching, and listening-prep deferred (spec §3.4)
- [x] Answer evaluation as a pure/engine concern, not in the UI: `src/lib/learningEngine/evaluate.js`
      (exact/lenient-normalized matching for MC/fill-blank/translation) + `api/tutor.js`
      `type: "evaluate"` for free-form production answers (the "backend evaluation abstraction"
      the original proposal asked for, realized as this app's existing stateless LLM proxy rather
      than a new service, since there's no server framework to host one)
- [x] Lesson flow: Learn stage (LearningItem cards, `InteractiveText` reused for examples) →
      Practice stage (`ExerciseRunner`) → completion summary (accuracy + items practiced, not XP)
- [x] Feedback that teaches: every correct/incorrect answer shows *why*, not just right/wrong;
      "Try again" + "Continue" both always available on a miss; a `hints` array (when authored)
      reveals progressively — demonstrated on one exercise, not every exercise
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
