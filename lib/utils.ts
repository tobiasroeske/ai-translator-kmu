import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const createEnumGuard = <T extends string>(values: readonly T[]) => {
  return (value: unknown): value is T => {
    return typeof value === 'string' && values.includes(value as T);
  };
};
