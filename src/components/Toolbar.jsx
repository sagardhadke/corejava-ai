import './Toolbar.css';

export default function Toolbar({ query, onQueryChange, onExpandAll, onCollapseAll, onClearPlan, plannedCount }) {
  return (
    <div className="toolbar">
      <div className="search-box">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search lectures…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <button className="search-clear" onClick={() => onQueryChange('')} aria-label="Clear search">✕</button>
        )}
      </div>
      <div className="toolbar__actions">
        <button className="tb-btn" onClick={onExpandAll}>Expand all</button>
        <button className="tb-btn" onClick={onCollapseAll}>Collapse all</button>
        {plannedCount > 0 && (
          <button className="tb-btn tb-btn--danger" onClick={onClearPlan}>Clear today's plan</button>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
