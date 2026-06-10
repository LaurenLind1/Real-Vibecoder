# VibeCoder — updated plan (multi-provider keys added)

Same phased build as before, with one change: **Settings now manages multiple AI provider keys**, not just Google.

## New: Providers panel (in Settings modal, Phase 1)

A dedicated "AI Providers" section where the user can add/remove keys for any number of providers. Each row: provider name, key input (masked), status dot (valid / unverified / error), test button, delete button. "Add provider" button opens a picker.

**Built-in providers (preset):**
- Google Gemini (`GEMINI_API_KEY`) — endpoint: `generativelanguage.googleapis.com`, SDK: `@google/genai`
- OpenAI / ChatGPT (`OPENAI_API_KEY`) — endpoint: `api.openai.com/v1`
- Anthropic Claude (`ANTHROPIC_API_KEY`) — endpoint: `api.anthropic.com/v1`
- Lovable AI Gateway (`LOVABLE_API_KEY`) — endpoint: `ai.gateway.lovable.dev/v1` (OpenAI-compatible)
- xAI Grok (`XAI_API_KEY`) — `api.x.ai/v1`
- Mistral (`MISTRAL_API_KEY`) — `api.mistral.ai/v1`
- Groq (`GROQ_API_KEY`) — `api.groq.com/openai/v1`
- DeepSeek (`DEEPSEEK_API_KEY`) — `api.deepseek.com/v1`
- OpenRouter (`OPENROUTER_API_KEY`) — `openrouter.ai/api/v1` (acts as a meta-provider, unlocks 100+ models)
- **Custom (OpenAI-compatible)** — user supplies label + baseURL + key (covers Ollama, LM Studio, Together, Fireworks, Azure, anything else)

**Model picker** becomes provider-aware: dropdown shows only models from providers with a saved key. Each provider has a curated model list (e.g. Gemini → 3 Flash / 3 Pro / 2.5 Pro; OpenAI → gpt-5 / gpt-5-mini / o-series; Claude → Opus 4 / Sonnet 4.5 / Haiku; Lovable → all gateway models from the catalog). User can also type a custom model ID.

**Default model** = first key the user adds. Switching providers mid-project is allowed; agent loop adapts the request shape.

## How the agent uses them (Phase 1)

Single client-side `callModel({ provider, model, messages, tools })` adapter:
- Gemini → native `@google/genai` (best tool calling for Gemini)
- Everyone else → OpenAI-compatible chat completions via `fetch` (works for OpenAI, Claude via their OpenAI-compat endpoint, Lovable Gateway, Grok, Mistral, Groq, DeepSeek, OpenRouter, custom)
- Anthropic native shape used only if user picks the `messages` API explicitly (toggle on the provider row)

Tool-call schema is normalized in/out of the adapter so the agent loop, system prompt, and 7 file tools stay identical across providers.

## Storage & security (unchanged stance)

- All keys in `localStorage` under `vibecoder.providers.v1` (array of `{id, providerId, label, apiKey, baseURL?, enabled}`).
- Keys never leave the browser except to that provider's own endpoint.
- Optional passphrase-lock (Phase 3) encrypts the whole providers blob with WebCrypto AES-GCM.
- Export/Import settings includes providers (with a "include keys?" checkbox).
- UI only ever shows last 4 chars + a fingerprint.

## Phase impact

- **Phase 1:** ships the Providers panel, adapter, provider-aware model picker. Adds ~30 min to the original Phase 1 estimate (now ~1.5–2.5 hrs).
- **Phases 2–5:** unchanged. Auto-fix, screenshot, planner, Supabase backend, versioning, etc. all run through the same adapter, so any provider works for any feature (planner can be Claude, builder can be Gemini, etc.).

## Out of scope

- No server-side proxy for keys (would defeat the BYOK model).
- No billing/usage dashboards — providers each have their own.
- No automatic key validation beyond a cheap "list models" or 1-token ping on the Test button.

Hit **Implement plan** to start Phase 1 with the Providers panel included.
