import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string to a readable format
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats a numeric value with a specific unit
 */
export function formatValue(value: number | undefined, unit: string): string {
  if (value === undefined) {
    return `0 ${unit}`;
  }
  return `${value.toLocaleString()} ${unit}`;
}

/**
 * Get status badge variant based on status string
 */
export function getStatusVariant(status: string): "default" | "success" | "warning" | "destructive" | "outline" {
  switch (status) {
    case "normal":
    case "success":
    case "good":
      return "success";
    case "warning":
    case "review":
    case "improve":
      return "warning";
    case "error":
    case "abnormal":
    case "alert":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Returns appropriate icon color based on the status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "normal":
    case "success":
    case "good":
      return "text-success";
    case "warning":
    case "review":
    case "improve":
      return "text-warning";
    case "error":
    case "abnormal":
    case "alert":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Truncates text to specified length and adds ellipsis
 */
export function truncateText(text: string, length: number): string {
  if (!text) return "";
  return text.length > length ? `${text.substring(0, length)}...` : text;
}
