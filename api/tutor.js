// Single LLM proxy endpoint (spec §5) — request-type-driven, routes to the learner's chosen AI
// provider. Request types: "turn" (next conversational reply + optional inline correction, themed
// toward the learner's mastered expressions), "score" (end-of-call transcript → TEF rubric
// scores), "translate" (Learn interactive text: a word/sentence → English gloss), "ask" (lesson's
// "Ask your AI tutor": a free-form learner question about a lesson → a teaching answer), "drill"
// (Mistake Bank: a weak category → fresh tap-only exercises), "itemDrill" (Learn & Practice: one
// learning item → fresh ExerciseRunner-shaped exercises, "Practice more" on a vocabulary/expression/
// grammar card), and "generateUnit" (Learn & Practice: grow the curriculum with a new AI-generated
// unit).

import OpenAI from "openai";
import {
  TASK_A_SCENARIOS,
  TASK_B_SCENARIOS,
} from "../src/content/scenarios.js";

// Provider registry (spec §5): the server decides URL/model per provider — the client never sends
// more than a provider id and, for bring-your-own-key (settings screen), the key + a custom
// endpoint. `envKey` is the server-side fallback for deployments that keep a key in `.env` instead
// of entering one in Settings. Groq is the default provider. The `custom` provider has no env
// fallback — it exists precisely to use the learner's own endpoint/key from Settings.
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GROQ_RESPONSES_URL = "https://api.groq.com/openai/v1";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const PROVIDERS = {
  groq: "GROQ_API_KEY",
  gemini: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  custom: "", // no .env fallback — custom always needs a bring-your-own key
};

const PROVIDER_MODELS = {
  groq: "openai/gpt-oss-20b",
  gemini: "gemini-2.5-flash",
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
};

const DEFAULT_PROVIDER = "groq";
const MAX_API_KEY_CHARS = 256;
const MAX_BASE_URL_CHARS = 256;
const MAX_MODEL_CHARS = 100;

// Validates the client-supplied provider config and normalizes it; anything unknown falls back to
// the default provider. The API key is the learner's own bring-your-own-key secret when present,
// otherwise the proxy falls back to its .env key for that provider.
function providerConfig(body) {
  const provider = Object.hasOwn(PROVIDERS, body?.provider)
    ? body.provider
    : DEFAULT_PROVIDER;
  const apiKey =
    typeof body?.apiKey === "string"
      ? body.apiKey.trim().slice(0, MAX_API_KEY_CHARS)
      : "";
  let baseUrl = "";
  let model = "";
  if (provider === "custom") {
    if (typeof body?.baseUrl === "string" && /^https:\/\//.test(body.baseUrl)) {
      baseUrl = body.baseUrl
        .trim()
        .slice(0, MAX_BASE_URL_CHARS)
        .replace(/\/+$/, "");
    }
    if (typeof body?.model === "string")
      model = body.model.trim().slice(0, MAX_MODEL_CHARS);
  }
  return { provider, apiKey, baseUrl, model };
}

const MAX_TURNS = 20;
const MAX_TURN_CHARS = 500;
const MAX_TRANSLATE_CHARS = 300;
const MAX_EXPRESSION_CHARS = 60;
const MAX_EXPRESSIONS = 5;
const MAX_TERM_CHARS = 60;
const MAX_MEANING_CHARS = 100;
const MAX_LEVEL_CHARS = 10;
const MAX_QUESTION_CHARS = 300;
const MAX_CONTEXT_CHARS = 100;

// Fixed id → French label map so a client-supplied `topic` id only ever selects a known,
// server-controlled phrase — never interpolates raw client text into the system prompt.
const TOPIC_LABELS = {
  immigration: "un entretien avec un agent d'immigration canadien",
  daily: "la vie quotidienne (marché, rendez-vous, petites conversations)",
  professional:
    "un contexte professionnel (réunion, appel client, présentation)",
  free: "un sujet libre de ton choix",
};

const KNOWN_CATEGORIES = [
  "gender_agreement",
  "subjunctive",
  "passe_compose_imparfait",
  "pronunciation",
  "vocabulary",
  "spelling",
];

// `reason`/`rule` are instructional metadata, not graded TEF content (spec §5 i18n boundary) —
// they're written in the learner's current UI locale. Everything else (examples, practice
// sentences, corrected forms) is always French.
function metaLanguage(locale) {
  return locale === "fr" ? "français" : "anglais";
}

