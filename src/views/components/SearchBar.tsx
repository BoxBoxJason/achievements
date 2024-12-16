import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { queries, webview } from '../viewconst';
import { PostMessage } from '../icons';

interface SearchBarProps {
  setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
}

const FilterField = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 5px;
`;

const StyledSelect = styled.select`
  background-color: ${webview.colors.FILTER_INPUT_GRAY};
  color: ${webview.colors.GRAY_TEXT};
  padding: 5px;
  border: none;
  border-radius: 2px;
  word-break: normal;
`;


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
    <div className='search-bar' style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      maxWidth: '100%',
      minWidth: '80%',
      justifyContent: 'center',
      paddingBottom: '10px',
      paddingTop: '10px',
    }}>

      {showFilters && (
        <div className='filters-container' style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          justifyContent: 'center',
        }}>
          <input className='search-bar-input' style={{
            backgroundColor: webview.colors.FILTER_INPUT_GRAY,
            color: webview.colors.GRAY_TEXT,
            padding: '5px',
            marginBottom: '5px',
            minWidth: '150px',
            width: '50%',
            maxWidth: '500px',
            border: 'none',
            borderRadius: '2px',
          }}
            type="text"
            value={partialTitle}
            onChange={(e) => setPartialTitle(e.target.value)}
            placeholder="Search"
          />
          <div className='filters-sub-container' style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            width: '100%',
          }}>
            <FilterField>
              <span style={{
                marginBottom: '5px',
              }}>Achievable</span>
              <input
                type="checkbox"
                checked={!!achievable}
                onChange={(e) => setAchievable(e.target.checked ? true : undefined)}
                style={{
                  backgroundColor: webview.colors.FILTER_INPUT_GRAY,
                  color: webview.colors.GRAY_TEXT,
                }}
              />
            </FilterField>

            <FilterField>
              <span style={{
                marginBottom: '5px',
              }}>Achieved</span>
              <input
                type="checkbox"
                checked={!!achieved}
                onChange={(e) => setAchieved(e.target.checked ? true : undefined)}
                style={{
                  backgroundColor: webview.colors.FILTER_INPUT_GRAY,
                  color: webview.colors.GRAY_TEXT,
                }}
              />
            </FilterField>

            <FilterField>
              <span style={{
                marginBottom: '5px',
              }}>Label</span>
              <StyledSelect
                value={label || ''}
                onChange={(e) => setLabel(e.target.value || undefined)}
              >
                <option value="">Select Label</option>
                {availableLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </StyledSelect>
            </FilterField>

            <FilterField>
              <span style={{
                marginBottom: '5px',
              }}>Sort Criteria</span>
              <StyledSelect
                value={sortCriteria || ''}
                onChange={(e) => setSortCriteria(e.target.value || undefined)}
              >
                <option value="">Select Criteria</option>
                {queries.VALID_SORT_CRITERIA.map((criteria) => (
                  <option key={criteria} value={criteria}>
                    {criteria.replace(/"/g, '')}
                  </option>
                ))}
              </StyledSelect>
            </FilterField>

            <FilterField>
              <span style={{
                marginBottom: '5px',
              }}>Sort Direction</span>
              <div className='radio-container' style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}>
                <label>
                  <input
                    type="radio"
                    name="sortDirection"
                    value="asc"
                    checked={sortDirection === 'asc'}
                    onChange={() => setSortDirection('asc')}
                    style={{
                      backgroundColor: webview.colors.FILTER_INPUT_GRAY,
                      color: webview.colors.GRAY_TEXT,
                    }}
                  />
                  Ascending
                </label>
                <label>
                  <input
                    type="radio"
                    name="sortDirection"
                    value="desc"
                    checked={sortDirection === 'desc'}
                    onChange={() => setSortDirection('desc')}
                    style={{
                      backgroundColor: webview.colors.FILTER_INPUT_GRAY,
                      color: webview.colors.GRAY_TEXT,
                    }}
                  />
                  Descending
                </label>
              </div>
            </FilterField>

            <FilterField>
              <span style={{
                marginBottom: '5px',
              }}>Achievement per Page</span>
              <input
                type="number"
                value={limit}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(2000, Number(e.target.value)));
                  setLimit(value);
                }}
                min={1}
                max={2000}
                style={{
                  backgroundColor: webview.colors.FILTER_INPUT_GRAY,
                  color: webview.colors.GRAY_TEXT,
                  padding: '5px',
                  border: 'none',
                  borderRadius: '2px',
                }}
              />
            </FilterField>
          </div>
        </div>
      )}

      <button onClick={() => setShowFilters((prev) => !prev)} style={{
        width: 'fit-content',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '2px',
      }}>
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
    </div>
  );
};

export default SearchBar;
