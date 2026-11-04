import { useState, useEffect, useRef } from 'react';
import AchievementChainCard, { AchievementChainEntry } from './AchievementChainCard';
import { PostMessage } from '../icons';
import { webview } from '../viewconst';

interface AchievementHolderProps {
  filters: Record<string, unknown>;
  limit: number;
}

const AchievementHolder: React.FC<AchievementHolderProps> = ({ filters, limit }) => {
  const [chains, setChains] = useState<AchievementChainEntry[]>([]);
  const [maxCount, setMaxCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // The offset belongs to the filters it was set for: new filters start
  // back on the first page instead of a page that may no longer exist
  const [paging, setPaging] = useState({ filters, offset: 0 });
  const offset = paging.filters === filters ? paging.offset : 0;
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data: PostMessage = event.data;

        if (data.command === webview.commands.DISPLAY_ACHIEVEMENT_CHAINS) {
          const payload = data.data as {
            chains: AchievementChainEntry[];
            count: number;
            requestId?: number;
          };
          if (payload.requestId !== latestRequestIdRef.current) {
            return;
          }
          setChains(payload.chains);
          setMaxCount(payload.count);
          setLoaded(true);
        }
      } catch (e) {
        console.error('Invalid message data:', e);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    const requestId = ++latestRequestIdRef.current;
    window.vscode.postMessage(
      JSON.stringify({
        command: webview.commands.RETRIEVE_ACHIEVEMENT_CHAINS,
        data: { count: true, offset, limit, ...filters, requestId },
      })
    );
  }, [offset, filters, limit]);

  const hasPrevious = offset > 0;
  const hasNext = offset + limit < maxCount;
  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(maxCount / limit));

  return (
    <div className="achievement-holder flex flex-col items-center gap-2.5 w-full py-2.5 px-0">
      {loaded && chains.length === 0 && (
        <p className="text-text-gray">No achievements match these filters.</p>
      )}

      {chains.map((entry) => (
        <AchievementChainCard key={entry.chain} entry={entry} />
      ))}

      <div className='action-buttons flex flex-row items-center justify-center gap-2.5'>
        <button
          className={`page-switch-button page-switch-button-${hasPrevious ? "active" : "inactive"}`}
          onClick={() => setPaging({ filters, offset: Math.max(0, offset - limit) })}
          disabled={!hasPrevious}
          aria-label="Previous page"
        >
          &lt;
        </button>
        <span className="text-text-gray">
          {page} / {pageCount}
        </span>
        <button
          className={`page-switch-button page-switch-button-${hasNext ? "active" : "inactive"}`}
          onClick={() => setPaging({ filters, offset: offset + limit })}
          disabled={!hasNext}
          aria-label="Next page"
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default AchievementHolder;
