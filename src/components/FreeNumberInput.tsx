import React, { useState, useEffect } from 'react';

export interface FreeNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | string | undefined | null;
  onValueChange: (numericValue: number, rawString: string) => void;
}

export const FreeNumberInput: React.FC<FreeNumberInputProps> = ({
  value,
  onValueChange,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localStr, setLocalStr] = useState<string>(() =>
    value === undefined || value === null ? '' : String(value)
  );

  useEffect(() => {
    if (!isFocused) {
      const currentNum = localStr.trim() === '' ? 0 : Number(localStr);
      const propNum = value === undefined || value === null || value === '' ? 0 : Number(value);
      if (currentNum !== propNum) {
        setLocalStr(value === undefined || value === null ? '' : String(value));
      }
    }
  }, [value, isFocused, localStr]);

  return (
    <input
      {...rest}
      type="number"
      value={localStr}
      onFocus={e => {
        setIsFocused(true);
        onFocus?.(e);
      }}
      onBlur={e => {
        setIsFocused(false);
        onBlur?.(e);
      }}
      onChange={e => {
        const raw = e.target.value;
        setLocalStr(raw);
        if (raw.trim() === '') {
          onValueChange(0, '');
        } else {
          const parsed = Number(raw);
          onValueChange(Number.isFinite(parsed) ? parsed : 0, raw);
        }
      }}
    />
  );
};
