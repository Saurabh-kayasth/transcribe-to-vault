import { useEffect, useState } from 'react';

import {
  DEFAULT_LLM_CONFIG,
  DEFAULT_PROMPT,
  type LLMConfig,
  type LLMProvider,
  PROVIDER_DEFAULTS,
  STORAGE_KEY_LLM,
  STORAGE_KEY_PROMPT,
} from '~/lib/llm';

export const STORAGE_KEY_OBSIDIAN_API_KEY = 'obsidianApiKey';

const PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: 'ollama', label: 'Ollama (local)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'anthropic', label: 'Anthropic Claude' },
];

export default function Settings() {
  const [config, setConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG);
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_PROMPT);
  const [obsidianApiKey, setObsidianApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(
      [STORAGE_KEY_LLM, STORAGE_KEY_PROMPT, STORAGE_KEY_OBSIDIAN_API_KEY],
      (result: Record<string, unknown>) => {
        const stored = result[STORAGE_KEY_LLM] as LLMConfig | undefined;
        if (stored) setConfig(stored);
        const storedPrompt = result[STORAGE_KEY_PROMPT] as string | undefined;
        if (storedPrompt) setPromptTemplate(storedPrompt);
        const storedKey = result[STORAGE_KEY_OBSIDIAN_API_KEY] as
          | string
          | undefined;
        if (storedKey) setObsidianApiKey(storedKey);
      }
    );
  }, []);

  const handleProviderChange = (provider: LLMProvider) => {
    const defaults = PROVIDER_DEFAULTS[provider];
    setConfig((prev) => ({
      ...defaults,
      apiKey: provider === 'ollama' ? undefined : prev.apiKey,
    }));
    setSaved(false);
  };

  const handleField = (field: keyof LLMConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    chrome.storage.local.set(
      {
        [STORAGE_KEY_LLM]: config,
        [STORAGE_KEY_PROMPT]: promptTemplate,
        [STORAGE_KEY_OBSIDIAN_API_KEY]: obsidianApiKey,
      },
      () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    );
  };

  const needsApiKey = config.provider !== 'ollama';

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-base font-semibold">Settings</h2>

      {/* Provider */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Provider</span>
        <select
          value={config.provider}
          onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {/* Base URL */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Base URL</span>
        <input
          type="text"
          value={config.baseUrl}
          onChange={(e) => handleField('baseUrl', e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 font-mono text-xs"
        />
      </label>

      {/* Model */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Model</span>
        <input
          type="text"
          value={config.model}
          onChange={(e) => handleField('model', e.target.value)}
          placeholder="e.g. llama3, gpt-4o-mini"
          className="rounded border border-gray-300 px-2 py-1 font-mono text-xs"
        />
      </label>

      {/* API Key — hidden for Ollama */}
      {needsApiKey && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">API Key</span>
          <input
            type="password"
            value={config.apiKey ?? ''}
            onChange={(e) => handleField('apiKey', e.target.value)}
            placeholder="Paste your API key"
            className="rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </label>
      )}

      {config.provider === 'ollama' && (
        <p className="text-xs text-gray-400">
          Run Ollama with{' '}
          <span className="font-mono">OLLAMA_ORIGINS="*" ollama serve</span>
        </p>
      )}

      {/* Obsidian API key */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">
          Obsidian Local REST API key
        </span>
        <input
          type="password"
          value={obsidianApiKey}
          onChange={(e) => {
            setObsidianApiKey(e.target.value);
            setSaved(false);
          }}
          placeholder="Paste API key from Obsidian plugin"
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>

      {/* Prompt template */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            Prompt template
          </span>
          <button
            onClick={() => setPromptTemplate(DEFAULT_PROMPT)}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            Reset
          </button>
        </div>
        <textarea
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          rows={8}
          className="rounded border border-gray-300 px-2 py-1 font-mono text-xs leading-relaxed"
        />
        <p className="text-xs text-gray-400">
          Use <span className="font-mono">{'{title}'}</span> and{' '}
          <span className="font-mono">{'{transcript}'}</span> as placeholders.
        </p>
      </div>

      <button
        onClick={handleSave}
        className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white"
      >
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
