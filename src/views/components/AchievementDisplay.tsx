import * as React from 'react';
import { AchievementDict } from '../../database/model/tables/Achievement';
import { webview } from '../viewconst';

const AchievementDisplay: React.FC<AchievementDict> = (achievementDict: AchievementDict) => {

  const imageUris = (window as any).imageUris || {};

  const parseDateString = (dateString: string): string => {
    const splitDate = dateString.split('T');
    const date = splitDate[0];
    const time = splitDate[1].split('.')[0];
    return `${date} @${time}`;
  };

  return (
    <div className="achievement-display flex flex-row w-9/10 min-w-xs h-18 items-center my-1.5 p-1 bg-background-gray">
      {/* Icon */}
      <img className="achievement-icon w-18 h-18 mr-2.5 shrink-0 max-w-full max-h-full object-contain"
        src={imageUris[achievementDict.icon] || imageUris.PUSHEEN_ERROR}
        onError={(e) => {
          e.currentTarget.src = imageUris.PUSHEEN_ERROR
        }}
        alt={`${achievementDict.title} Icon`}
        style={{
          imageRendering: 'pixelated',
        }}
      />

      {/* Text Content */}
      <div className="achievement-body flex flex-row justify-between w-full py-2.5 px-1.5">
        <div className='achievement-body-text'>
          {/* Title */}
          <h3 className="font-bold w-fit p-0 mb-1.5 capitalize">
            {achievementDict.title}
          </h3>

          {/* Description */}
          <p className="achievement-description m-0 p-0">{achievementDict.description}</p>
        </div>

        {/* Status */}
        <span className={`achievement-status ${achievementDict.achieved ? 'text-text-gray' : 'text-text-red'}`}>
          {achievementDict.achieved && achievementDict.achievedAt
            ? `Unlocked: ${parseDateString(achievementDict.achievedAt as any) || 'Date not available'}`
            : 'Not Achieved'}
        </span>
      </div>
    </div>
  );
};

export default AchievementDisplay;