const CORRECTION_SCHEMA_NOTE = `Le champ "correction" (quand il n'est pas null) doit avoir la forme :
{"said": "ce que l'apprenant a dit", "correction": "la forme correcte", "reason": "explication courte", "category": "une des catégories ci-dessus", "rule": "la règle de grammaire en une phrase", "examples": ["2-3 phrases françaises complètes qui illustrent cette règle"], "practice": {"prompt": "une phrase française à trous illustrant la même règle, ex. 'Les enfants ___ (pouvoir) jouer dehors.'", "answer": "la réponse attendue", "options": ["la réponse attendue", "et 2-3 réponses plausibles mais incorrectes, dans le désordre"]}}
L'apprenant choisit sa réponse parmi "options" — il ne tape jamais de texte.`;

function findScenario(list, scenarioId) {
  return list.find((s) => s.id === scenarioId) ?? null;
}

// mode: "free" (default) | "taskA" | "taskB" | "mock". scenarioId only means anything for
// taskA/taskB/mock, and is only ever used to look up a fixed server-side scenario — never
// interpolated as raw client text, same rule as `topic`.
function modeLines(mode, scenarioId) {
  if (mode === "taskA" || mode === "mock") {
    const scenario =
      findScenario(TASK_A_SCENARIOS, scenarioId) ?? TASK_A_SCENARIOS[0];
    const taskALine = `Tâche A (obtenir des informations) : joue le rôle de l'interlocuteur pour ce
scénario, sans sortir du personnage : "${scenario.fr}". L'apprenant doit te poser des questions pour
obtenir des informations ou résoudre la situation — laisse-le mener la conversation en posant les
questions, ne les pose pas à sa place.`;
    if (mode === "taskA") return taskALine;
    // mock: Task A for the first few exchanges, then Task B — judge roughly from transcript length.
    // ponytail: only one scenarioId is threaded through per call, so the Task B half of a mock
    // exam is always TASK_B_SCENARIOS[0] rather than a second random draw — fine for an MVP mock
    // mode, revisit if mock exams need two independently-randomized scenarios.
    const scenarioB =
      findScenario(TASK_B_SCENARIOS, scenarioId) ?? TASK_B_SCENARIOS[0];
    return `${taskALine}

Ceci est un EXAMEN BLANC chronométré : après environ 4-5 échanges sur ce premier scénario, passe à
la Tâche B — annonce la transition, puis prends la position contraire à l'apprenant sur : "${scenarioB.fr}"
et pousse-le à défendre son opinion. Pendant tout l'examen, ne corrige AUCUNE erreur (mets toujours
"correction" à null) et ne donne aucune aide si l'apprenant hésite — c'est un examen, pas un
entraînement.`;
  }
  if (mode === "taskB") {
    const scenario =
      findScenario(TASK_B_SCENARIOS, scenarioId) ?? TASK_B_SCENARIOS[0];
    return `Tâche B (défendre un point de vue) : prends la position contraire à celle de l'apprenant
sur cette affirmation : "${scenario.fr}". Pousse-le poliment à défendre et justifier son opinion
(joue l'avocat du diable), sans jamais être agressif.`;
  }
  return "";
}

// masteredExpressions: a short list of French phrases the learner has already mastered in Learn &
// Practice (spec §3.2.6) — only ever a list of plain strings sourced from our own closed
// LEARNING_ITEMS/generated-content set (never arbitrary client text), capped defensively anyway.
function masteredExpressionsLine(masteredExpressions) {
  if (!Array.isArray(masteredExpressions) || masteredExpressions.length === 0)
    return "";
  const safe = masteredExpressions
    .filter((e) => typeof e === "string")
    .slice(0, MAX_EXPRESSIONS)
    .map((e) => e.slice(0, MAX_EXPRESSION_CHARS));
  if (!safe.length) return "";
  return `L'apprenant maîtrise déjà ces expressions françaises : ${safe.join(", ")}. Sans forcer ni
transformer la conversation en quiz, cherche des occasions naturelles de le laisser les utiliser.`;
}

