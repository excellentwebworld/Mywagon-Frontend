import React from 'react';

export type PlaceSuggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  types: string[];
};

type Props = {
  suggestions: PlaceSuggestion[];
  loading?: boolean;
  activeIndex?: number;
  onSelect: (suggestion: PlaceSuggestion) => void;
  onHoverIndex?: (index: number) => void;
  emptyLabel?: string;
  className?: string;
  style?: React.CSSProperties;
};

function SuggestionIcon({ types }: { types: string[] }) {
  const isAirport = types.some((t) => t === 'airport');
  const isPoi = types.some(
    (t) =>
      t === 'point_of_interest' ||
      t === 'establishment' ||
      t === 'tourist_attraction' ||
      t === 'premise'
  );

  if (isAirport) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (isPoi) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 20V6a2 2 0 0 1 2-2h5v16H4Z" />
        <path d="M11 20V9h7a2 2 0 0 1 2 2v9" />
        <path d="M7 8h1M7 11h1M7 14h1M14 12h1M14 15h1" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export const SearchPlaceSuggestions: React.FC<Props> = ({
  suggestions,
  loading = false,
  activeIndex = -1,
  onSelect,
  onHoverIndex,
  emptyLabel,
  className = '',
  style,
}) => {
  if (!loading && suggestions.length === 0 && !emptyLabel) return null;

  return (
    <div
      className={`sat-suggest ${className}`.trim()}
      role="listbox"
      style={style}
      onMouseDown={(e) => e.preventDefault()}
    >
      {loading && suggestions.length === 0 ? (
        <div className="sat-suggest-empty">{emptyLabel || '…'}</div>
      ) : suggestions.length === 0 ? (
        <div className="sat-suggest-empty">{emptyLabel}</div>
      ) : (
        suggestions.map((s, i) => (
          <button
            key={s.placeId}
            type="button"
            role="option"
            aria-selected={activeIndex === i}
            className={`sat-suggest-item${activeIndex === i ? ' is-active' : ''}`}
            onMouseEnter={() => onHoverIndex?.(i)}
            onClick={() => onSelect(s)}
          >
            <span className="sat-suggest-icon" data-kind={
              s.types.includes('airport')
                ? 'airport'
                : s.types.some((t) =>
                      t === 'point_of_interest' ||
                      t === 'establishment' ||
                      t === 'tourist_attraction'
                    )
                  ? 'poi'
                  : 'place'
            }>
              <SuggestionIcon types={s.types} />
            </span>
            <span className="sat-suggest-text">
              <span className="sat-suggest-primary">{s.primary}</span>
              {s.secondary ? <span className="sat-suggest-secondary">{s.secondary}</span> : null}
            </span>
          </button>
        ))
      )}
    </div>
  );
};
