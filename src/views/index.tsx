import * as React from 'react';
import { createRoot } from 'react-dom/client';
import SearchBar from './components/SearchBar';
import AchievementHolder from './components/AchievementsHolder';
import { webview } from './viewconst';
import styled, { keyframes } from 'styled-components';


const randomBlur = keyframes`
  0% {
    transform: scale(1);
    filter: blur(5px);
  }
  50% {
    transform: scale(1.1);
    filter: blur(15px);
  }
  100% {
    transform: scale(1);
    filter: blur(5px);
  }
`;

const BlurryBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background:
      conic-gradient(from 75deg,#333   15deg ,#000000 0 30deg ,#0000 0 180deg, #000000 0 195deg,#333 0 210deg,#0000 0) calc(0.5*100px) calc(0.5*100px/0.577),
      conic-gradient(#333   30deg ,#666 0 75deg, #333 0 90deg, #000000 0 105deg, #666 0 150deg, #000000 0 180deg,#666 0 210deg, #333 0 256deg, #000000 0 270deg,#333 0 286deg, #000000 0 331deg,#666 0);
  background-size: 100px calc(100px/0.577);
  filter: blur(20px);
  overflow: hidden;
  transform-origin: center;
  z-index: -1;

  &::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.7));
    opacity: 0.5;
    mix-blend-mode: overlay;
    animation: ${randomBlur} 8s infinite alternate ease-in-out;
  }
}
`;
const App: React.FC = () => {
  const imageUris = (window as any).imageUris || {}

  // filters managing between search bar and achievements holder
  const [filters, setFilters] = React.useState<Record<string, any>>({});
  const [limit, setLimit] = React.useState(50);

  return (
    <>
    <BlurryBackground />
    <div className='achievements-view' style={{
      zIndex: 1,
      padding: 'min(20px,2%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      flexWrap: 'wrap',
    }}>
      <div className='title-image' style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {imageUris.PUSHEEN_TROPHY && (
          <img
            src={imageUris.PUSHEEN_TROPHY}
            alt="Pusheen Heart"
            style={{
              marginRight: 10,
              imageRendering: 'pixelated',
              width: 'min(120px, 20vw)',
              minWidth: 32,
            }}
          />
        )}
        <h1 style={{
          width: 'fit-content',
          marginLeft: '10px',
          fontSize: '3rem',
          fontFamily: 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
          letterSpacing: '2px',
          fontWeight: 'bolder',
        }}>Achievements</h1>

      </div>
      <div className='achievements-container' style={{
        backgroundColor: webview.colors.HOLDER_BACKGROUND_DARK_BLUE,
        width: '80%',
        minWidth: '400px',
        maxWidth: '1000px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}>
        {/* Search Bar */}
        <SearchBar
          setFilters={setFilters}
          limit={limit}
          setLimit={setLimit}
        />

        {/* Achievement Holder */}
        <AchievementHolder
          filters={filters}
          limit={limit}
        />
      </div>
    </div>
    </>
  );
};

const container = document.getElementById('achievement-view');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