function turnSystemPrompt(
  topic,
  mode,
  scenarioId,
  locale,
  masteredExpressions,
) {
  const topicLine =
    topic && TOPIC_LABELS[topic]
      ? `Le thème imposé pour cet appel est : ${TOPIC_LABELS[topic]}.`
      : "";
  const taskLine = modeLines(mode, scenarioId);
  return `Tu es Camille, une tutrice de français sympathique et patiente qui aide un apprenant à se
préparer pour le TEF (Test d'Évaluation de Français). Parle uniquement en français, adapte ton
niveau de langue à celui de l'apprenant, et garde tes réponses courtes (2-3 phrases) comme dans une
vraie conversation téléphonique. ${topicLine}

${taskLine}

${masteredExpressionsLine(masteredExpressions)}

Si l'apprenant fait une erreur significative de grammaire, de prononciation (déductible du texte)
ou de vocabulaire, corrige-la brièvement et naturellement dans ta réponse parlée, puis décris-la
aussi dans le champ structuré "correction". Ne signale PAS les petites erreurs à chaque tour —
seulement les erreurs qui valent la peine d'être notées. La catégorie doit être l'une de :
${KNOWN_CATEGORIES.join(", ")}.

${CORRECTION_SCHEMA_NOTE}
Écris les champs "reason" et "rule" en ${metaLanguage(locale)}. Écris "examples", "practice.prompt"
et "practice.answer" toujours en français, quelle que soit la langue de "reason"/"rule".

Réponds UNIQUEMENT avec un objet JSON de la forme :
{"reply": "ta réponse parlée en français", "correction": null ou {...comme décrit ci-dessus}}`;
}

const SCORE_SYSTEM_PROMPT = `Tu es un évaluateur TEF. On te donne la transcription complète d'un
appel entre un tuteur (role: model) et un apprenant de français (role: user). Évalue la performance
de l'APPRENANT uniquement selon les 5 dimensions du TEF, chacune notée de 0 à 5 :
taskAchievement, fluency, grammar, vocabulary, coherence.

Identifie aussi jusqu'à 3 catégories d'erreurs récurrentes (focusAreas, parmi :
${KNOWN_CATEGORIES.join(", ")}), jusqu'à 3 points forts (strengths, courtes phrases en français), et
jusqu'à 3 suggestions de vocabulaire (vocabSuggestions, courtes phrases en français).

Réponds UNIQUEMENT avec un objet JSON de la forme :
{"scores": {"taskAchievement": 0-5, "fluency": 0-5, "grammar": 0-5, "vocabulary": 0-5, "coherence": 0-5}, "focusAreas": [...], "strengths": [...], "vocabSuggestions": [...]}`;

const TRANSLATE_SYSTEM_PROMPT = `Tu traduis du français vers l'anglais pour un apprenant du TEF. On
te donne un mot ou une courte phrase en français. Réponds UNIQUEMENT avec un objet JSON de la forme
{"translation": "traduction anglaise concise et naturelle"}.`;

// type "ask" (spec §3.2.7) — a lesson's "Ask your AI tutor" Q&A. The answer is teaching content in
// the learner's UI language (same boundary as a correction's reason/rule): the `question` is the
// learner's own text and always stays in the user role, never concatenated into the system prompt
// (same injection rule as the call transcript).
function askSystemPrompt(locale) {
  return `Tu es un professeur de français patient qui aide un apprenant à se préparer pour le TEF.
L'apprenant te pose une question sur une leçon — souvent : quelle est la différence entre deux
expressions, ou comment/ quand utiliser une expression. Réponds de façon claire et pédagogique en 2 à
5 phrases : explique le sens et l'usage, donne la nuance, et donne 1-2 courts exemples français (des
phrases complètes) quand ils aident. Écris ta réponse en ${metaLanguage(locale)}.

Réponds UNIQUEMENT avec un objet JSON de la forme :
{"answer": "ta réponse"}`;
}

function drillSystemPrompt(category, locale) {
  return `Tu es un professeur de français qui crée des exercices ciblés pour le TEF. L'apprenant a
des difficultés récurrentes avec cette catégorie : "${category}". Crée 4 exercices À CHOIX
(l'apprenant ne tape jamais de texte — il touche la bonne réponse parmi des options) qui pratiquent
ce point : une phrase française à trous ("prompt", avec "________" à la place du mot manquant),
la bonne réponse ("answer"), et 3 réponses plausibles mais incorrectes ("distractors"). Varie la
difficulté. Un indice court ("hint") est optionnel ; écris-le en ${metaLanguage(locale)}. Les
phrases, réponses et distracteurs restent toujours en français.

Réponds UNIQUEMENT avec un objet JSON de la forme :
{"exercises": [{"prompt": "...", "answer": "...", "distractors": ["...", "...", "..."], "hint": "..."}]}`;
}

