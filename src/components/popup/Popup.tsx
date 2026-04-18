import { useEffect, useState } from 'react';

import { STORAGE_KEY_SAVE_STATUS } from '../background/background';
import FolderPicker from './FolderPicker';
import { STORAGE_KEY_OBSIDIAN_API_KEY } from './Settings';

type Status =
  | { type: 'idle' }
  | { type: 'loading'; message: string }
  | { type: 'success'; filePath: string }
  | { type: 'error'; message: string };

const STORAGE_KEY_FOLDER = 'folderPath';

export default function Popup() {
  const [folderPath, setFolderPath] = useState('');
  const [obsidianApiKey, setObsidianApiKey] = useState('');
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  useEffect(() => {
    chrome.storage.local.get(
      [
        STORAGE_KEY_FOLDER,
        STORAGE_KEY_OBSIDIAN_API_KEY,
        STORAGE_KEY_SAVE_STATUS,
      ],
      (result: Record<string, unknown>) => {
        if (result[STORAGE_KEY_FOLDER])
          setFolderPath(result[STORAGE_KEY_FOLDER] as string);
        if (result[STORAGE_KEY_OBSIDIAN_API_KEY])
          setObsidianApiKey(result[STORAGE_KEY_OBSIDIAN_API_KEY] as string);
        // Only restore terminal states — never restore a stale loading state
        // from a previous interrupted run (e.g. service worker was terminated).
        const saved = result[STORAGE_KEY_SAVE_STATUS] as Status | undefined;
        if (saved && saved.type !== 'loading') setStatus(saved);
      }
    );

    // Keep status in sync while the popup is open
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      if (STORAGE_KEY_SAVE_STATUS in changes) {
        setStatus(changes[STORAGE_KEY_SAVE_STATUS].newValue as Status);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleFolderChange = (path: string) => {
    setFolderPath(path);
    chrome.storage.local.set({ [STORAGE_KEY_FOLDER]: path });
  };

  const handleSaveNote = async () => {
    if (!folderPath.trim()) {
      setStatus({ type: 'error', message: 'Pick an Obsidian folder first.' });
      return;
    }

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      setStatus({ type: 'error', message: 'No active tab found.' });
      return;
    }

    // Fire-and-forget: background handles the full flow and writes status to
    // storage, so it continues even if the popup is closed.
    chrome.runtime.sendMessage({
      type: 'SAVE_NOTE',
      tabId: tab.id,
      folderPath: folderPath.trim(),
      obsidianApiKey,
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <FolderPicker
        value={folderPath}
        onChange={handleFolderChange}
        obsidianApiKey={obsidianApiKey}
      />

      <button
        onClick={handleSaveNote}
        disabled={status.type === 'loading'}
        className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {status.type === 'loading' ? status.message : 'Save Note'}
      </button>

      {status.type === 'success' && (
        <p className="text-xs text-green-700">
          Saved to <span className="font-mono">{status.filePath}</span>
        </p>
      )}
      {status.type === 'error' && (
        <p className="text-xs text-red-700">{status.message}</p>
      )}
    </div>
  );
}
