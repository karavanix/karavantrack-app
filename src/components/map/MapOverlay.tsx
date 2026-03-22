/**
 * Overlay shown on top of the map container while loading or when an error occurs.
 */
export function MapOverlay({
  isReady,
  error,
}: {
  isReady: boolean;
  error: string | null;
}) {
  if (isReady && !error) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/60 backdrop-blur-[2px]">
      {error ? (
        <div className="flex flex-col items-center gap-2 text-center px-6">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-destructive"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-destructive">
            Map failed to load
          </p>
          <p className="text-xs text-muted-foreground max-w-[240px] truncate">
            {error}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Loading map…
          </p>
        </div>
      )}
    </div>
  );
}