const EXERCISE_SHAPE_NOTE = `Chaque exercice a la forme :
{"id": "identifiant-court", "learningItemId": "id d'un des learningItems ci-dessus", "type": "multiple_choice" | "fill_blank" | "translation" | "pronunciation", "stage": "recognition" | "recall" | "context" | "completion" | "transformation" | "production", "prompt": "consigne affichée", "content": {...selon le type}, "answer": "réponse attendue (chaîne, ou tableau de réponses acceptées)", "explanation": "pourquoi c'est correct, en ${"{{META_LANGUAGE}}"}"}

L'apprenant ne tape JAMAIS de texte — il touche des options ou parle à voix haute, jamais de
clavier. Chaque type a un "content" adapté :
- "multiple_choice" : {"options": ["...", "...", "...", "..."]} — "answer" est l'une des options exactement.
- "fill_blank" : {"sentence": "phrase avec ________ à la place du mot manquant", "options": ["...", "...", "...", "..."]} — "answer" est l'une des options.
- "translation" : {"direction": "en_to_fr" ou "fr_to_en", "options": ["...", "...", "...", "..."]} — "answer" est l'une des options.
- "pronunciation" : {"sentence": "phrase française complète à prononcer à voix haute"} — "answer" est cette même phrase, telle qu'elle doit être reconnue par la reconnaissance vocale du navigateur.`;

// One item's "Practice more" (spec §3.2): unlike EXERCISE_SHAPE_NOTE above (used by generateUnit,
// which lists several learningItems and needs the model to say which one each exercise belongs
// to), there's only ever one item here — the server assigns "id"/"learningItemId" itself, so the
// model isn't asked for them at all.
function itemDrillSystemPrompt(term, meaning, level, locale, variants) {
  const variantsLine = variants
    ? `\n\nCe mot a plusieurs formes grammaticales : ${JSON.stringify(variants)}. Répartis les
exercices sur PLUSIEURS de ces formes (pas seulement "${term}") — par exemple un exercice sur une
personne/un genre, un autre sur une autre — pour que l'apprenant pratique toutes les variantes, pas
juste la forme de base.`
    : "";
  return `Tu es un professeur de français qui crée des exercices de pratique ciblés pour le TEF.
L'apprenant (niveau ${level}) veut pratiquer davantage cette expression ou ce mot français :
"${term}"${meaning ? ` (sens : "${meaning}")` : ""}.${variantsLine}

Crée 8 exercices variés (l'apprenant ne tape JAMAIS de texte — il touche des options ou parle à
voix haute) qui pratiquent ce terme sous plusieurs angles — reconnaissance du sens, traduction,
phrase à trous, prononciation à voix haute — pas juste le même type répété. Chaque exercice a la
forme :
{"type": "multiple_choice" | "fill_blank" | "translation" | "pronunciation", "stage": "recognition" | "recall" | "context" | "completion" | "transformation" | "production", "prompt": "consigne affichée", "content": {...selon le type}, "answer": "réponse attendue", "explanation": "pourquoi c'est correct, en ${metaLanguage(locale)}"}

- "multiple_choice" : {"options": ["...", "...", "...", "..."]} — "answer" est l'une des options exactement.
- "fill_blank" : {"sentence": "phrase avec ________ à la place du mot manquant", "options": ["...", "...", "...", "..."]} — "answer" est l'une des options.
- "translation" : {"direction": "en_to_fr" ou "fr_to_en", "options": ["...", "...", "...", "..."]} — "answer" est l'une des options.
- "pronunciation" : {"sentence": "phrase française complète à prononcer à voix haute"} — "answer" est cette même phrase.

N'inclus PAS de champs "id" ou "learningItemId". Réponds UNIQUEMENT avec un objet JSON de la forme :
{"exercises": [{"type": "...", "stage": "...", "prompt": "...", "content": {...}, "answer": "...", "explanation": "..."}]}`;
}

