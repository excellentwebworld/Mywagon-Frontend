import React, { useRef } from 'react';

type OtpBoxesProps = {
  value: string;
  onChange: (value: string) => void;
  verified?: boolean;
  disabled?: boolean;
  error?: string;
};

export const OtpBoxes: React.FC<OtpBoxesProps> = ({
  value,
  onChange,
  verified = false,
  disabled = false,
  error,
}) => {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  const setDigit = (index: number, char: string) => {
    if (verified || disabled) return;
    const next = value.padEnd(6, ' ').split('');
    next[index] = char;
    const joined = next.join('').replace(/\s/g, '').slice(0, 6);
    onChange(joined.replace(/\D/g, ''));
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) {
      setDigit(index, ' ');
      return;
    }
    setDigit(index, digit);
    if (index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (verified || disabled) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[index]) {
        const chars = value.split('');
        chars[index] = '';
        onChange(chars.join('').replace(/\s/g, ''));
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        const chars = value.split('');
        chars[index - 1] = '';
        onChange(chars.join('').replace(/\s/g, ''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (verified || disabled) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    const focusAt = Math.min(pasted.length, 5);
    inputsRef.current[focusAt]?.focus();
  };

  return (
    <div className="shipper-register-otp">
      <div className="shipper-register-otp-boxes" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            className={`shipper-register-otp-box${verified ? ' is-verified' : ''}${error ? ' is-error' : ''}`}
            value={d.trim()}
            readOnly={verified || disabled}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
          />
        ))}
      </div>
      {error && (
        <p className="shipper-login-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
