# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is `bun` (see `bun.lock`).

- `bun run dev` — start the Vite dev server
- `bun run build` — production build
- `bun run preview` — preview the production build locally
- `bun run lint` — run oxlint (config: `.oxlintrc.json`, `react` + `oxc` plugins)

There is no test suite yet.

## Spec-driven development

This project is spec-driven: product decisions and scope live in `spec/`, not in this file or in
ad-hoc chat context.

- `spec/PRODUCT_SPEC.md` — the source of truth for what the app is: two features — a
  Duolingo-mechanics **Learn & Practice** curriculum (tap-only exercises, the default-landing
  feature, growable via AI-generated units) and a live voice call with an AI TEF tutor that's
  themed toward the learner's mastered expressions — the TEF scoring rubric, architecture
  decisions, data model, and explicit non-goals.
- `spec/ROADMAP.md` — the phased build checklist derived from the spec, with checkboxes to track
  what's actually implemented.

Before implementing a feature, check whether it's covered in `PRODUCT_SPEC.md`. If a task needs
something the spec doesn't cover, update the spec first, then the roadmap, then implement — don't
let implementation and spec drift apart.

**Any time a feature or piece of functionality is mentioned or added — in a user request, in
passing conversation, or in code — update the documentation in the same turn, not as a follow-up:**
- New/changed product scope → `spec/PRODUCT_SPEC.md` (add or edit the relevant section; renumber
  cross-references if a section moves, e.g. §3.x, and sweep `spec/ROADMAP.md`/`CLAUDE.md` for the
  old numbers).
- New/changed build status (something is now built, partially built, or newly planned) →
  `spec/ROADMAP.md` (check off what's done, add a phase/checklist item for what's newly planned —
  don't leave a shipped feature unchecked or a discussed-but-unbuilt one absent entirely).
- New/changed architecture decision, dependency, or standing rule (a new library, a new data-flow
  boundary, a new failure mode to handle, a new accessibility/security requirement) → this file
  (`CLAUDE.md`), under Architecture or Production-readiness rules as appropriate.
- This applies even when the user only asks to *discuss* or *plan* a feature, not implement it yet
  — the spec is the record of product decisions, so a decided direction belongs there immediately,
  before any code exists for it. Skip only pure implementation-detail chat that changes no product
  decision, scope, or standing rule.

## Architecture

The app is a single Vite + React (JS, not TS) SPA. Both features in the spec are built and wired to
real data: Learn & Practice (§3.2, `LearnScreen`/`LessonScreen`, the default-landing view) is a
tap-only curriculum — every exercise is `ChoiceBank` chips or `TileBuilder` word tiles, never a text
input — with mastery tracking, a spaced review queue, and a "Generate a new unit" action that grows
the course via the LLM; the Call (§3.1, `CallScreen`/`HistoriqueScreen`/`ObjectifScreen`) is a
Free/Task A/Task B/Mock exam voice conversation, themed (not gated) by the learner's mastered
expressions from Learn & Practice. `ProgressScreen` (§6) gives a combined per-profile dashboard.
Not built: a profile-picker gating screen (deliberately — see §4), in-call stuck/guidance
detection, the full Task A/B scenario library beyond a first-pass set, and personalization actually
*biasing* scenario/topic selection (today it's manual pick + informed labels + mastered-expression
theming only) — check `spec/ROADMAP.md` for the exact state of every phase.

Key architectural decisions locked in by the spec (see `spec/PRODUCT_SPEC.md` §5 for full detail):

- **No client-side state library and no backend database.** State is React context
  (`ProfileProvider` in `src/lib/profiles.jsx`, `LocaleProvider` in `src/lib/i18n/LocaleContext.jsx`);
  persistence is `localStorage` via `src/lib/storage.js`, scoped per learner profile (there are
  exactly two static local profiles, no auth, switched from the sidebar — no gating picker screen).
- **Voice is entirely browser-native.** Speech-to-text uses the Web `SpeechRecognition` API and
  playback uses `speechSynthesis` — no third-party speech SDK. This only works in
  Chromium-based browsers (Chrome/Edge); the app must degrade with a clear message elsewhere.
- **The only "backend" is a single LLM proxy endpoint** (`api/tutor.js`). It exists solely to keep
  the LLM API key server-side (never bundled into the client) and is one small serverless-style
  handler, not a server framework. It's request-type-driven, all five types sharing one Gemini
  JSON-mode helper (`callGemini`): `type: "turn"` (tutor's next reply + an inline structured
  `correction` — `{said, correction, reason, category, rule, examples, practice: {prompt, answer,
  options}}`, themed by `topic`/`mode`/`scenarioId` for Task A/B/mock and by `masteredExpressions`
  from Learn & Practice), `type: "score"` (finished call transcript → rubric
  scores/focusAreas/strengths/vocabSuggestions), `type: "translate"` (Learn's click-to-hear/gloss
  interaction), `type: "drill"` (a weak category → fresh tap-only exercises, `options` built
  server-side, for the Mistake Bank), `type: "generateUnit"` (Learn & Practice: grow the curriculum
  with a new AI-generated unit, validated server-side before being returned). In-call
  stuck/guidance detection is specced but not built (nothing in the UI surfaces it) — deliberately
  kept to one endpoint rather than one per concern. A Gemini `429` maps to a distinct
  `quota_exceeded` error code so the client can tell quota exhaustion from a generic failure.
- **No exercise or practice interaction anywhere in the app accepts typed text.** Every exercise
  (multiple choice, fill-in-the-blank, translation, production) is answered by tapping —
  `ChoiceBank` (chip selection) or `TileBuilder` (ordered word tiles for "build the sentence").
  `production` exercises used to be free-form and LLM-evaluated; they're now tile-based and
  evaluated locally by `src/lib/learningEngine/evaluate.js`'s `evaluateProduction` (string
  normalize + compare) — don't reintroduce an `<input>`/`<textarea>` into this flow, and don't
  reintroduce an LLM call into answer evaluation.
