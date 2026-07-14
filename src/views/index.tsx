import { useState } from "react";
import { createRoot } from "react-dom/client";
import SearchBar from "./components/SearchBar";
import AchievementHolder from "./components/AchievementsHolder";
import UserStats from "./components/UserStats";

const App = () => {
  const imageUris =
    (window as Window & { imageUris?: Record<string, string> }).imageUris ||
    {};
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [limit, setLimit] = useState(50);

  return (
    <>
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