function generateUnitSystemPrompt(level, existingTopics, locale) {
  const existingLine = existingTopics?.length
    ? `Les unités suivantes existent déjà, choisis un thème TEF différent : ${existingTopics.join(", ")}.`
    : "";
  return `Tu es un concepteur de programme pour une application d'apprentissage du français façon
Duolingo, ciblée sur la préparation au TEF (Test d'Évaluation de Français). Crée UNE nouvelle unité
de niveau ${level}, sur un thème pertinent pour le TEF (vie quotidienne, travail, environnement,
technologie, logement, santé, éducation, voyages...). ${existingLine}

L'unité contient 2 à 3 leçons. Chaque leçon a 3 à 6 "learningItemIds" (vocabulaire, expressions,
ou un concept de grammaire — voir "items" ci-dessous) et 10 à 16 exercices qui les pratiquent en
profondeur — pas juste un exercice par item. Pour un item avec "conjugation" ou "agreement" (voir
ci-dessous), couvre plusieurs formes à travers les exercices de la leçon (par exemple : un exercice
teste "je" ou le masculin singulier, un autre teste "nous" ou le féminin pluriel, etc.) plutôt que
de toujours utiliser la même forme de base.

Chaque "item" (vocabulaire, expression, ou grammaire) a un id unique court (lettres/chiffres/tirets)
et l'une de ces formes :
- Vocabulaire : {"id": "...", "type": "vocabulary", "word": "...", "meaning": "traduction anglaise",
  "partOfSpeech": "...", "level": "${level}", "topic": "...", "example": "phrase française complète",
  "related": ["...", "..."]}. Si "partOfSpeech" est un verbe, "word" est l'infinitif et ajoute
  "conjugation": {"je": "...", "tu": "...", "ilElle": "...", "nous": "...", "vous": "...",
  "ilsElles": "..."} (présent de l'indicatif). Si "partOfSpeech" est un adjectif, ajoute
  "agreement": {"masculineSingular": "...", "feminineSingular": "...", "masculinePlural": "...",
  "femininePlural": "..."}. Omets "conjugation"/"agreement" pour tout le reste (noms, adverbes,
  etc. — rien à accorder ou conjuguer).
- Expression : {"id": "...", "type": "phrase", "phrase": "...", "meaning": "traduction anglaise",
  "function": "...", "level": "${level}", "topic": "...", "tefUsage": "...", "example": "phrase
  française complète", "related": ["...", "..."]}
- Grammaire : {"id": "...", "type": "grammar", "title": "...", "level": "${level}",
  "explanation": "règle en une ou deux phrases", "examples": ["...", "..."], "counterexamples": ["..."]}

${EXERCISE_SHAPE_NOTE.replace("{{META_LANGUAGE}}", metaLanguage(locale))}

Réponds UNIQUEMENT avec un objet JSON de la forme :
{"unit": {"id": "id-unite", "title": "titre en anglais", "description": "description en anglais",
"lessons": [{"id": "id-lecon", "title": "titre en anglais", "learningItemIds": ["..."],
"exercises": [...]}]}, "items": {"id-item-1": {...}, "id-item-2": {...}}}

"unit.title", "unit.description", et "lesson.title" sont en ${metaLanguage(locale)} (ce sont des
titres d'interface, pas du contenu français à apprendre) ; tout le reste en français, sauf les
champs "meaning"/"explanation"/"hint" déjà notés ci-dessus.`;
}

function boundTranscript(transcript) {
  return transcript.slice(-MAX_TURNS).map((turn) => ({
    role: turn.speaker === "tutor" ? "model" : "user",
    parts: [{ text: String(turn.text ?? "").slice(0, MAX_TURN_CHARS) }],
  }));
}

// Shared LLM call: JSON-mode structured output, same timeout/error-code conventions for every
// request type and provider. `cfg` comes from providerConfig(req.body) — provider (+ optional
// bring-your-own-key from the settings screen). Each provider has its own transport shape:
// Groq via the official `openai` SDK against its base URL (Responses API), Gemini's generateContent
// JSON mode, Anthropic's /v1/messages, and the OpenAI-compatible chat-completions shape shared by
// the openai provider / any custom endpoint.
async function callLLM(systemPrompt, contents, cfg, { maxTokens = 2048 } = {}) {
  const apiKey = cfg.apiKey || process.env[PROVIDERS[cfg.provider]];
  if (!apiKey) return { error: "llm_unavailable" };

  // Groq is called through the `openai` SDK (the intentional dependency): same request the official
  // docs' snippet sends — Responses API against https://api.groq.com/openai/v1, model passed in,
  // output read from `.output_text`, which the SDK synthesizes client-side (the raw REST response
  // does not include it).
  if (cfg.provider === "groq") {
    return callGroq(systemPrompt, contents, apiKey, maxTokens);
  }

  try {
    let url;
    let headers;
    let body;

    if (cfg.provider === "gemini") {
      url = `${GEMINI_URL}?key=${apiKey}`;
      headers = { "Content-Type": "application/json" };
      body = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { responseMimeType: "application/json" },
      };
    } else if (cfg.provider === "anthropic") {
      url = ANTHROPIC_URL;
      headers = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
      body = {
        model: cfg.model || PROVIDER_MODELS.anthropic,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: contents.map((c) => ({
          role: c.role === "model" ? "assistant" : "user",
          content: String(c.parts?.[0]?.text ?? ""),
        })),
      };
    } else {
      // openai / custom speak OpenAI's chat-completions shape. Custom providers take their
      // baseUrl + model from the settings screen, and skip response_format (a custom server may
      // not support JSON mode — the prompt instruction is enough there).
      if (cfg.provider === "openai") url = OPENAI_URL;
      else if (cfg.baseUrl && cfg.model)
        url = `${cfg.baseUrl}/chat/completions`;
      else return { error: "llm_unavailable" };
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      body = {
        model: cfg.model || PROVIDER_MODELS[cfg.provider],
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          ...contents.map((c) => ({
            role: c.role === "model" ? "assistant" : "user",
            content: String(c.parts?.[0]?.text ?? ""),
          })),
        ],
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      // surface the HTTP status so the Settings "test" can distinguish a rejected key (401/403)
      // from a generic provider failure — the real message stays server-side, only the code leaks.
      return {
        error: res.status === 429 ? "quota_exceeded" : "llm_unavailable",
        status: res.status,
      };
    }

    const data = await res.json();
    const text =
      cfg.provider === "anthropic"
        ? data.content?.[0]?.text
        : cfg.provider === "gemini"
          ? data.candidates?.[0]?.content?.parts?.[0]?.text
          : data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim())
      return { error: "llm_unavailable" };

    try {
      return { data: JSON.parse(text) };
    } catch {
      return { error: "llm_unavailable" };
    }
  } catch {
    return { error: "llm_unavailable" };
  }
}

