import React from 'react';

export interface TimeRangeRow {
  id?: number;
  start_time: string;
  end_time: string;
}

interface TimeRangeFormListProps {
  timeRanges: TimeRangeRow[];
  onChange: (timeRanges: TimeRangeRow[]) => void;
}

export const TimeRangeFormList: React.FC<TimeRangeFormListProps> = ({ timeRanges, onChange }) => {
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
    <>
      {timeRanges.map((range, i) => (
        <div key={i} className="contact-form-row">
          <button type="button" className="del-contact-btn" onClick={() => remove(i)}>
            ✕
          </button>
          <div className="mf-row">
            <div className="mf">
              <label>Start</label>
              <input type="time" value={range.start_time} onChange={(e) => update(i, 'start_time', e.target.value)} />
            </div>
            <div className="mf">
              <label>End</label>
              <input type="time" value={range.end_time} onChange={(e) => update(i, 'end_time', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="add-contact-btn" onClick={add}>
        + Add Time Range
      </button>
    </>
  );
};
