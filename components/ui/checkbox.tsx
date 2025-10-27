"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'checked' | 'onChange'
  > {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = checked === 'indeterminate';
      }
    }, [checked]);

    return (
      <input
        type="checkbox"
        ref={inputRef}
        className={cn(
          'peer h-4 w-4 rounded border border-slate-300 bg-transparent text-purple-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        checked={checked === 'indeterminate' ? false : checked}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';
