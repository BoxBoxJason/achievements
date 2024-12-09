import { useState, useEffect } from 'react';
import styled from 'styled-components';
import Achievement from '../../database/model/tables/Achievement';
import AchievementDisplay from './AchievementDisplay';
import { PostMessage } from '../request';
import { webview } from '../viewconst';

interface AchievementHolderProps {
  filters: Record<string, any>;
  limit: number;
}

const StyledButton = styled.button<{ disabled?: boolean }>`
  font-size: 3rem;
  border: none;
  background: none;
  border-radius: 5px;
  margin: 0 5px;
  padding: 0 5px;
  color: ${(props) => (props.disabled ? '#7d7d7d' : '#ffffff')};
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  &:hover {
    background-color: ${(props) => (!props.disabled ? webview.colors.FILTER_INPUT_GRAY : 'none')};
  }
`;

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
    <div className='achievement-holder' style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      width: '100%',
      padding: '10px 0',
    }}>
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

      <div className='action-buttons'>
        <StyledButton
          onClick={handlePrevious}
          disabled={offset === 0}
        >
          &lt;
        </StyledButton>
        <StyledButton
          onClick={handleNext}
          disabled={offset + limit >= maxCount}
        >
          &gt;
        </StyledButton>
      </div>
    </div>
  );
};

export default AchievementHolder;
