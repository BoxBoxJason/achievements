import * as React from 'react';
import { AchievementDict } from '../../database/model/tables/Achievement';
import { webview } from '../viewconst';

const AchievementDisplay: React.FC<AchievementDict> = (achievementDict: AchievementDict) => {

  const imageUris = (window as any).imageUris || {}

  const parseDateString = (dateString: string): string => {
    const splitDate = dateString.split('T');
    const date = splitDate[0];
    const time = splitDate[1].split('.')[0];
    return `${date} @${time}`;
  };

  return (
    <div className='achievement-display' style={{
      display: 'flex',
      flexDirection: 'row',
      width: '90%',
      minWidth: '300px',
      height: '70px',
      alignItems: 'center',
      margin: '5px 0',
      padding: '3px',
      backgroundColor: webview.colors.ACHIEVEMENT_BACKGROUND_GRAY,
    }}
    >
      {/* Icon */}
      <img className='achievement-icon'
        src={achievementDict.icon}
        onError={(e) => {
          e.currentTarget.src = imageUris.PUSHEEN_ERROR
        }}
        alt={`${achievementDict.title} Icon`}
        style={{
          flexShrink: 0,
          width: '70px',
          height: '70px',
          marginRight: '10px',
          imageRendering: 'pixelated',
        }}
      />

      {/* Text Content */}
      <div className='achievement-body' style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        padding: '10px 5px',
      }}>
        <div className='achievement-body-text'>
          {/* Title */}
          <h3 style={{
            fontWeight: 'bold',
            width: 'fit-content',
            textTransform: 'capitalize',
            padding: 0,
            margin: '0 0 5px 0',
          }}>
            {achievementDict.title}
          </h3>

          {/* Description */}
          <p className='achievement-description' style={{
            margin: 0,
            padding: 0,
          }}>{achievementDict.description}</p>
        </div>

        {/* Status */}
        <span className='achievement-status' style={{
          color: achievementDict.achieved ? webview.colors.GRAY_TEXT : webview.colors.RED_TEXT,
        }}>
          {achievementDict.achieved && achievementDict.achievedAt
            ? `Unlocked: ${parseDateString(achievementDict.achievedAt as any) || 'Date not available'}`
            : 'Not Achieved'}
        </span>
      </div>
    </div>
  );
};

export default AchievementDisplay;