// The `openai` SDK call Groq is routed through (spec §5). Requests use JSON mode
// (`text.format.json_object`), gpt-oss reasoning-model fields (`max_output_tokens`, not
// `max_tokens`, + `reasoning: {effort}`), and the same 20s timeout / error-code conventions as the
// fetch-based providers. A client is built per call with that request's resolved key — the SDK
// validates credentials at construction, so a shared keyless instance would throw.
async function callGroq(systemPrompt, contents, apiKey, maxTokens) {
  const client = new OpenAI({
    apiKey,
    baseURL: GROQ_RESPONSES_URL,
    timeout: 20000,
    maxRetries: 0,
  });
  try {
    const response = await client.responses.create({
      model: PROVIDER_MODELS.groq,
      input: [
        { role: "system", content: systemPrompt },
        ...contents.map((c) => ({
          role: c.role === "model" ? "assistant" : "user",
          content: String(c.parts?.[0]?.text ?? ""),
        })),
      ],
      text: { format: { type: "json_object" } },
      max_output_tokens: maxTokens,
      temperature: 0.7,
      reasoning: { effort: "low" },
    });
    const text = response.output_text;
    if (typeof text !== "string" || !text.trim())
      return { error: "llm_unavailable" };
    try {
      return { data: JSON.parse(text) };
    } catch {
      return { error: "llm_unavailable" };
    }
  } catch (err) {
    const status = err?.status;
    return {
      error: status === 429 ? "quota_exceeded" : "llm_unavailable",
      status,
    };
  }
}

function safePractice(practice) {
  if (!practice || typeof practice !== "object") return null;
  const prompt = String(practice.prompt ?? "");
  const answer = String(practice.answer ?? "");
  const options = Array.isArray(practice.options)
    ? practice.options.map(String)
    : [];
  if (!prompt || !answer) return null;
  return {
    prompt,
    answer,
    options: options.includes(answer) ? options : [...options, answer],
  };
}

function safeCorrection(correction) {
  if (!correction || typeof correction !== "object") return null;
  return {
    said: String(correction.said ?? ""),
    correction: String(correction.correction ?? ""),
    reason: String(correction.reason ?? ""),
    category: correction.category,
    rule: String(correction.rule ?? ""),
    examples: Array.isArray(correction.examples)
      ? correction.examples.map(String)
      : [],
    practice: safePractice(correction.practice),
  };
}

// ponytail: shallow structural validation only (right fields, right types) — doesn't verify e.g.
// that `answer` for a fill_blank exercise actually appears in its `options`. Bad generated content
// just renders as an odd-looking exercise rather than crashing; tightening this needs a real
// per-type schema validator if generation quality turns out to be a problem in practice.
function safeUnit(raw) {
  if (!raw?.unit || typeof raw.unit !== "object") return null;
  const unit = raw.unit;
  if (!unit.id || !unit.title || !Array.isArray(unit.lessons)) return null;
  return {
    unit,
    items: raw.items && typeof raw.items === "object" ? raw.items : {},
  };
}

const EXERCISE_TYPES = ["multiple_choice", "fill_blank", "translation", "pronunciation"];

