import * as React from 'react';
import { Text, Image, Stack } from '@fluentui/react';
import { AchievementDict } from '../../database/model/tables/Achievement';

const AchievementDisplay: React.FC<AchievementDict> = (achievementDict : AchievementDict) => {
  return (
    <Stack
      horizontal
      tokens={{ childrenGap: 10 }}
      styles={{
        root: {
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          alignItems: 'center',
          marginBottom: '10px',
        },
      }}
    >
      {/* Icon */}
      <Image
        src={achievementDict.icon}
        alt={`${achievementDict.title} Icon`}
        width={40}
        height={40}
        styles={{ root: { flexShrink: 0 } }}
      />

      {/* Text Content */}
      <Stack>
        {/* Title */}
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 'bold' } }}>
          {achievementDict.title}
        </Text>

        {/* Description */}
        <Text variant="small">{achievementDict.description}</Text>

        {/* Status */}
        <Text variant="small" styles={{ root: { color: achievementDict.achieved ? 'green' : 'red' } }}>
          {achievementDict.achieved && achievementDict.achievedAt
            ? `Achieved on: ${achievementDict.achievedAt || 'Date not available'}`
            : 'Not Achieved'}
        </Text>
      </Stack>
    </Stack>
  );
};

export default AchievementDisplay;
