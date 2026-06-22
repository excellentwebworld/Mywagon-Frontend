import React from 'react';

export interface TimeRangeRow {
  id?: number;
  start_time: string;
  end_time: string;
}

interface TimeRangeFormListProps {
  timeRanges: TimeRangeRow[];
  onChange: (timeRanges: TimeRangeRow[]) => void;
  variant?: 'default' | 'preferred';
}

export const TimeRangeFormList: React.FC<TimeRangeFormListProps> = ({
  timeRanges,
  onChange,
  variant = 'default',
}) => {
  const update = (index: number, field: keyof TimeRangeRow, value: string) => {
    const updated = [...timeRanges];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const remove = (index: number) => {
    const updated = [...timeRanges];
    updated.splice(index, 1);
    onChange(updated);
  };

  const add = () => {
    onChange([...timeRanges, { start_time: '08:00', end_time: '17:00' }]);
  };

  return (
    <div className="time-range-list">
      {timeRanges.map((range, i) => (
        <div key={i} className="time-range-row">
          <div className="time-range-row-label">Time Range {i + 1}</div>
          <div className="mf-row time-range-inputs">
            <div className="mf">
              <label>Start Time</label>
              <input type="time" value={range.start_time} onChange={(e) => update(i, 'start_time', e.target.value)} />
            </div>
            <div className="mf">
              <label>End Time</label>
              <input type="time" value={range.end_time} onChange={(e) => update(i, 'end_time', e.target.value)} />
            </div>
            {timeRanges.length > 1 && (
              <button type="button" className="time-range-remove" onClick={() => remove(i)} aria-label="Remove time range">
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm time-range-add" onClick={add}>
        +
      </button>
    </div>
  );
};
