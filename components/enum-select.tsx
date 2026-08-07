'use client';

import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type EnumSelectOption<T extends string> = {
  value: T;
  label: string;
};

type EnumSelectProps<T extends string> = {
  id: string;
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly EnumSelectOption<T>[];
  disabled?: boolean;
  className?: string;
};

// Radix hands back a plain string from onValueChange. Matching it against the options
// recovers the literal type without a cast, and keeps the accepted values tied to the
// list actually rendered.
const EnumSelect = <T extends string>({
  id,
  label,
  value,
  onValueChange,
  options,
  disabled,
  className,
}: EnumSelectProps<T>) => (
  <Field className={className}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Select
      value={value}
      onValueChange={(selectedValue) => {
        const selected = options.find((option) => option.value === selectedValue);
        if (selected) onValueChange(selected.value);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </Field>
);

export default EnumSelect;
