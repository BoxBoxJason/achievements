import { useState, useEffect } from 'react';
import { PrimaryButton, Stack } from '@fluentui/react';
import Achievement from '../../database/model/tables/Achievement';
import AchievementDisplay from './AchievementDisplay';
import { PostMessage } from '../request';
import { webview } from '../viewconst';

const AchievementHolder: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [offset, setOffset] = useState(0);
  const limit = 50; // Maximum number of items per page (modifiable)
  const [maxCount, setMaxCount] = useState(0);

  // Event listener for messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data : PostMessage = JSON.parse(event.data);
        if (data.command === webview.commands.DISPLAY_ACHIEVEMENTS) {
          setAchievements(data.data);
        }
      } catch (e) {
        console.error('Invalid message data:', e);
      }
    };

    window.addEventListener('message', handleMessage);

    (window as any).vscode.postMessage(JSON.stringify({ command: webview.commands.RETRIEVE_ACHIEVEMENTS, data: { 'offset': offset, 'limit': limit } }), '*');

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('message', handleMessage);
    };

  }, []);

  // Handlers for navigation
  const handleNext = () => {
    if (offset + limit < maxCount) {
      setOffset(prevOffset => prevOffset + limit);
    }
  };

  const handlePrevious = () => {
    if (offset > 0) {
      setOffset(prevOffset => prevOffset - limit);
    }
  };

  return (
    <div className='achievements-holder'>
      <Stack className='centerer' tokens={{ childrenGap: 10 }}>
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
            points={achievement.points}
            hidden={achievement.hidden}
            repeatable={achievement.repeatable}
            requires={achievement.requires}
          />
        ))}
      </Stack>

      {/* Navigation Buttons */}
      <Stack className='centerer' horizontal tokens={{ childrenGap: 10 }}>
        <PrimaryButton
          text="Previous"
          onClick={handlePrevious}
          disabled={offset === 0}
        />
        <PrimaryButton
          text="Next"
          onClick={handleNext}
          disabled={offset + limit >= maxCount}
        />
      </Stack>
    </div>
  );
};

export default AchievementHolder;
