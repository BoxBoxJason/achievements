import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Image } from '@fluentui/react';
import SearchBar from './components/SearchBar';
import AchievementHolder from './components/AchievementsHolder';

const App: React.FC = () => {

  const imageUris = (window as any).imageUris || {}

  return (
    <div className='achievements-view'>
      <div className='title-image centerer'>
        {imageUris.PUSHEEN_TROPHY && (
          <Image
            src={imageUris.PUSHEEN_TROPHY}
            alt="Pusheen Heart"
            width={'min(120px, 20vw)'}
            min-width={32}
            styles={{
              root: { marginRight: 10 },
              image: { imageRendering: 'pixelated' },
            }}
          />
        )}
        <h1>Achievements</h1>
      </div>
      {/* Search Bar */}
      <SearchBar />

      {/* Achievement Holder */}
      <AchievementHolder />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
