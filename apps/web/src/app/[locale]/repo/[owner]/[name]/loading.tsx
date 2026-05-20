export default function RepoDetailLoading() {
  return (
    <div className="repo-loading" aria-busy="true" aria-label="Loading repository">
      <div className="repo-loading__back skeleton" />
      <div className="repo-loading__title skeleton" />
      <div className="repo-loading__summary skeleton" />
      <div className="repo-loading__panel skeleton" />
      <div className="repo-loading__stats">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="repo-loading__stat skeleton" />
        ))}
      </div>
    </div>
  );
}
