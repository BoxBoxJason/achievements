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
    <div className="achievements-profile w-9/10 mx-auto flex flex-col gap-2.5">
      <h2 className="m-0 p-0 text-3xl"
        style={{
          fontFamily: webview.fonts.HEADER_FONT,
        }}>{username}</h2>
      <div className="achievement-progress">
        <div className="progress-text-wrapper flex justify-between items-center uppercase">
          <span>{achievedCount} of {totalAchievements} achievements earned</span>
          <span>({(totalAchievements === 0 ? 100 : (achievedCount / totalAchievements) * 100).toFixed(2)}%)</span>
        </div>
        <div className="progress-bar-wrapper w-full h-2.5 rounded-sm bg-background-gray">
          <div
            className="progress-bar rounded-sm h-2.5 bg-completion-blue"
            style={{
              width: `${totalAchievements === 0 ? 100 : (achievedCount / totalAchievements) * 100}%`,
            }}
          ></div>
        </div>
      </div>
      <div className="profile-stats flex gap-2.5 justify-between items-center">
        <ProfileBox value={totalExp.toString()} label="XP" />
        <ProfileBox value={`${((timeSpent[queries.criteria.TWO_WEEKS_TIME_SPENT] || 0) / 3600).toFixed(1)}h`} label="Past 2 weeks" />
        <ProfileBox value={`${((timeSpent[queries.criteria.MONTHLY_TIME_SPENT] || 0) / 3600).toFixed(1)}h`} label="This Month" />
        <ProfileBox value={`${((timeSpent[queries.criteria.YEARLY_TIME_SPENT] || 0) / 3600).toFixed(1)}h`} label="This Year" />
        <ProfileBox value={`${((timeSpent[queries.criteria.TOTAL_TIME_SPENT] || 0) / 3600).toFixed(1)}h`} label="Total" />
      </div>
    </div>
  );

}

const ProfileBox: React.FC<{ value: string, label: string }> = ({ value, label }) => {
  return (
    <div className="profile-box text-center flex flex-col items-center justify-center w-fit max-w-25 py-1.5 px-2.5 rounded-md flex-1 bg-background-gray">
      <span className="text-xl font-sans">{value}</span>
      <span className="text-sm font-sans">{label}</span>
    </div>
  );
}

export default UserStats;
