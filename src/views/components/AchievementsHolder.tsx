import { useState, useEffect } from 'react';
import Achievement from '../../database/model/tables/Achievement';
import AchievementDisplay from './AchievementDisplay';
import { PostMessage } from '../icons';
import { webview } from '../viewconst';

interface AchievementHolderProps {
  filters: Record<string, any>;
  limit: number;
}

const AchievementHolder: React.FC<AchievementHolderProps> = ({ filters, limit }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [offset, setOffset] = useState(0);
  const [maxCount, setMaxCount] = useState(0);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    (window as any).vscode.postMessage(
      JSON.stringify({
        command: webview.commands.RETRIEVE_ACHIEVEMENTS,
        data: { count: true, offset, limit, ...filters },
      })
    );
  }, [offset, filters, limit]);

  const handleMessage = (event: MessageEvent) => {
    try {
      const data: PostMessage = event.data;

      if (data.command === webview.commands.DISPLAY_ACHIEVEMENTS) {
        setAchievements(data.data.achievements);
        setMaxCount(data.data.count);
      }
    } catch (e) {
      console.error('Invalid message data:', e);
    }
  };

  const handleNext = () => {
    if (offset + limit < maxCount) {
      setOffset((prevOffset) => prevOffset + limit);
    }
  };

  const handlePrevious = () => {
    if (offset > 0) {
      setOffset((prevOffset) => prevOffset - limit);
    }
  };

  return (
    <div className="achievement-holder flex flex-col items-center gap-2.5 w-full py-2.5 px-0">
      {achievements.map((achievement, index) => (
        <AchievementDisplay
          key={index}
          icon={achievement.icon}
          title={achievement.title}
          description={achievement.description}
          achieved={achievement.achieved}
          achievedAt={achievement.achievedAt}
          category={achievement.category}
          group={achievement.group}
          labels={achievement.labels}
          criteria={achievement.criteria}
          tier={achievement.tier}
          exp={achievement.exp}
          hidden={achievement.hidden}
          repeatable={achievement.repeatable}
          requires={achievement.requires}
        />
      ))}

      <div className='action-buttons flex flex-row items-center justify-center gap-0'>
        <button
          className={`page-switch-button page-switch-button-${offset === 0 ? "inactive" : "active"}`}
          onClick={handlePrevious}
          disabled={offset === 0}
        >
          &lt;
        </button>
        <button
          className={`page-switch-button page-switch-button-${offset + limit >= maxCount ? "inactive" : "active"}`}
          onClick={handleNext}
          disabled={offset + limit >= maxCount}
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default AchievementHolder;
