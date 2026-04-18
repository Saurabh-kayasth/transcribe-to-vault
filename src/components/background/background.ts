import {
  DEFAULT_LLM_CONFIG,
  DEFAULT_PROMPT,
  type LLMConfig,
  STORAGE_KEY_LLM,
  STORAGE_KEY_PROMPT,
  summarize,
} from '~/lib/llm';

const OBSIDIAN_BASE_URL = 'http://localhost:27123';

console.log('BACKGROUND LOADED');

function loadSettings(): Promise<{
  config: LLMConfig;
  promptTemplate: string;
}> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [STORAGE_KEY_LLM, STORAGE_KEY_PROMPT],
      (result: Record<string, unknown>) => {
        resolve({
          config:
            (result[STORAGE_KEY_LLM] as LLMConfig | undefined) ??
            DEFAULT_LLM_CONFIG,
          promptTemplate:
            (result[STORAGE_KEY_PROMPT] as string | undefined) ??
            DEFAULT_PROMPT,
        });
      }
    );
  });
}

export const STORAGE_KEY_SAVE_STATUS = 'lastSaveStatus';

type SaveStatus =
  | { type: 'loading'; message: string }
  | { type: 'success'; filePath: string }
  | { type: 'error'; message: string };

function setSaveStatus(status: SaveStatus) {
  chrome.storage.local.set({ [STORAGE_KEY_SAVE_STATUS]: status });
}

function buildNoteContent(title: string, summary: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `# ${title}\n\n> Saved on ${date}\n\n## Summary\n\n${summary}\n`;
}

chrome.runtime.onMessage.addListener(
  (
    msg: {
      type: string;
      tabId?: number;
      content?: string;
      filename?: string;
      // SAVE_NOTE fields
      folderPath?: string;
      obsidianApiKey?: string;
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _sender: object,
    sendResponse: (response?: unknown) => void
  ) => {
    console.log(msg);

    if (msg.type === 'DOWNLOAD') {
      const blob = new Blob([msg.content ?? ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url,
        filename: msg.filename ?? 'notes.txt',
      });
      return false;
    }

    if (msg.type === 'SAVE_NOTE' && msg.tabId != null) {
      const { tabId, folderPath = '', obsidianApiKey = '' } = msg;

      setSaveStatus({ type: 'loading', message: 'Getting transcript…' });
      sendResponse({ started: true });

      void (async () => {
        try {
          const contentResponse = await new Promise<
            { transcript?: string; title?: string } | undefined
          >((resolve) => {
            chrome.tabs.sendMessage(
              tabId,
              { type: 'GET_TRANSCRIPT_TEXT' },
              (res: { transcript?: string; title?: string } | undefined) => {
                if (chrome.runtime.lastError) resolve(undefined);
                else resolve(res);
              }
            );
          });

          if (!contentResponse) {
            setSaveStatus({
              type: 'error',
              message:
                'Open a Udemy lecture page first, then try again. (Content script not ready.)',
            });
            return;
          }

          const transcript = contentResponse.transcript ?? '';
          const title = contentResponse.title ?? 'lecture';

          if (!transcript.trim()) {
            setSaveStatus({
              type: 'error',
              message:
                'No transcript found. Make sure captions are visible on the lecture.',
            });
            return;
          }

          setSaveStatus({ type: 'loading', message: 'Summarising…' });

          const { config, promptTemplate } = await loadSettings();

          const summaryPromise = summarize(
            title,
            transcript,
            config,
            promptTemplate
          );
          // eslint-disable-next-line @typescript-eslint/naming-convention
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('LLM timed out after 2 minutes.')),
              120_000
            )
          );

          const summary = await Promise.race([summaryPromise, timeoutPromise]);

          if (!summary.trim()) {
            setSaveStatus({
              type: 'error',
              message: 'Got an empty summary. Try again.',
            });
            return;
          }

          setSaveStatus({ type: 'loading', message: 'Saving to Obsidian…' });

          const sanitizedTitle = title
            .replace(/[\\/:*?"<>|]/g, '')
            .trim()
            .slice(0, 200);

          const filePath = `${folderPath.replace(/\/$/, '')}/${sanitizedTitle}.md`;
          const encodedPath = filePath
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/');

          const headers: Record<string, string> = {
            'Content-Type': 'text/markdown',
          };
          if (obsidianApiKey) {
            headers['Authorization'] = `Bearer ${obsidianApiKey}`;
          }

          const res = await fetch(`${OBSIDIAN_BASE_URL}/vault/${encodedPath}`, {
            method: 'PUT',
            headers,
            body: buildNoteContent(title, summary),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Obsidian API error ${res.status}: ${text}`);
          }

          setSaveStatus({ type: 'success', filePath });
        } catch (err) {
          const e = err as Error;
          console.error('[SAVE_NOTE]', e);
          const isNetworkError =
            e.message?.includes('fetch') || e.name === 'TypeError';
          setSaveStatus({
            type: 'error',
            message: isNetworkError
              ? 'Cannot reach LLM or Obsidian. Check your settings.'
              : e.message,
          });
        }
      })();

      return true;
    }

    return false;
  }
);
