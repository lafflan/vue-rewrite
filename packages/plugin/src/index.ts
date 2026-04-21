import type { Plugin } from 'vite';
import type { ServerMessage } from '@vue-rewrite/shared';
import { WebSocketServer, type WebSocket } from 'ws';
import { logger } from './utils/logger.js';
import { injectOverlayScript } from './transform/inject.js';
import { tailwindResolver } from './transform/tailwindResolver.js';
import { transformSFC } from './transform/sfcParser.js';

const DEFAULT_WS_PORT = 3457;

export interface VueRewriteOptions {
  wsPort?: number;
  verbose?: boolean;
  tailwindConfigPath?: string;
  enabled?: boolean;
}

export default function vueRewritePlugin(options: VueRewriteOptions = {}): Plugin {
  const {
    wsPort = DEFAULT_WS_PORT,
    verbose = false,
    tailwindConfigPath,
    enabled = true,
  } = options;

  let projectRoot = process.cwd();
  let wss: WebSocketServer | null = null;
  let currentClient: WebSocket | null = null;

  if (verbose) {
    logger.setLogLevel('debug');
  }

  const clients = new Set<WebSocket>();

  function broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg);
    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }

  return {
    name: 'vite-plugin-vue-rewrite',

    async configureServer(devServer) {
      if (!enabled) return;

      projectRoot = (devServer as unknown as { root: string }).root || process.cwd();
      const httpServer = devServer.httpServer;
      if (!httpServer) return;

      // Setup WebSocket server
      wss = new WebSocketServer({ noServer: true });

      wss.on('connection', (ws: WebSocket) => {
        if (currentClient && currentClient !== ws) {
          currentClient.close(4001, 'Replaced by new connection');
        }
        currentClient = ws;
        clients.add(ws);

        logger.info('Overlay connected');

        ws.on('message', (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            // Handle ping
            if (msg.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (err) {
            logger.error('Failed to process message:', err);
          }
        });

        ws.on('close', () => {
          clients.delete(ws);
          if (currentClient === ws) {
            currentClient = null;
          }
          logger.info('Overlay disconnected');
        });

        // Send tailwind tokens on connect
        const tokens = tailwindResolver(projectRoot, tailwindConfigPath);
        ws.send(JSON.stringify({ type: 'tailwindTokens', tokens }));
      });

      // Handle upgrade requests
      httpServer.on('upgrade', (request: unknown, socket: unknown, head: unknown) => {
        const req = request as { url?: string };
        if (req.url === '/vue-rewrite-ws') {
          wss!.handleUpgrade(request as never, socket as never, head as never, (ws) => {
            wss!.emit('connection', ws, request);
          });
        }
      });

      logger.info(`VueRewrite WebSocket server running on port ${wsPort}`);
    },

    async transformIndexHtml(html) {
      if (!enabled) return html;
      return injectOverlayScript(html, wsPort);
    },

    transform(code, id) {
      if (!enabled) return code;
      if (!id.endsWith('.vue')) return code;

      try {
        // 使用 SFC 解析器进行转换，注入 data-vr-id
        const result = transformSFC(code, id);
        if (result.errors.length > 0) {
          logger.debug(`Transform warnings for ${id}:`, result.errors);
        }
        return result.code;
      } catch (err) {
        logger.debug(`Failed to transform ${id}:`, err);
        return code;
      }
    },

    handleHotUpdate({ file }) {
      if (!enabled) return;
      if (!file.endsWith('.vue')) return;

      broadcast({
        type: 'revertFailed',
        operationId: file,
        error: 'File changed',
      });
    },
  };
}
