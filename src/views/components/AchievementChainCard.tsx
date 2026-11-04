import { useEffect, useRef, useState } from 'react';
import type {
  AchievementChainRow,
  AchievementRow,
} from '../../database/model/tables/Achievement';
import { PostMessage } from '../icons';
import { webview } from '../viewconst';
import { formatUnlockDate } from '../format';

// A tier chain as sent by the extension, with the completion ratio of its
// current tier (null once every tier is achieved)
export type AchievementChainEntry = AchievementChainRow & {
  progress: number | null;
};

// Above this many tiers, one pip per tier no longer fits on a card
const MAX_TIER_PIPS = 20;

const getImageUris = (): Record<string, string> => window.imageUris || {};

const AchievementIcon: React.FC<{ icon: string; title: string; className: string }> = ({
  icon,
  title,
  className,
}) => {
  const imageUris = getImageUris();
  return (
    <img
      className={`shrink-0 object-contain ${className}`}
      src={imageUris[icon] || imageUris.PUSHEEN_ERROR}
      onError={(e) => {
        e.currentTarget.src = getImageUris().PUSHEEN_ERROR;
      }}
      alt={`${title} Icon`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

const TierPips: React.FC<{ achievedCount: number; tierCount: number }> = ({
  achievedCount,
  tierCount,
}) => (
  <div className="tier-pips flex flex-row flex-wrap gap-1" aria-hidden="true">
    {Array.from({ length: tierCount }, (_, i) => (
      <span
        key={i}
        className={`w-2 h-2 rounded-full ${
          i < achievedCount
            ? 'bg-completion-blue'
            : i === achievedCount
              ? 'border border-completion-blue'
              : 'bg-text-gray/30'
        }`}
      />
    ))}
  </div>
);

const ProgressBar: React.FC<{ ratio: number; label: string }> = ({ ratio, label }) => {
  const percent = Math.floor(ratio * 100);
  return (
    <div className="tier-progress flex flex-row items-center gap-2.5 text-sm text-text-gray">
      <div
        className="w-full max-w-60 h-1.5 rounded-sm bg-text-gray/30"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-1.5 rounded-sm bg-completion-blue"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="whitespace-nowrap">
        {label}: {percent}%
      </span>
    </div>
  );
};

const TierList: React.FC<{ tiers: AchievementRow[] | null; currentId: number }> = ({
  tiers,
  currentId,
}) => {
  const listRef = useRef<HTMLOListElement>(null);

  // Long chains: start the list at the tier currently worked on, keeping
  // the last unlocked ones in view above it
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[data-current="true"]');
    if (list && current) {
      list.scrollTop = Math.max(0, current.offsetTop - list.clientHeight / 3);
    }
  }, [tiers]);

  if (tiers === null) {
    return <p className="m-0 px-2.5 pb-2.5 text-sm text-text-gray">Loading tiers…</p>;
  }

  return (
    <ol
      ref={listRef}
      className="tier-list relative flex flex-col gap-1 m-0 px-2.5 pb-2.5 max-h-72 overflow-y-auto list-none"
    >
      {tiers.map((tier, index) => {
        const isCurrent = tier.id === currentId;
        return (
          <li
            key={tier.id}
            data-current={isCurrent}
            className={`flex flex-row items-center gap-2.5 py-1 px-2 bg-background-dark-blue border-l-2 ${
              isCurrent ? 'border-completion-blue' : 'border-transparent'
            } ${tier.achieved ? '' : 'opacity-60'}`}
          >
            <span className="w-8 shrink-0 text-right text-sm text-text-gray">{index + 1}</span>
            <div className="flex flex-col grow min-w-0">
              <span className="font-bold capitalize">{tier.title}</span>
              <span className="text-sm">{tier.description}</span>
            </div>
            <span className="shrink-0 text-sm text-right text-text-gray">
              {tier.achieved && tier.achievedAt
                ? formatUnlockDate(tier.achievedAt)
                : tier.achieved
                  ? 'Unlocked'
                  : 'Not Achieved'}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const ChainStatus: React.FC<{ entry: AchievementChainEntry }> = ({ entry }) => {
  const { achievedCount, tierCount, lastAchievedAt } = entry;
  const date = lastAchievedAt ? formatUnlockDate(lastAchievedAt) : 'Date not available';
  if (achievedCount === 0) {
    return <span className="text-text-red">Not Achieved</span>;
  }
  if (achievedCount >= tierCount) {
    return (
      <span className="text-completion-blue">
        {tierCount > 1 ? 'Completed' : 'Unlocked'}: {date}
      </span>
    );
  }
  return <span className="text-text-gray">Last unlocked: {date}</span>;
};

const AchievementChainCard: React.FC<{ entry: AchievementChainEntry }> = ({ entry }) => {
  const { chain, current, tierCount, achievedCount, progress } = entry;
  const tiered = tierCount > 1;
  const [expanded, setExpanded] = useState(false);
  const [tiers, setTiers] = useState<AchievementRow[] | null>(null);

  // (Re)load the tiers while expanded, and again whenever a tier gets unlocked
  useEffect(() => {
    if (!expanded) {
      return;
    }
    const handleMessage = (event: MessageEvent) => {
      const data: PostMessage = event.data;
      if (data?.command !== webview.commands.DISPLAY_ACHIEVEMENT_CHAIN_TIERS) {
        return;
      }
      const payload = data.data as { chain: string; tiers: AchievementRow[] };
      if (payload.chain === chain) {
        setTiers(payload.tiers);
      }
    };
    window.addEventListener('message', handleMessage);
    window.vscode.postMessage(
      JSON.stringify({
        command: webview.commands.RETRIEVE_ACHIEVEMENT_CHAIN_TIERS,
        data: { chain },
      })
    );
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [expanded, chain, achievedCount]);

  return (
    <div className="achievement-chain flex flex-col w-9/10 min-w-xs my-1.5 bg-background-gray">
      <div className="achievement-display flex flex-row items-center gap-2.5 p-1">
        <AchievementIcon icon={current.icon} title={current.title} className="w-18 h-18" />

        <div className="achievement-body flex flex-col grow min-w-0 gap-1 py-1.5 px-1.5">
          <div className="flex flex-row flex-wrap justify-between items-baseline gap-x-2.5">
            <h3 className="font-bold m-0 p-0 capitalize">{current.title}</h3>
            {tiered && (
              <span className="text-sm text-text-gray whitespace-nowrap">
                {achievedCount} / {tierCount} tiers
              </span>
            )}
          </div>
          <p className="achievement-description m-0 p-0">{current.description}</p>
          {tiered && tierCount <= MAX_TIER_PIPS && (
            <TierPips achievedCount={achievedCount} tierCount={tierCount} />
          )}
          {progress !== null && (
            <ProgressBar ratio={progress} label={tiered ? 'Next tier' : 'Progress'} />
          )}
          <span className="achievement-status text-sm">
            <ChainStatus entry={entry} />
          </span>
        </div>

        {tiered && (
          <button
            type="button"
            className="shrink-0 self-stretch px-2.5 border-none rounded-sm bg-transparent text-text-gray cursor-pointer hover:bg-filter-gray hover:text-white"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Hide' : 'Show'} the tiers of ${current.title}`}
            onClick={() => setExpanded((prev) => !prev)}
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        )}
      </div>

      {expanded && <TierList tiers={tiers} currentId={current.id} />}
    </div>
  );
};

export default AchievementChainCard;