// Same shallow-validation philosophy as safeUnit above. "id"/"learningItemId" are assigned here,
// not trusted from the model (see itemDrillSystemPrompt) — there's exactly one real learningItemId
// per request, so there's no ambiguity to resolve.
function safeItemExercises(raw, learningItemId) {
  if (!Array.isArray(raw?.exercises)) return null;
  const exercises = raw.exercises
    .filter(
      (e) =>
        e &&
        typeof e === "object" &&
        EXERCISE_TYPES.includes(e.type) &&
        e.prompt &&
        e.content &&
        typeof e.content === "object" &&
        e.answer,
    )
    .slice(0, 8)
    .map((e, i) => ({
      id: `gen_${Date.now()}_${i}`,
      learningItemId,
      type: e.type,
      stage: typeof e.stage === "string" ? e.stage : "recall",
      prompt: String(e.prompt),
      content: e.content,
      answer: e.answer,
      explanation: String(e.explanation ?? ""),
    }));
  return exercises.length ? exercises : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const {
    type,
    transcript,
    topic,
    mode,
    scenarioId,
    masteredExpressions,
    text,
    category,
    locale,
    level,
    existingTopics,
    learningItemId,
    term,
    meaning,
    variants,
    question,
    lessonTitle,
    itemTerm,
  } = req.body ?? {};
  const llm = providerConfig(req.body);
  const safeLocale = locale === "fr" ? "fr" : "en";

  if (
    ![
      "turn",
      "score",
      "translate",
      "ask",
      "drill",
      "itemDrill",
      "generateUnit",
      "test",
    ].includes(type)
  ) {
    res.status(400).json({ error: "unknown_request_type" });
    return;
  }

  if (type === "translate") {
    if (typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "invalid_text" });
      return;
    }
    const bounded = text.slice(0, MAX_TRANSLATE_CHARS);
    const { data, error } = await callLLM(
      TRANSLATE_SYSTEM_PROMPT,
      [{ role: "user", parts: [{ text: bounded }] }],
      llm,
      { maxTokens: 512 },
    );
    if (error || typeof data?.translation !== "string") {
      res.status(502).json({ error: error ?? "llm_unavailable" });
      return;
    }
    res.status(200).json({ translation: data.translation });
    return;
  }

  // type === 'ask' — a lesson's "Ask your AI tutor" free-form Q&A (spec §3.2.7). `question` is the
  // learner's own text, bounded client-side and re-bounded here, and passed only in the user role
  // as context + question — never spliced into the system prompt. `lessonTitle`/`itemTerm` come
  // from our own course data and are bounded defensively anyway.
  if (type === "ask") {
    if (typeof question !== "string" || !question.trim()) {
      res.status(400).json({ error: "invalid_question" });
      return;
    }
    const safeQuestion = question.trim().slice(0, MAX_QUESTION_CHARS);
    const safeTitle =
      typeof lessonTitle === "string"
        ? lessonTitle.trim().slice(0, MAX_CONTEXT_CHARS)
        : "";
    const safeItem =
      typeof itemTerm === "string"
        ? itemTerm.trim().slice(0, MAX_CONTEXT_CHARS)
        : "";
    const context = [safeTitle && `Leçon : « ${safeTitle} ».`, safeItem && `Élément étudié : « ${safeItem} ».`]
      .filter(Boolean)
      .join(" ");
    const { data, error } = await callLLM(
      askSystemPrompt(safeLocale),
      [{ role: "user", parts: [{ text: `${context ? `${context} ` : ""}Question : ${safeQuestion}` }] }],
      llm,
      { maxTokens: 1024 },
    );
    if (error) {
      res.status(502).json({ error });
      return;
    }
    if (typeof data?.answer !== "string" || !data.answer.trim()) {
      res.status(502).json({ error: "llm_unavailable" });
      return;
    }
    res.status(200).json({ answer: data.answer });
    return;
  }

  // type === 'test' — Settings screen's "Test connection": prove the selected provider + key (or
  // .env fallback) can reach the model and return JSON, with no LLM content involved. Same route as
  // every other request (provider taken from req.body via providerConfig / llmRequestMeta), so it
  // also validates the custom provider's baseUrl + model.
  if (type === "test") {
    const { error, status } = await callLLM(
      'Tu réponds uniquement avec l\'objet JSON {"status":"ok"}.',
      [{ role: "user", parts: [{ text: "ping" }] }],
      llm,
      { maxTokens: 64 },
    );
    if (error) {
      res
        .status(502)
        .json({
          error: status === 401 || status === 403 ? "auth_failed" : error,
        });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  if (type === "drill") {
    if (!KNOWN_CATEGORIES.includes(category)) {
      res.status(400).json({ error: "invalid_category" });
      return;
    }
    const { data, error } = await callLLM(
      drillSystemPrompt(category, safeLocale),
      [{ role: "user", parts: [{ text: category }] }],
      llm,
    );
    if (error || !Array.isArray(data?.exercises)) {
      res.status(502).json({ error: error ?? "llm_unavailable" });
      return;
    }
    const exercises = data.exercises
      .map((e) => ({
        prompt: String(e?.prompt ?? ""),
        answer: String(e?.answer ?? ""),
        options: Array.isArray(e?.distractors)
          ? [...e.distractors.map(String), String(e?.answer ?? "")].sort(
              () => Math.random() - 0.5,
            )
          : [],
        hint: String(e?.hint ?? ""),
      }))
      .filter((e) => e.prompt && e.answer && e.options.length > 1);
    res.status(200).json({ exercises });
    return;
  }

  if (type === "itemDrill") {
    if (
      typeof learningItemId !== "string" ||
      !learningItemId ||
      typeof term !== "string" ||
      !term.trim()
    ) {
      res.status(400).json({ error: "invalid_item" });
      return;
    }
    const safeTerm = term.trim().slice(0, MAX_TERM_CHARS);
    const safeMeaning =
      typeof meaning === "string" ? meaning.trim().slice(0, MAX_MEANING_CHARS) : "";
    const safeItemLevel =
      typeof level === "string" && level.length <= MAX_LEVEL_CHARS ? level : "B1";
    // Bounded, not schema-validated: only used to steer the prompt text, never parsed/trusted for
    // anything structural — an oversized or malformed value is simply dropped.
    const safeVariants =
      variants && typeof variants === "object" && JSON.stringify(variants).length <= 500
        ? variants
        : null;
    const { data, error } = await callLLM(
      itemDrillSystemPrompt(safeTerm, safeMeaning, safeItemLevel, safeLocale, safeVariants),
      [{ role: "user", parts: [{ text: safeTerm }] }],
      llm,
      { maxTokens: 4096 }, // bumped alongside the 5→8-exercises prompt change above
    );
    const exercises = safeItemExercises(data, learningItemId);
    if (error || !exercises) {
      res.status(502).json({ error: error ?? "llm_unavailable" });
      return;
    }
    res.status(200).json({ exercises });
    return;
  }

  if (type === "generateUnit") {
    const safeLevel =
      typeof level === "string" && level.length <= 10 ? level : "B1";
    const safeExisting = Array.isArray(existingTopics)
      ? existingTopics
          .filter((t) => typeof t === "string")
          .slice(0, 30)
          .map((t) => t.slice(0, 60))
      : [];
    const { data, error } = await callLLM(
      generateUnitSystemPrompt(safeLevel, safeExisting, safeLocale),
      [{ role: "user", parts: [{ text: `Niveau : ${safeLevel}` }] }],
      llm,
      { maxTokens: 16384 }, // bumped alongside the 10-16-exercises-per-lesson prompt above
    );
    const unit = safeUnit(data);
    if (error || !unit) {
      res.status(502).json({ error: error ?? "llm_unavailable" });
      return;
    }
    res.status(200).json(unit);
    return;
  }

  if (!Array.isArray(transcript)) {
    res.status(400).json({ error: "invalid_transcript" });
    return;
  }

  const contents = boundTranscript(transcript);

  if (type === "turn") {
    const safeMode = ["taskA", "taskB", "mock"].includes(mode) ? mode : "free";
    const prompt = turnSystemPrompt(
      typeof topic === "string" ? topic : null,
      safeMode,
      typeof scenarioId === "string" ? scenarioId : null,
      safeLocale,
      masteredExpressions,
    );
    const { data, error } = await callLLM(prompt, contents, llm);
    if (error || typeof data?.reply !== "string") {
      res.status(502).json({ error: error ?? "llm_unavailable" });
      return;
    }
    res
      .status(200)
      .json({ reply: data.reply, correction: safeCorrection(data.correction) });
    return;
  }

  // type === 'score'
  const { data, error } = await callLLM(SCORE_SYSTEM_PROMPT, contents, llm);
  if (error || !data?.scores) {
    res.status(502).json({ error: error ?? "llm_unavailable" });
    return;
  }
  res.status(200).json({
    scores: data.scores,
    focusAreas: Array.isArray(data.focusAreas) ? data.focusAreas : [],
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    vocabSuggestions: Array.isArray(data.vocabSuggestions)
      ? data.vocabSuggestions
      : [],
  });
}
