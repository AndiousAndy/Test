import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a balance into a currency string.
 * @param balance The balance to format (number | string | null | undefined).
 * @param currencySymbol Optional currency symbol (default: "").
 * @param currencyName Optional currency name (default: "Credits").
 * @returns Formatted balance string (e.g., "1,200.00 Credits").
 */
export function formatBalance(
  balance: number | string | null | undefined,
  currencySymbol: string = "",
  currencyName: string = "Credits"
): string {
  // Convert input to a number, defaulting to 0 if invalid/null/undefined
  const balanceString = typeof balance === 'string' ? balance : String(balance ?? '0');
  const numericBalance = parseFloat(balanceString);
  
  // Handle potential NaN from parseFloat
  const valueToFormat = isNaN(numericBalance) ? 0 : numericBalance;
      
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueToFormat);

  return `${currencySymbol}${formatted} ${currencyName}`.trim();
}
