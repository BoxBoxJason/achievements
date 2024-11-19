import { useState } from 'react';
import { TextField, PrimaryButton, Stack, Checkbox, DefaultButton } from '@fluentui/react';
import { webview } from '../viewconst';

const SearchBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterEnabled, setFilterEnabled] = useState(false);


  // Handle search button click or Enter key press
  const handleSearch = () => {
    (window as any).vscode.postMessage(JSON.stringify({ command: webview.commands.RETRIEVE_ACHIEVEMENTS, data: {} }), '*');
  };

  // Handle Enter key press
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Stack tokens={{ childrenGap: 10 }} className='SearchBar'>
      {/* Input Field */}
      <div className='search-bar centerer'>
        <TextField
          value={searchTerm}
          onChange={(e, newValue) => setSearchTerm(newValue || '')}
          onKeyUp={handleKeyPress}
          placeholder="Enter achievement name..."
          className='flex-grow'
        />
        {/* Search Button */}
        <PrimaryButton
          text="Search"
          style={{
            padding: '10px 20px',
          }}
          onClick={handleSearch} />
      </div>

      {/* Foldable Filters */}
      <DefaultButton className='centerer'
        text={showFilters ? 'Hide Filters' : 'Show Filters'}
        onClick={() => setShowFilters(prev => !prev)}
        style={{
          width: 'fit-content',
          padding: '10px 20px',
        }}
      />
      {showFilters && (
        <Stack tokens={{ childrenGap: 10 }}>
          <Checkbox
            label="Enable Filter"
            checked={filterEnabled}
            onChange={(e, checked) => setFilterEnabled(!!checked)}
          />
        </Stack>
      )}
    </Stack>
  );
};

export default SearchBar;
