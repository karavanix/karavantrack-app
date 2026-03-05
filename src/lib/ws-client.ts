/**
 * Singleton WebSocket client.
 *
 * Lifecycle:
 *   wsClient.connect(token)   — call once after login (inside AppLayout)
 *   wsClient.disconnect()     — call on logout / AppLayout unmount
 *
 * Room management (per load-detail page):
 *   wsClient.join(loadId)     — sends { event:"join", data:{ load_id } }
 *   wsClient.leave()          — sends { event:"leave", data:{} }
 *
 * Position updates:
 *   const off = wsClient.subscribe(handler)
 *   handler({ event, data })  — called for every incoming envelope
 *   off()                     — unsubscribe
 */

type MessageHandler = (envelope: { event: string; data?: unknown }) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private token = "";
  private apiBase = "";
  private currentLoadId: string | null = null;
  private handlers = new Set<MessageHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private readonly maxRetries = 10;
  private intentionallyClosed = false;

  // ─── Public API ──────────────────────────────────────────────

  connect(token: string) {
    this.token = token;
    this.apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
    this.intentionallyClosed = false;
    this.retryCount = 0;
    this._open();
  }

  disconnect() {
    this.intentionallyClosed = true;
    this._clearReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentLoadId = null;
  }

  join(loadId: string) {
    this.currentLoadId = loadId;
    this._send({ event: "join", data: { load_id: loadId } });
  }

  leave() {
    this._send({ event: "leave", data: {} });
    this.currentLoadId = null;
  }

  /** Returns an unsubscribe function */
  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ─── Internal ────────────────────────────────────────────────

  private _open() {
    if (!this.token) return;

    const wsBase = this.apiBase.replace(/^http/, "ws");
    const url = `${wsBase}/ws?token=${encodeURIComponent(this.token)}`;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.retryCount = 0;
      // Re-join the load room if the user is still on a load-detail page
      if (this.currentLoadId) {
        ws.send(JSON.stringify({ event: "join", data: { load_id: this.currentLoadId } }));
      }
    };

    ws.onmessage = (ev) => {
      try {
        const envelope = JSON.parse(ev.data);
        this.handlers.forEach((h) => h(envelope));
      } catch {
        // malformed frame — ignore
      }
    };

    ws.onerror = () => {
      // onclose will fire next and handle reconnect
    };

    ws.onclose = () => {
      this.ws = null;
      if (!this.intentionallyClosed && this.retryCount < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30_000);
        this.retryCount++;
        this.reconnectTimer = setTimeout(() => this._open(), delay);
      }
    };
  }

  private _send(envelope: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(envelope));
    }
    // If not open yet (still connecting / reconnecting), the join will be
    // re-sent in onopen once the connection is established.
  }

  private _clearReconnect() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Export a single shared instance
export const wsClient = new WSClient();
