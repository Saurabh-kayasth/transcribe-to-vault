export type LLMProvider = 'ollama' | 'openai' | 'gemini' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export const PROVIDER_DEFAULTS: Record<
  LLMProvider,
  Omit<LLMConfig, 'apiKey'>
> = {
  ollama: {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama3',
  },
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o-mini',
  },
  gemini: {
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-1.5-flash',
  },
  anthropic: {
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-haiku-4-5-20251001',
  },
};

export const DEFAULT_LLM_CONFIG: LLMConfig = { ...PROVIDER_DEFAULTS.ollama };

export const STORAGE_KEY_LLM = 'llmConfig';
export const STORAGE_KEY_PROMPT = 'promptTemplate';

export const DEFAULT_PROMPT =
  `Summarize this Udemy lecture in structured Markdown with:
- A brief overview (2-3 sentences)
- Key concepts (bullet points)
- Important takeaways

Lecture title: {title}
Transcript:
{transcript}`.trim();

function buildPrompt(
  title: string,
  transcript: string,
  template: string
): string {
  return template.replace('{title}', title).replace('{transcript}', transcript);
}

async function readErrorText(res: Response, provider: string): Promise<string> {
  const body = await res.text().catch(() => '');
  return `${provider} error ${res.status}: ${body}`;
}

async function callOllama(
  title: string,
  transcript: string,
  config: LLMConfig,
  template: string
): Promise<string> {
  const res = await fetch(`${config.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      prompt: buildPrompt(title, transcript, template),
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(await readErrorText(res, 'Ollama'));
  const data = (await res.json()) as { response?: string };
  return data.response ?? '';
}

async function callOpenAI(
  title: string,
  transcript: string,
  config: LLMConfig,
  template: string
): Promise<string> {
  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey ?? ''}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'user', content: buildPrompt(title, transcript, template) },
      ],
    }),
  });
  if (!res.ok) throw new Error(await readErrorText(res, 'OpenAI'));
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGemini(
  title: string,
  transcript: string,
  config: LLMConfig,
  template: string
): Promise<string> {
  const url = `${config.baseUrl}/v1beta/models/${config.model}:generateContent?key=${config.apiKey ?? ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: buildPrompt(title, transcript, template) }] },
      ],
    }),
  });
  if (!res.ok) throw new Error(await readErrorText(res, 'Gemini'));
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callAnthropic(
  title: string,
  transcript: string,
  config: LLMConfig,
  template: string
): Promise<string> {
  const res = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      messages: [
        { role: 'user', content: buildPrompt(title, transcript, template) },
      ],
    }),
  });
  if (!res.ok) throw new Error(await readErrorText(res, 'Anthropic'));
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  return data.content?.find((c) => c.type === 'text')?.text ?? '';
}

export async function summarize(
  title: string,
  transcript: string,
  config: LLMConfig,
  promptTemplate: string = DEFAULT_PROMPT
): Promise<string> {
  switch (config.provider) {
    case 'ollama':
      return callOllama(title, transcript, config, promptTemplate);
    case 'openai':
      return callOpenAI(title, transcript, config, promptTemplate);
    case 'gemini':
      return callGemini(title, transcript, config, promptTemplate);
    case 'anthropic':
      return callAnthropic(title, transcript, config, promptTemplate);
  }
}
