import type { Plugin } from 'vite';
import type { ServerMessage } from '@vue-rewrite/shared';
import { WebSocketServer, type WebSocket } from 'ws';
import { join as pathJoin } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { logger } from './utils/logger.js';
import { injectOverlayScript } from './transform/inject.js';
import { tailwindResolver } from './transform/tailwindResolver.js';
import { transformSFC } from './transform/sfcParser.js';
import { processMessage } from './server/messageHandler.js';

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
  let viteServer: { config?: { server?: { port?: number } } } | null = null;

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
    enforce: 'pre', // 必须在 Vue plugin 之前运行，才能收到原始 SFC

    async configureServer(devServer) {
      if (!enabled) return;

      projectRoot = (devServer as unknown as { root: string }).root || process.cwd();
      viteServer = devServer as typeof viteServer;
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

        ws.on('message', async (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            // Handle ping directly
            if (msg.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong' }));
              return;
            }
            // Process all other messages via messageHandler
            const response = await processMessage(msg, {
              projectRoot,
              broadcast,
            });
            if (response) {
              ws.send(JSON.stringify(response));
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
        if (req.url === '/') {
          wss!.handleUpgrade(request as never, socket as never, head as never, (ws) => {
            wss!.emit('connection', ws, request);
          });
        }
      });

      logger.info(`VueRewrite WebSocket server running on port ${wsPort}`);
    },

    async transformIndexHtml(html) {
      if (!enabled) return html;
      // Get the actual Vite server port (not the WebSocket port)
      const serverPort = viteServer?.config?.server?.port || 5173;
      return injectOverlayScript(html, serverPort);
    },

    resolveId(id) {
      if (!enabled) return;
      if (id === '/__vue-rewrite/overlay.js') {
        return '\0vue-rewrite-overlay';
      }
    },

    async load(id) {
      if (!enabled) return;
      if (id === '\0vue-rewrite-overlay') {
        // 返回 overlay IIFE 的路径
        const overlayPath = pathJoin(projectRoot, 'node_modules', '@vue-rewrite', 'overlay', 'dist', 'overlay.js');
        if (existsSync(overlayPath)) {
          return readFileSync(overlayPath, 'utf-8');
        }
        // 开发模式尝试从源码构建目录
        const srcOverlayPath = pathJoin(__dirname, '..', '..', 'overlay', 'dist', 'overlay.js');
        if (existsSync(srcOverlayPath)) {
          return readFileSync(srcOverlayPath, 'utf-8');
        }
        logger.error('Overlay bundle not found. Run `pnpm build:overlay` first.');
        return '';
      }
    },

    transform(code, id) {
      if (!enabled) return code;
      if (!id.endsWith('.vue')) return code;

      logger.debug(`[Transform] Processing: ${id}`);
      try {
        // 使用 SFC 解析器进行转换，注入 data-vr-id
        const result = transformSFC(code, id);
        if (result.errors.length > 0) {
          logger.debug(`[Transform] Errors for ${id}:`, result.errors);
        }
        // Check if data-vr-id was actually added
        if (!result.code.includes('data-vr-id')) {
          logger.debug(`[Transform] WARNING: No data-vr-id in result for ${id}`);
        }
        // 将转换后的代码写回源文件，这样后续 applySfcEdit 可以找到 data-vr-id
        if (result.code !== code && existsSync(id)) {
          writeFileSync(id, result.code, 'utf-8');
        }
        return result.code;
      } catch (err) {
        logger.debug(`[Transform] Failed to transform ${id}:`, err);
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
