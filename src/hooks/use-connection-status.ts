import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ConnectionStatus } from "@/types";

const POLL_MS = 10000;

interface UseConnectionStatusOptions {
  loadId: string | undefined;
  enabled?: boolean;
}

// Polled by REST rather than pushed over the WS the map uses — this endpoint
// has to work on the public tracking page too, which has no WS at all, so
// there's no point building two delivery mechanisms for the same data.
export function useConnectionStatus({ loadId, enabled = true }: UseConnectionStatusOptions) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);

  useEffect(() => {
    if (!loadId || !enabled) return;

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const { data } = await api.get<ConnectionStatus>(`/loads/${loadId}/connection-status`);
        if (!cancelled) setStatus(data);
      } catch {
        // Keep showing the last known status on a transient poll error
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      setStatus(null);
    };
  }, [loadId, enabled]);

  return { status };
}
