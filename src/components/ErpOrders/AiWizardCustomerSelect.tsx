import React from 'react';
import { SearchableSelect, type SearchableSelectOption } from '../ui/SearchableSelect';

type Props = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string, option?: SearchableSelectOption) => void;
  placeholder: string;
  searchPlaceholder: string;
  required?: boolean;
  hint?: string;
};

export const AiWizardCustomerSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  required = true,
  hint,
}) => {
  const isEmpty = !value;

  return (
    <div
      className={`ai-customer-picker${isEmpty ? ' is-empty' : ' is-set'}${
        required && isEmpty ? ' is-required' : ''
      }`}
    >
      {required && isEmpty && <span className="ai-customer-required-pill">Required</span>}
      <SearchableSelect
        className="ai-customer-select"
        direction="down"
        menuFixed
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        hasError={required && isEmpty}
      />
      {hint && isEmpty && <div className="ai-customer-hint">{hint}</div>}
    </div>
  );
};
