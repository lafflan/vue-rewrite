import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { bridge } from './bridge.js';

// Design tokens
export const COLORS = {
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  secondary: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#ffffff',
  backgroundDark: '#1e293b',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
} as const;

export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

export const RADII = {
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
} as const;

export const TRANSITIONS = {
  fast: '150ms',
  DEFAULT: '200ms',
  slow: '300ms',
} as const;

export const FONT_FAMILY = {
  sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
} as const;

// Global styles
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .vr-overlay {
    all: initial;
    font-family: ${FONT_FAMILY.sans};
    font-size: 13px;
    line-height: 1.5;
    color: ${COLORS.text};
  }
`;

// Initialize overlay
function init() {
  // Only run in top-level window (skip iframes)
  if (window !== window.top) {
    console.debug('[VueRewrite] Skipping overlay in iframe');
    return;
  }

  // Get WebSocket port from injected script or use default
  const wsPort = (window as unknown as { __VUE_REWRITE_WS_PORT__?: number }).__VUE_REWRITE_WS_PORT__ || 3457;

  // Create shadow root container
  const container = document.createElement('div');
  container.id = 'vue-rewrite-root';
  const shadow = container.attachShadow({ mode: 'open' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = globalStyles;
  shadow.appendChild(style);

  // Mount to DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(container);
      mountApp(shadow, wsPort);
    });
  } else {
    document.body.appendChild(container);
    mountApp(shadow, wsPort);
  }
}

function mountApp(shadow: ShadowRoot, wsPort: number) {
  // Connect to WebSocket
  bridge.connect(wsPort);

  // Create Vue app
  const pinia = createPinia();
  const app = createApp(App);

  app.use(pinia);
  app.mount(shadow);

  console.info('[VueRewrite] Overlay initialized');
}

// Auto-initialize
init();

export { bridge };