- **Lesson content is static data plus an AI-generated extension**, not fetched from a CMS/
  database — the seed unit is written once under `src/content/course.js` (also home to
  `scenarios.js`'s Task A/B prompts, imported directly by both `ObjectifScreen` and `api/tutor.js`
  so scenario text never drifts between what the learner reads and what the tutor is prompted
  with). AI-generated units (`type: "generateUnit"`) are namespaced by
  `src/lib/learningEngine/importGeneratedUnit.js` and persisted client-side in
  `src/lib/generatedContent.js` (a separate, global — not per-profile — `localStorage` key, since
  it's shared curriculum, not personal data); `course.js`'s lookup functions merge both sources
  transparently. Still no database — generated content lives in the browser, same as everything
  else.
- **Styling is Tailwind CSS + shadcn/ui**, themed to `wireframe/design-system.png`'s palette/type
  scale (Fraunces + Inter, self-hosted via `@fontsource-variable/*`). Utility classes for
  layout/spacing, shadcn components (generated into `src/components/ui/`, not installed as an npm
  package) for interactive primitives (Button, Card, etc.). This is a deliberate exception to the
  "no new dependency" default below — the user explicitly chose this stack — so don't second-guess
  or revert it back to hand-rolled CSS.
- **App UI chrome supports English/French (English default).** Hand-rolled — no i18n library —
  via `src/lib/i18n/{en,fr}.js` dictionaries and `LocaleContext`'s `t()`. This governs only the
  app's own labels/headers/buttons; see the production-readiness rule below for the hard boundary
  with tutor/learner French content.

## Production-readiness rules

- **Never let the LLM API key reach the client bundle.** It lives only in `.env` (gitignored,
  `.env.example` documents the required var name) and is read server-side by the proxy handler. If
  a new env var is needed, add it to both `.env` and `.env.example`.
- **Validate/bound anything sent to the LLM proxy before it leaves the client**: cap transcript
  length sent per request, and never forward raw unbounded user text as a prompt-injection vector
  into the system prompt — the proxy's system prompt and the learner's transcript must stay in
  clearly separate roles in the request payload.
- **Handle the two real external failure modes explicitly, not with a generic catch-all**: the LLM
  proxy call failing/timing out — distinguish `quota_exceeded` (free-tier limit hit, see
  `spec/PRODUCT_SPEC.md` §7) from a generic `llm_unavailable` via `src/lib/errors.js`'s
  `llmErrorKey`, don't collapse them back into one message — and the Web Speech API being
  unsupported or denied mic permission. Both must show the learner a clear, specific message —
  never a silent failure or a raw stack trace.
- **Accessibility is not optional, on the call UI or Learn & Practice**: the mic control needs a
  real `aria-label`, the live transcript region needs `aria-live` so screen readers announce new
  turns; `ChoiceBank`/`TileBuilder`'s tappable chips/tiles are real `<button>`s, reachable/announced
  like any other control, not divs with a click handler. Every interactive control must be
  reachable/operable by keyboard, not just click/tap.
- **Never run the app's EN/FR i18n over tutor/learner content.** `t()` (`src/lib/i18n/`) is for the
  app's own chrome strings only — nav, headers, buttons, labels. The tutor's spoken/written French,
  the learner's own transcript, and the flagged text/corrected form/exercise content of any
  correction or exercise must always render as the raw French they came as, regardless of the UI
  locale — that content is the subject being taught, not chrome. The deliberate exceptions are a
  correction's short *reason* and its "Why?" **rule** explanation (spec §3.1.3) — instructional
  metadata, not graded content, so they're generated in the current `locale` (sent with `type:
  "turn"`/`"drill"`/`"generateUnit"` requests). Everything else — `examples`, exercise
  prompts/tiles/options, AI-generated unit content — is always French, no exception. Keep new
  French-content strings out of the i18n dictionaries entirely so this boundary can't blur by
  accident.
- **No new dependency without a reason that survives the ladder** in this project's ponytail rules:
  check stdlib/Web platform/an already-installed package first. This app was scoped specifically to
  avoid new deps for speech (Web Speech API), state (React context), and the LLM SDK (plain
  `fetch`) — don't quietly reintroduce them. Tailwind CSS + shadcn/ui (and shadcn's own small
  dependencies: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`) are the one
  explicit exception, chosen by the user for styling/components — allowed, don't relitigate.
- **Run `bun run lint` clean before considering any change done.** No leftover `console.log`
  debugging output or dead code in committed changes.
- **Don't commit `.env` or any real API key/secret** — verify `git status`/`git diff` before
  committing whenever a change touches env handling.
