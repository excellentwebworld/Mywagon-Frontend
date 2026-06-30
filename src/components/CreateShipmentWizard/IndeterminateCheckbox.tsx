import React, { useEffect, useRef } from 'react';

interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
}

export const IndeterminateCheckbox: React.FC<IndeterminateCheckboxProps> = ({
  checked,
  indeterminate,
  onChange,
  id,
}) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      type="checkbox"
      id={id}
      ref={ref}
      checked={checked}
      onChange={onChange}
      className="cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  );
};
