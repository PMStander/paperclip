export const type = "opencode_local";
export const label = "OpenCode (local)";
export const DEFAULT_OPENCODE_LOCAL_MODEL = "gemini/gemini-2.5-flash";

export const models = [
  // Gemini models (via Google AI / gemini provider in opencode)
  { id: "gemini/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  // OpenRouter models (requires openrouter provider in ~/.opencode.json)
  { id: "openrouter/anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5 (OpenRouter)" },
  { id: "openrouter/anthropic/claude-opus-4-5", label: "Claude Opus 4.5 (OpenRouter)" },
  { id: "openrouter/google/gemini-2.5-pro", label: "Gemini 2.5 Pro (OpenRouter)" },
  { id: "openrouter/openai/gpt-4o", label: "GPT-4o (OpenRouter)" },
  // z.ai / zai-anthropic OpenAI-compatible endpoint
  { id: "zai-anthropic/glm-5", label: "GLM-5 (z.ai)" },
];

export const agentConfigurationDoc = `# opencode_local agent configuration

Adapter: opencode_local

Use when:
- You want Paperclip to run OpenCode locally as the agent runtime
- You want provider/model routing in OpenCode format (provider/model)
- You want OpenCode session resume across heartbeats via --session

Don't use when:
- You need webhook-style external invocation (use openclaw or http)
- You only need one-shot shell commands (use process)
- OpenCode CLI is not installed on the machine

Core fields:
- cwd (string, optional): default absolute working directory fallback for the agent process (created if missing when possible)
- instructionsFilePath (string, optional): absolute path to a markdown instructions file prepended to the run prompt
- model (string, optional): OpenCode model id in provider/model format (for example gemini/gemini-2.5-flash).
  Must match a provider configured in ~/.opencode.json. Defaults to ${DEFAULT_OPENCODE_LOCAL_MODEL}.
- variant (string, optional): provider-specific reasoning/profile variant passed as --variant
- promptTemplate (string, optional): run prompt template
- command (string, optional): defaults to "opencode"
- extraArgs (string[], optional): additional CLI args
- env (object, optional): KEY=VALUE environment variables

Operational fields:
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period in seconds

Notes:
- Runs are executed with: opencode run --format json ...
- Prompts are passed as the final positional message argument.
- Sessions are resumed with --session when stored session cwd matches current cwd.
- The model must be available in your ~/.opencode.json providers configuration.
  Run \`opencode models <provider>\` to list available models for a provider.
`;
