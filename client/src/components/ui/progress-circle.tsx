import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressCircleProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  background?: string;
  foreground?: string;
  children?: React.ReactNode;
}

export function ProgressCircle({
  value,
  max,
  size = 100,
  strokeWidth = 6,
  className,
  background = "hsl(var(--muted))",
  foreground = "hsl(var(--primary))",
  children,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;

  return (
    <div className={cn("relative inline-flex", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="transition-all duration-300"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={background}
          strokeWidth={strokeWidth}
        />
        <circle
          className="transition-all duration-300"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={foreground}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
