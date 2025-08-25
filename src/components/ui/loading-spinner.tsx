import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
  showText?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({
  size = "md",
  className,
  text = "Loading...",
  showText = false,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2
          className={cn("animate-spin text-primary", sizeClasses[size])}
        />
        {showText && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    </div>
  );
}

export function LoadingSpinnerOverlay({
  size = "lg",
  text = "Loading...",
  className,
}: Omit<LoadingSpinnerProps, "showText">) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <LoadingSpinner size={size} text={text} showText={true} />
    </div>
  );
}

export function LoadingSpinnerInline({
  size = "sm",
  className,
}: Omit<LoadingSpinnerProps, "text" | "showText">) {
  return (
    <Loader2
      className={cn("animate-spin text-primary", sizeClasses[size], className)}
    />
  );
}
