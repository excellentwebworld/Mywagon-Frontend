import React from 'react';
import { getTimeRangeError } from '../../pages/AddressBook/validation/timeRangeValidation';

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

const timeOptions = (() => {
  const options = [{ value: '', label: '--:--' }];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}`;
      options.push({ value, label: value });
    }
  }
  return options;
})();

function startTimeOptions(endTime: string, currentStart: string) {
  return timeOptions.filter(
    (opt) => !opt.value || !endTime || opt.value < endTime || opt.value === currentStart
  );
}

function endTimeOptions(startTime: string, currentEnd: string) {
  return timeOptions.filter(
    (opt) => !opt.value || !startTime || opt.value > startTime || opt.value === currentEnd
  );
}

export const TimeRangeFormList: React.FC<TimeRangeFormListProps> = ({
  timeRanges,
  onChange,
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
      {timeRanges.map((range, i) => {
        const rangeError = getTimeRangeError(range);

        return (
          <div key={i} className="time-range-block">
            <div className="time-range-title">Time Range {i + 1}</div>
            <div className="time-range-row">
              <div className={`mf${rangeError ? ' has-error' : ''}`} style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Start Time <span className="req">*</span>
                </label>
                <div className={`time-select-wrapper${rangeError ? ' has-error' : ''}`}>
                  <select
                    value={range.start_time || ''}
                    onChange={(e) => update(i, 'start_time', e.target.value)}
                  >
                    {startTimeOptions(range.end_time, range.start_time).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="time-clock-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                </div>
              </div>
              <div className={`mf${rangeError ? ' has-error' : ''}`} style={{ marginBottom: 0 }}>
                <label className="form-label">
                  End Time <span className="req">*</span>
                </label>
                <div className={`time-select-wrapper${rangeError ? ' has-error' : ''}`}>
                  <select
                    value={range.end_time || ''}
                    onChange={(e) => update(i, 'end_time', e.target.value)}
                  >
                    {endTimeOptions(range.start_time, range.end_time).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="time-clock-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                </div>
              </div>
              <div className="time-range-action">
                {i === 0 ? (
                  <button
                    type="button"
                    className="range-action-btn add-range-btn"
                    onClick={add}
                    aria-label="Add time range"
                  >
                    +
                  </button>
                ) : (
                  <button
                    type="button"
                    className="range-action-btn remove-range-btn"
                    onClick={() => remove(i)}
                    aria-label="Remove time range"
                  >
                    −
                  </button>
                )}
              </div>
            </div>
            {rangeError && <p className="field-error time-range-error">{rangeError}</p>}
          </div>
        );
      })}
    </div>
  );
};
