export const type = "droid_local";
export const label = "Droid (Factory.ai)";

/**
 * Default model to use when none is configured.
 * Factory.ai built-in model IDs are short (e.g. "claude-opus-4-6").
 * Custom BYOK models use the prefix "custom:<alias>" where alias is
 * the key in ~/.factory/settings.json under the "models" section.
 *
 * NOTE: Intentionally NOT Gemini here — this adapter is often used as a
 * fallback when the primary gemini-local adapter exhausts its quota.
 * Using a non-Gemini model ensures the fallback actually works.
 */
export const DEFAULT_DROID_LOCAL_MODEL = "claude-sonnet-4-6";

/**
 * Built-in Factory.ai models (as of March 2026).
 * Custom models configured via BYOK appear as "custom:<alias>".
 *
 * Run `droid /model` interactively or check https://docs.factory.ai/reference/cli-reference#available-models
 * for the full up-to-date list.
 */
export const models = [
  // ── Factory.ai built-in models ──────────────────────────────────────────
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { id: "claude-opus-4-6-fast", label: "Claude Opus 4.6 Fast" },
  { id: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { id: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
  { id: "gpt-5.2-codex", label: "GPT-5.2 Codex" },
  { id: "gpt-5.2", label: "GPT-5.2" },
  { id: "gpt-5.1-codex", label: "GPT-5.1 Codex" },

  // ── Custom BYOK models (from ~/.factory/settings.json) ──────────────────
  // The id must match the "id" field in your settings.json exactly.
  // Droid CLI identifies these by the "custom:" prefix.
  { id: "── Custom ──", label: "── Custom ──" },
  { id: "custom:GLM-4.6-0", label: "GLM 4.6 [custom]" },
  { id: "custom:GLM-4.7-1", label: "GLM 4.7 [custom]" },
  { id: "custom:GLM-5", label: "GLM 5 [custom]" },
  { id: "custom:Grok-4-Fast-2", label: "Grok 4 Fast [custom]" },
  { id: "custom:MiniMax-M2.1", label: "MiniMax M2.1 [custom]" },
  { id: "custom:MiniMax-M2-3", label: "MiniMax M2 [custom]" },
  { id: "custom:DeepSeek-4", label: "DeepSeek [custom]" },
  { id: "custom:DeepSeek-Reasoner-5", label: "DeepSeek Reasoner [custom]" },
];


export const agentConfigurationDoc = `# droid_local agent configuration

Adapter: droid_local

Use when:
- You want Paperclip to run Factory.ai's Droid CLI locally as the agent runtime
- You want access to Factory.ai's curated model roster (Claude, Gemini, GPT, GLM, Kimi…)
- You want to use your own custom/private models via Factory's BYOK system

Don't use when:
- The Droid CLI is not installed (install: curl -fsSL https://app.factory.ai/cli | sh)
- You need webhook-style external invocation (use openclaw or http adapter)

Install:
  curl -fsSL https://app.factory.ai/cli | sh
  droid auth   # authenticate with your Factory.ai account

Core fields:
- model (string): Factory model ID (e.g. "gemini-3.1-pro-preview", "claude-opus-4-6").
  For custom BYOK models configured in ~/.factory/settings.json use "custom:<alias>".
  See: https://docs.factory.ai/reference/cli-reference#available-models
- autonomyLevel (string): "low" | "medium" | "high". Defaults to "high" for autonomous work.
- reasoningEffort (string): "off" | "low" | "medium" | "high". Sets thinking depth.
- cwd (string, optional): working directory for the droid process
- instructionsFilePath (string, optional): path to an AGENTS.md / instructions file
- promptTemplate (string, optional): template for the run prompt
- command (string, optional): override the droid command path (default: "droid")
- extraArgs (string[], optional): additional CLI args passed verbatim
- env (object, optional): KEY=VALUE environment variable overrides

Custom model (BYOK) setup:
  Add a model entry to ~/.factory/settings.json:
  {
    "models": {
      "my-llm": {
        "provider": "openai",
        "baseUrl": "https://my-endpoint.example.com/v1",
        "apiKey": "sk-...",
        "model": "my-model-name"
      }
    }
  }
  Then set adapterConfig.model = "custom:my-llm"

Operational fields:
- timeoutSec (number, optional): run timeout in seconds (0 = no timeout)
- graceSec (number, optional): SIGTERM grace period in seconds

Notes:
- Executes: droid exec --auto <level> -m <model> -o json [--session <id>] "<prompt>"
- Sessions are resumed with --session when stored session cwd matches current cwd.
- Use --skip-permissions-unsafe (via extraArgs) in fully locked-down CI environments.
`;
