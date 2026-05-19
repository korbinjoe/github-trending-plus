interface FeedListSkeletonProps {
  count?: number;
  label: string;
}

export function FeedListSkeleton({ count = 6, label }: FeedListSkeletonProps) {
  return (
    <ol className="rank-list" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={`feed-sk-${i}`} className="rank-item rank-item--skeleton">
          <div className="rank-card rank-card--skeleton">
            <div className="rank-card__layout">
              <div className="rank-card__content">
                <div className="rank-card__top">
                  <span className="rank-card__rank sk-line sk-line--rank" />
                  <div className="rank-card__title sk-line sk-line--title" />
                  <div className="rank-card__stats">
                    <span className="sk-line sk-line--delta" />
                    <span className="sk-line sk-line--action" />
                    <span className="sk-line sk-line--action" />
                  </div>
                </div>
                <p className="rank-card__desc sk-line sk-line--desc" />
                <div className="rank-card__bottom">
                  <div className="rank-card__chips">
                    <span className="sk-line sk-line--chip" />
                    <span className="sk-line sk-line--chip" />
                    <span className="sk-line sk-line--chip" />
                  </div>
                  <span className="sk-line sk-line--status" />
                </div>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
