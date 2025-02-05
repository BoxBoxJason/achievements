import { useState } from "react";
import { createRoot } from "react-dom/client";
import SearchBar from "./components/SearchBar";
import AchievementHolder from "./components/AchievementsHolder";
import UserStats from "./components/UserStats";

const App = () => {
  const imageUris = (window as any).imageUris || {};
  const [filters, setFilters] = useState({});
  const [limit, setLimit] = useState(50);

  return (
    <>
      <style>{`
        .blurry-background {
          background: conic-gradient(from 75deg,#333   15deg ,#000000 0 30deg ,#0000 0 180deg, #000000 0 195deg,#333 0 210deg,#0000 0) calc(0.5*100px) calc(0.5*100px/0.577),
            conic-gradient(#333   30deg ,#666 0 75deg, #333 0 90deg, #000000 0 105deg, #666 0 150deg, #000000 0 180deg,#666 0 210deg, #333 0 256deg, #000000 0 270deg,#333 0 286deg, #000000 0 331deg,#666 0);
          background-size: 100px calc(100px/0.577);
          filter: blur(20px);
          z-index: -1;
        }
        .blurry-background::after {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.1),
            rgba(0, 0, 0, 0.7)
          );
          opacity: 0.5;
          mix-blend-mode: overlay;
          animation: randomBlur 8s infinite alternate ease-in-out;
        }
        @keyframes randomBlur {
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
        }
      `}</style>

      {/* Use a plain div with the defined class */}
      <div className="blurry-background fixed top-0 left-0 w-screen h-screen overflow-hidden origin-center"></div>

      <div className="achievements-view z-10 gap-2.5 flex flex-col flex-wrap items-center justify-center p-[min(20px,2%)]">
        <div className="title-image flex items-center justify-center">
          {imageUris.PUSHEEN_TROPHY && (
            <img
              src={imageUris.PUSHEEN_TROPHY}
              alt="Pusheen Heart"
              className="mr-2.5 min-w-32 max-w-1/5"
              style={{ imageRendering: "pixelated" }}
            />
          )}
          <h1 className="w-fit ml-2.5 text-5xl tracking-[2px] font-bold font-sans">
            Achievements
          </h1>
        </div>

        <div className="profile-container w-4/5 min-w-sm max-w-5xl py-2.5 rounded-t-md bg-button-transparent-gray">
          <UserStats />
        </div>

        <div className="achievements-container w-4/5 min-w-sm max-w-5xl flex flex-col items-center justify-center gap-2.5 bg-background-dark-blue">
          {/* Search Bar */}
          <SearchBar
            setFilters={setFilters}
            limit={limit}
            setLimit={setLimit}
          />

          {/* Achievement Holder */}
          <AchievementHolder filters={filters} limit={limit} />
        </div>
      </div>
    </>
  );
};

const container = document.getElementById("achievement-view");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;
