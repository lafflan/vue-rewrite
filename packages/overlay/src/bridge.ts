import type { ClientMessage, ServerMessage } from '@vue-rewrite/shared';

type MessageHandler = (msg: ServerMessage) => void;

class Bridge {
  private ws: WebSocket | null = null;
  private port: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 500;
  private messageHandlers: Set<MessageHandler> = new Set();
  private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = new Map();
  private isConnected = false;

  connect(port: number): void {
    this.port = port;
    this.createConnection();
  }

  private createConnection(): void {
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(`ws://localhost:${this.port}`);
      this.setupEventHandlers();
    } catch (err) {
      console.error('[VueRewrite] Failed to create WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.info('[VueRewrite] Bridge connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.warn('[VueRewrite] Failed to parse message:', err);
      }
    };

    this.ws.onclose = (event) => {
      console.info('[VueRewrite] Bridge disconnected:', event.code, event.reason);
      this.isConnected = false;

      if (event.code === 4001) {
        // Replaced by new connection - don't reconnect
        console.info('[VueRewrite] Connection replaced');
        return;
      }

      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('[VueRewrite] WebSocket error:', err);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[VueRewrite] Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.info(`[VueRewrite] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.createConnection(), delay);
  }

  private handleMessage(msg: ServerMessage): void {
    // Notify all handlers
    this.messageHandlers.forEach((handler) => handler(msg));

    // Check if this is a response to a pending request
    if ('type' in msg) {
      const requestId = this.getRequestIdForMessage(msg);
      if (requestId && this.pendingRequests.has(requestId)) {
        const { resolve } = this.pendingRequests.get(requestId)!;
        this.pendingRequests.delete(requestId);
        resolve(msg);
      }
    }
  }

  private getRequestIdForMessage(_msg: ServerMessage): string | null {
    // Map response types back to their request IDs
    // This would be more sophisticated in a real implementation
    return null;
  }

  send(msg: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[VueRewrite] Cannot send - not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error('[VueRewrite] Failed to send message:', err);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  async request<T>(msg: ClientMessage, timeoutMs = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(String(msg.type));
        reject(new Error(`Request timeout: ${msg.type}`));
      }, timeoutMs);

      this.pendingRequests.set(String(msg.type), {
        resolve: (value) => {
          clearTimeout(timeoutId);
          resolve(value as T);
        },
        reject,
      });

      this.send(msg);
    });
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const bridge = new Bridge();
