// Content script only extracts transcript; background script does the Ollama fetch
// so localhost is reachable (content script fetch to localhost can fail).
// eslint-disable-next-line @typescript-eslint/naming-convention
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === 'GET_TRANSCRIPT_TEXT') {
    const transcript = getTranscript();
    const title = getLectureTitle();
    const resp = { transcript, title };
    sendResponse(resp);
    return false;
  }
});

function getTranscript(): string {
  const cues = document.querySelectorAll('[data-purpose="cue-text"]');
  return Array.from(cues)
    .map((el) => el.textContent)
    .join(' ');
}

function getLectureTitle(): string {
  // 1. Active item in the curriculum sidebar
  const sidebarSelectors = [
    '[data-purpose="curriculum-item-link--is-current"] [data-purpose="item-title"]',
    '[aria-current="true"] [data-purpose="item-title"]',
    '[aria-current="step"] [data-purpose="item-title"]',
    '.curriculum-item-link--is-current [data-purpose="item-title"]',
  ];
  for (const sel of sidebarSelectors) {
    const el = document.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text) return text;
  }

  // 2. document.title is usually "Lecture Name | Course Name | Udemy"
  const titleParts = document.title.split('|');
  if (titleParts.length >= 2) return titleParts[0].trim();

  // 3. Last resort
  return document.title.trim() || 'lecture';
}
