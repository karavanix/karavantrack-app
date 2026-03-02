import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
}

export function Spinner({ className, size = 20 }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      className={cn("animate-spin text-muted-foreground", className)}
    />
  );
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 py-20">
      <Spinner size={32} className="text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
