import { useState, useEffect } from 'react';
import { webview } from '../viewconst';
import { PostMessage } from '../icons';

interface SearchBarProps {
  setFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
}

// Status filter of a tier chain, see AchievementChainStatus
const STATUS_OPTIONS: ReadonlyArray<{ value: string | undefined; label: string }> = [
  { value: undefined, label: 'All' },
  { value: 'unlocked', label: 'Unlocked' },
  { value: 'remaining', label: 'Remaining' },
  { value: 'completed', label: 'Completed' },
];

// Display names of queries.VALID_SORT_CRITERIA, sorting tier chains
const SORT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'achieved', label: 'Progress' },
  { value: 'achievedAt', label: 'Last unlocked' },
  { value: 'tier', label: 'Tiers unlocked' },
  { value: 'title', label: 'Title' },
  { value: 'category', label: 'Category' },
  { value: '"group"', label: 'Group' },
  { value: 'exp', label: 'XP' },
];

const SearchBar: React.FC<SearchBarProps> = ({ setFilters, limit, setLimit }) => {
  const [partialTitle, setPartialTitle] = useState('');
  const [debouncedTitle, setDebouncedTitle] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [label, setLabel] = useState<string | undefined>(undefined);
  const [sortCriteria, setSortCriteria] = useState('achieved');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data: PostMessage = event.data;

        if (data.command === webview.commands.DISPLAY_ACHIEVEMENTS_FILTERS) {
          const payload = data.data as { categories: string[]; labels: string[] };
          setAvailableCategories([...payload.categories].sort());
          setAvailableLabels([...payload.labels].sort());
        }
      } catch (e) {
        console.error('Invalid message data:', e);
      }
    };

    window.addEventListener('message', handleMessage);

    window.vscode.postMessage(
      JSON.stringify({
        command: webview.commands.RETRIEVE_ACHIEVEMENTS_FILTERS,
      })
    );

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    const debounceHandle = setTimeout(() => {
      setDebouncedTitle(partialTitle);
    }, 250);
    return () => clearTimeout(debounceHandle);
  }, [partialTitle]);

  useEffect(() => {
    setFilters({
      title: debouncedTitle,
      status,
      category,
      labels: label ? [label] : undefined,
      limit,
      sortCriteria,
      sortDirection,
    });
  }, [debouncedTitle, status, category, label, limit, sortCriteria, sortDirection, setFilters]);

  return (
    <div className="search-bar flex flex-col items-center justify-center max-w-full min-w-4/5 p-2.5">

      {showFilters && (
        <div className="filters-container flex flex-col items-center gap-2.5 justify-center w-full">
          <input className="search-bar-input w-1/2 max-w-lg p-1.5 mb-1.5 min-w-38 rounded-xs border-none filter-input"
            type="text"
            value={partialTitle}
            onChange={(e) => setPartialTitle(e.target.value)}
            placeholder="Search"
            aria-label="Search achievements by title"
          />

          <div className="status-filter flex flex-row rounded-sm overflow-hidden" role="group" aria-label="Status">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={status === option.value}
                onClick={() => setStatus(option.value)}
                className={`py-1 px-3 border-none cursor-pointer ${
                  status === option.value
                    ? 'bg-completion-blue text-white'
                    : 'bg-filter-gray text-text-gray hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="filters-sub-container flex flex-row flex-wrap justify-between w-full">
            <label className="filter-field">
              <span className="mb-1.5">Category</span>
              <select
                className="filter-select"
                value={category || ''}
                onChange={(e) => setCategory(e.target.value || undefined)}
              >
                <option value="">All categories</option>
                {availableCategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span className="mb-1.5">Label</span>
              <select
                className="filter-select"
                value={label || ''}
                onChange={(e) => setLabel(e.target.value || undefined)}
              >
                <option value="">All labels</option>
                {availableLabels.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="filter-field">
              <label htmlFor="achievements-sort" className="mb-1.5">Sort by</label>
              <div className="flex flex-row gap-1">
                <select
                  id="achievements-sort"
                  className="filter-select"
                  value={sortCriteria}
                  onChange={(e) => setSortCriteria(e.target.value)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="filter-select cursor-pointer hover:text-white"
                  onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  aria-label={sortDirection === 'asc' ? 'Ascending, switch to descending' : 'Descending, switch to ascending'}
                  title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            <label className="filter-field">
              <span className="mb-1.5">Per page</span>
              <input
                type="number"
                value={limit}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(2000, Number(e.target.value)));
                  setLimit(value);
                }}
                min={1}
                max={2000}
                className="w-20 p-1.5 border-none rounded-xs filter-input" />
            </label>
          </div>
        </div>
      )}

      <button onClick={() => setShowFilters((prev) => !prev)} className="w-fit mt-2.5 py-1.5 px-5 border-none rounded-lg bg-white text-base text-black">
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
    </div>
  );
};

export default SearchBar;
