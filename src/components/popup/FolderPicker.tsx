import { useEffect, useRef, useState } from 'react';

const OBSIDIAN_BASE = 'http://localhost:27123';

interface Props {
  value: string;
  onChange: (path: string) => void;
  obsidianApiKey: string;
}

/**
 * Fetches the immediate children of a vault directory.
 * `dirPath` is vault-relative (empty string = root).
 * Returns subfolder names as full vault-relative paths.
 */
async function fetchDirContents(
  dirPath: string,
  apiKey: string
): Promise<string[]> {
  const encodedPath = dirPath.split('/').map(encodeURIComponent).join('/');

  const url = `${OBSIDIAN_BASE}/vault/${encodedPath}${encodedPath ? '/' : ''}`;
  const headers: Record<string, string> = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Obsidian API ${res.status}`);

  const data = (await res.json()) as { files?: string[] };
  const entries = data.files ?? [];

  // Entries ending with '/' are subdirectories.
  // The API may return vault-relative paths OR bare names — handle both.
  const subfolders: string[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('/')) continue;

    const stripped = entry.slice(0, -1); // remove trailing '/'
    // If the entry is already vault-relative (contains the parent path), use it.
    // Otherwise, construct the full path.
    if (dirPath && stripped.startsWith(dirPath + '/')) {
      subfolders.push(stripped);
    } else if (dirPath && !stripped.includes('/')) {
      subfolders.push(`${dirPath}/${stripped}`);
    } else {
      subfolders.push(stripped);
    }
  }

  return subfolders.sort((a, b) => a.localeCompare(b));
}

export default function FolderPicker({
  value,
  onChange,
  obsidianApiKey,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  // Cache: vault-relative path → sorted subfolder paths
  const [dirCache, setDirCache] = useState<Record<string, string[]>>({});
  const [browsePath, setBrowsePath] = useState('');
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const loadDir = async (path: string) => {
    if (dirCache[path] !== undefined) return; // already cached
    setLoadingPath(path);
    setFetchError('');
    try {
      const subfolders = await fetchDirContents(path, obsidianApiKey);
      setDirCache((prev) => ({ ...prev, [path]: subfolders }));
    } catch {
      setFetchError(
        'Cannot reach Obsidian. Is the Local REST API plugin running?'
      );
      setDirCache((prev) => ({ ...prev, [path]: [] }));
    } finally {
      setLoadingPath(null);
    }
  };

  const handleOpen = () => {
    const startPath = value.includes('/')
      ? value.split('/').slice(0, -1).join('/')
      : '';
    setIsOpen(true);
    setQuery('');
    setBrowsePath(startPath);
    loadDir(startPath);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
  };

  /** Navigate into a folder: select it and load its children. */
  const handleNavigate = (folder: string) => {
    onChange(folder);
    setBrowsePath(folder);
    setQuery('');
    loadDir(folder);
  };

  /** Breadcrumb navigation — walk up to segment at index (-1 = root). */
  const handleBreadcrumb = (index: number) => {
    const parts = browsePath.split('/');
    const target = index < 0 ? '' : parts.slice(0, index + 1).join('/');
    setBrowsePath(target);
    if (target) onChange(target);
    setQuery('');
    loadDir(target);
  };

  const isSearching = query.trim().length > 0;

  // All known folders = every value in the cache
  const allCachedFolders = [...new Set(Object.values(dirCache).flat())].sort();

  const visibleFolders = isSearching
    ? allCachedFolders.filter((f) =>
        f.toLowerCase().includes(query.toLowerCase())
      )
    : (dirCache[browsePath] ?? []);

  const isLoading = loadingPath === browsePath;
  const breadcrumbParts = browsePath ? browsePath.split('/') : [];

  /** True if we have cached children and there is at least one. */
  const hasCachedChildren = (folder: string) =>
    dirCache[folder] !== undefined && dirCache[folder].length > 0;

  /** Unknown = not yet fetched. */
  const childrenUnknown = (folder: string) => dirCache[folder] === undefined;

  return (
    <div ref={panelRef} className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">Obsidian folder</span>
      <p className="mb-1 text-xs opacity-50">
        Empty folders are not listed by Obsidian. Type the path directly in the
        field below instead.
      </p>
      <div className="flex gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Courses/React/Section 3"
          className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
        />
        <button
          onClick={isOpen ? handleClose : handleOpen}
          className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 active:bg-gray-100"
        >
          {isOpen ? '✕' : 'Browse'}
        </button>
      </div>

      {isOpen && (
        <div className="flex flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-md">
          {/* Breadcrumb */}
          {!isSearching && (
            <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 px-2 py-1 text-xs text-gray-500">
              <button
                onClick={() => handleBreadcrumb(-1)}
                className="hover:text-amber-700"
              >
                Vault
              </button>
              {breadcrumbParts.map((part, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  <span className="text-gray-300">/</span>
                  <button
                    onClick={() => handleBreadcrumb(i)}
                    className="max-w-20 truncate hover:text-amber-700"
                  >
                    {part}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isSearching
                ? 'Searching loaded folders…'
                : 'Search or navigate below…'
            }
            autoFocus
            className="border-b border-gray-200 px-2 py-1.5 text-xs outline-none"
          />

          {/* Folder list */}
          <div className="max-h-44 overflow-y-auto">
            {isLoading && (
              <p className="px-3 py-2 text-xs text-gray-400">Loading…</p>
            )}
            {!isLoading && fetchError && (
              <p className="px-3 py-2 text-xs text-red-600">{fetchError}</p>
            )}
            {!isLoading && !fetchError && visibleFolders.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">
                {isSearching ? 'No folders match.' : 'No subfolders here.'}
              </p>
            )}

            {/* Up row */}
            {!isLoading && !fetchError && !isSearching && browsePath && (
              <button
                onClick={() => handleBreadcrumb(breadcrumbParts.length - 2)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-50"
              >
                <span>↑</span>
                <span>Up</span>
              </button>
            )}

            {!isLoading &&
              !fetchError &&
              visibleFolders.map((folder) => {
                const label = isSearching
                  ? folder
                  : (folder.split('/').pop() ?? folder);
                const isSelected = folder === value;
                // Show ▸ if it has children or children are unknown (not yet fetched)
                const expandable =
                  hasCachedChildren(folder) || childrenUnknown(folder);

                return (
                  <button
                    key={folder}
                    onClick={() => handleNavigate(folder)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-amber-50 ${
                      isSelected
                        ? 'bg-amber-50 font-semibold text-amber-800'
                        : 'text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="shrink-0 text-gray-400">
                        {expandable ? '▸' : '·'}
                      </span>
                      <span className="truncate">{label}</span>
                    </span>
                    {isSelected && (
                      <span className="ml-2 shrink-0 text-amber-600">✓</span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
