import React from 'react';

type Props = {
  message?: string;
};

export const FormFieldError: React.FC<Props> = ({ message }) => {
  if (!message) return null;
  return <p className="field-error">{message}</p>;
};
