import React, { useState, useEffect } from 'react';
import { queries, webview } from '../viewconst';
import { PostMessage } from '../icons';

const UserStats: React.FC = () => {
  const [username, setUsername] = useState(webview.DEFAULT_USER);
  const [totalAchievements, setTotalAchievements] = useState(0);
  const [totalExp, setTotalExp] = useState(0);
  const [achievedCount, setAchievedCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState({
    [queries.criteria.DAILY_TIME_SPENT]: 0,
    [queries.criteria.TWO_WEEKS_TIME_SPENT]: 0,
    [queries.criteria.MONTHLY_TIME_SPENT]: 0,
    [queries.criteria.YEARLY_TIME_SPENT]: 0,
    [queries.criteria.TOTAL_TIME_SPENT]: 0,
  });

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    (window as any).vscode.postMessage(
      JSON.stringify({
        command: webview.commands.RETRIEVE_PROFILE,
      })
    );

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  });

  const handleMessage = (message: MessageEvent) => {
    try {
      const data: PostMessage = message.data;
      if (data.command === webview.commands.SET_PROFILE) {
        setUsername(data.data.username);
        setTotalAchievements(data.data.totalAchievements);
        setTotalExp(data.data.totalExp);
        setAchievedCount(data.data.achievedCount);
        setTimeSpent(data.data.timeSpent);
      }
    } catch (error) {
      console.error('Failed to parse message data: ' + error);
    }
  }

  return (
    <div className="achievements-profile" style={{
      width: '90%',
      margin: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <h2 style={{
        fontFamily: webview.fonts.HEADER_FONT,
        fontSize: '1.7rem',
        margin: '0',
        padding: '0',
      }}>{username}</h2>
      <div className="achievement-progress" style={{
      }}>
        <div className='progress-text-wrapper' style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textTransform: 'uppercase',
        }}>
          <span>{achievedCount} of {totalAchievements} achievements earned</span>
          <span>({(totalAchievements === 0 ? 100 : (achievedCount / totalAchievements) * 100).toFixed(2)}%)</span>
        </div>
        <div className="progress-bar-wrapper" style={{
          width: '100%',
          backgroundColor: webview.colors.ACHIEVEMENT_BACKGROUND_GRAY,
          height: '10px',
          borderRadius: '3px',
        }}>
          <div
            className="progress-bar"
            style={{
              width: `${totalAchievements === 0 ? 100 : (achievedCount / totalAchievements) * 100}%`,
              backgroundColor: webview.colors.COMPLETION_LIGHT_BLUE,
              borderRadius: '3px',
              height: '10px',
            }}
          ></div>
        </div>
      </div>
      <div className="profile-stats" style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <ProfileBox value={totalExp.toString()} label="XP" />
        <ProfileBox value={`${((timeSpent[queries.criteria.TWO_WEEKS_TIME_SPENT] || 0) / 3600).toFixed(1)}h`} label="Past 2 weeks" />
        <ProfileBox value={`${((timeSpent[queries.criteria.MONTHLY_TIME_SPENT] || 0) / 3600).toFixed(1)}h`} label="This Month" />
        <ProfileBox value={`${((timeSpent[queries.criteria.YEARLY_TIME_SPENT] || 0)/ 3600).toFixed(1)}h`} label="This Year" />
        <ProfileBox value={`${((timeSpent[queries.criteria.TOTAL_TIME_SPENT] || 0) / 3600).toFixed(1)}h`} label="Total" />
      </div>
    </div>
  );

}

const ProfileBox: React.FC<{ value: string, label: string }> = ({ value, label }) => {
  return (
    <div className="profile-box" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: 'fit-content',
      maxWidth: '100px',
      padding: '5px 10px',
      backgroundColor: webview.colors.ACHIEVEMENT_BACKGROUND_GRAY,
      borderRadius: '5px',
    }}>
      <span style={{
        fontFamily: webview.fonts.HEADER_FONT,
        fontSize: '1.2rem',
      }}>{value}</span>
      <span style={{
        fontFamily: webview.fonts.HEADER_FONT,
        fontSize: '0.8rem',
      }}>{label}</span>
    </div>
  );
}


export default UserStats;
