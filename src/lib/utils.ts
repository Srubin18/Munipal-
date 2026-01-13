import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format cents to Rands
export function formatZAR(cents: number): string {
  return `R ${(cents / 100).toFixed(2)}`;
}

// Generate case number
export function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `MUN-${year}-${random}`;
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Format date for CoJ deadline (21 days from submission)
export function calculateCojDeadline(submissionDate: Date): Date {
  const deadline = new Date(submissionDate);
  deadline.setDate(deadline.getDate() + 21);
  return deadline;
}
