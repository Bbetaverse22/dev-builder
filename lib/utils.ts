import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function assertEnv(variable: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
  return value;
}

export function formatGapValue(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) {
    return '';
  }

  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.?0+$/, '');
}
