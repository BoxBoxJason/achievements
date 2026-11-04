import type { AchievementRow } from "../../database/model/tables/Achievement";
import type { AchievementChainEntry } from "../../views/components/AchievementChainCard";

export function makeTier(id: number, overrides: Partial<AchievementRow> = {}): AchievementRow {
  return {
    id,
    title: `Tier ${id}`,
    chain: "Chain %d",
    icon: "TEST_ICON",
    category: "category",
    group: "group",
    labels: [],
    description: `Description of tier ${id}`,
    tier: id,
    exp: 10,
    hidden: false,
    achieved: false,
    achievedAt: null,
    repeatable: false,
    requirements: [],
    criteria: [],
    ...overrides,
  };
}

export function makeEntry(
  chain: string,
  overrides: Partial<AchievementChainEntry> = {},
): AchievementChainEntry {
  return {
    chain,
    tierCount: 1,
    achievedCount: 0,
    lastAchievedAt: null,
    progress: null,
    current: makeTier(1, { title: `${chain} title`, chain }),
    ...overrides,
  };
}
