import { useState, useEffect } from 'react';
import { queries, webview } from '../viewconst';
import { PostMessage } from '../icons';

interface SearchBarProps {
  setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
}

const SearchBar: React.FC<SearchBarProps> = ({ setFilters, limit, setLimit }) => {
  const [partialTitle, setPartialTitle] = useState('');
  const [achievable, setAchievable] = useState<true | undefined>(true);
  const [achieved, setAchieved] = useState<true | undefined>(undefined);
  const [label, setLabel] = useState<string | undefined>(undefined);
  const [sortCriteria, setSortCriteria] = useState<string | undefined>('achieved');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(true);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    (window as any).vscode.postMessage(
      JSON.stringify({
        command: webview.commands.RETRIEVE_ACHIEVEMENTS_FILTERS,
      })
    );

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    setFilters({
      title: partialTitle,
      achievable,
      achieved,
      labels: label ? [label] : undefined,
      limit,
      sortCriteria,
      sortDirection,
    });
  }, [partialTitle, achievable, achieved, label, limit, sortCriteria, sortDirection]);

  const handleMessage = (event: MessageEvent) => {
    try {
      const data: PostMessage = event.data;

      if (data.command === webview.commands.DISPLAY_ACHIEVEMENTS_FILTERS) {
        setAvailableLabels(data.data.labels);
      }
    } catch (e) {
      console.error('Invalid message data:', e);
    }
  };

  return (
    <div className="search-bar flex flex-col items-center justify-center max-w-full min-w-4/5 p-2.5">

      {showFilters && (
        <div className="filters-container flex flex-col items-center gap-2.5 justify-center">
          <input className="search-bar-input w-1/2 max-w-lg p-1.5 mb-1.5 min-w-38 rounded-xs border-none filter-input"
            type="text"
            value={partialTitle}
            onChange={(e) => setPartialTitle(e.target.value)}
            placeholder="Search"
          />
          <div className="filters-sub-container flex flex-row flex-wrap justify-between w-full">
            <div className="filter-field">
              <span className="mb-1.5">Achievable</span>
              <input
                className="filter-input"
                type="checkbox"
                checked={!!achievable}
                onChange={(e) => setAchievable(e.target.checked ? true : undefined)}
              />
            </div>

            <div className="filter-field">
              <span className="mb-1.5">Achieved</span>
              <input
                type="checkbox"
                className="filter-input"
                checked={!!achieved}
                onChange={(e) => setAchieved(e.target.checked ? true : undefined)}
              />
            </div>

            <div className="filter-field">
              <span className="mb-1.5">Label</span>
              <select
                className="filter-select"
                value={label || ''}
                onChange={(e) => setLabel(e.target.value || undefined)}
              >
                <option value="">Select Label</option>
                {availableLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <span className="mb-1.5" >Sort Criteria</span>
              <select
                className="filter-select"
                value={sortCriteria || ''}
                onChange={(e) => setSortCriteria(e.target.value || undefined)}
              >
                <option value="">Select Criteria</option>
                {queries.VALID_SORT_CRITERIA.map((criteria) => (
                  <option key={criteria} value={criteria}>
                    {criteria.replace(/"/g, '')}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <span className="m-1.5">Sort Direction</span>
              <div className="radio-container flex flex-col align-start">
                <label>
                  <input
                    className="filter-input"
                    type="radio"
                    name="sortDirection"
                    value="asc"
                    checked={sortDirection === 'asc'}
                    onChange={() => setSortDirection('asc')}
                  />
                  Ascending
                </label>
                <label>
                  <input
                    className="filter-input"
                    type="radio"
                    name="sortDirection"
                    value="desc"
                    checked={sortDirection === 'desc'}
                    onChange={() => setSortDirection('desc')}
                  />
                  Descending
                </label>
              </div>
            </div>

            <div className="filter-field">
              <span className="mb-1.5">Achievement per Page</span>
              <input
                type="number"
                value={limit}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(2000, Number(e.target.value)));
                  setLimit(value);
                }}
                min={1}
                max={2000}
                className="p-1.5 border-none rounded-xs filter-input" />
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowFilters((prev) => !prev)} className="w-fit py-1.5 px-5 border-none rounded-lg bg-white text-base text-black">
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
    </div>
  );
};

export default SearchBar;
