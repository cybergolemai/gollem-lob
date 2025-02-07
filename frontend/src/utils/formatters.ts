/** 
 * @deprecated Use Decimal.js directly instead of formatters
 */

/** Usage examples
import { formatUSD, formatCredits, calculateCreditCost } from '@/utils/formatters';

// Format currency
console.log(formatUSD('10.5')); // "$10.50"

// Format credits
console.log(formatCredits('10.12345678')); // "10.12345678 credits"

// Calculate credit cost
console.log(calculateCreditCost(100, 'gpt4', 'h100')); // "50.00000000"
*/

import { Decimal } from 'decimal.js';

// Constants for credit calculations
export const CREDIT_BASE_RATE = new Decimal('0.001'); // $0.001 per credit
export const MODEL_MULTIPLIERS = {
  'gpt4': new Decimal('2'),
  'gpt3': new Decimal('1'),
} as const;

export const GPU_MULTIPLIERS = {
  'h100': new Decimal('2'),
  'a100': new Decimal('1.5'),
} as const;

/**
 * Format a decimal string to USD
 */
export function formatUSD(amount: string | number): string {
  const decimal = new Decimal(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(decimal.toNumber());
}

/**
 * Format credits with 8 decimal precision
 */
export function formatCredits(credits: string | number): string {
  const decimal = new Decimal(credits);
  return `${decimal.toFixed(8)} credits`;
}

/**
 * Calculate credit cost for a given prompt length and model
 */
export function calculateCreditCost(
  promptLength: number,
  model: keyof typeof MODEL_MULTIPLIERS,
  gpuType: keyof typeof GPU_MULTIPLIERS
): string {
  const baseTokens = new Decimal(promptLength).div(4).ceil();
  const modelMultiplier = MODEL_MULTIPLIERS[model] || new Decimal(1);
  const gpuMultiplier = GPU_MULTIPLIERS[gpuType] || new Decimal(1);
  
  return baseTokens
    .mul(modelMultiplier)
    .mul(gpuMultiplier)
    .toFixed(8);
}

/**
 * Convert credits to USD
 */
export function creditsToUSD(credits: string | number): string {
  const decimal = new Decimal(credits);
  return decimal.mul(CREDIT_BASE_RATE).toFixed(2);
}

/**
 * Convert USD to credits
 */
export function usdToCredits(usd: string | number): string {
  const decimal = new Decimal(usd);
  return decimal.div(CREDIT_BASE_RATE).toFixed(8);
}

/**
 * Format a timestamp to local date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a timestamp to local date and time string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format latency in milliseconds
 */
export function formatLatency(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format token count with abbreviation
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return `${(count / 1000000).toFixed(1)}M`;
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format percentage with specified decimal places
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format time duration from seconds
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = Date.now();
  const diff = timestamp - now;

  const diffSeconds = Math.round(diff / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, 'day');
  }
  if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, 'hour');
  }
  if (Math.abs(diffMinutes) >= 1) {
    return rtf.format(diffMinutes, 'minute');
  }
  return rtf.format(diffSeconds, 'second');
}