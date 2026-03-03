import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { Position } from "@/types";

interface UseLoadPositionWSOptions {
  loadId: string | undefined;
  enabled?: boolean;
  onPosition?: (pos: Position) => void;
}

export function useLoadPositionWS({
  loadId,
  enabled = true,
  onPosition,
}: UseLoadPositionWSOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPosition, setLastPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 10;

  const connect = useCallback(() => {
    if (!loadId || !enabled) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    // Build WebSocket URL from the API base URL
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
    const wsBase = apiBase
      .replace(/^http/, "ws")
      .replace(/\/api\/v1\/?$/, "");
    const wsUrl = `${wsBase}/ws?token=${encodeURIComponent(token)}&load_id=${loadId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        retryCount.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // The WS may send position updates
          if (data.lat !== undefined && data.lng !== undefined) {
            const pos: Position = {
              load_id: data.load_id || loadId,
              carrier_id: data.carrier_id || "",
              lat: data.lat,
              lng: data.lng,
              speed_mps: data.speed_mps ?? 0,
              heading_deg: data.heading_deg ?? 0,
              accuracy_m: data.accuracy_m ?? 0,
              recorded_at: data.recorded_at || new Date().toISOString(),
            };
            setLastPosition(pos);
            onPosition?.(pos);
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect with backoff
        if (enabled && retryCount.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
          retryCount.current += 1;
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };
    } catch {
      setError("Failed to create WebSocket");
    }
  }, [loadId, enabled, onPosition]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    retryCount.current = 0;
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { isConnected, lastPosition, error, disconnect, reconnect: connect };
}
