import { join as pathJoin } from 'path';
import { existsSync, readFileSync } from 'fs';

// 在 inject.ts 开头临时加
console.log('>>> [inject] cwd:', process.cwd());
const cssTestPath = pathJoin(process.cwd(), '..', 'packages', 'overlay', 'dist', 'overlay.css');
console.log('>>> [inject] cssTestPath:', cssTestPath);
console.log('>>> [inject] exists:', existsSync(cssTestPath));

// overlay 包所在目录（从当前工作目录向上找到 monorepo 根）
const OVERLAY_PKG_DIR = pathJoin(process.cwd(), '..', 'packages');

export function injectOverlayScript(html: string, wsPort: number): string {
  // Debug - inside function so it runs on each call
  console.log('>>> [inject] cwd:', process.cwd());
  const cssTestPath = pathJoin(process.cwd(), '..', 'packages', 'overlay', 'dist', 'overlay.css');
  console.log('>>> [inject] cssTestPath:', cssTestPath);
  console.log('>>> [inject] exists:', existsSync(cssTestPath));

  // Don't inject twice
  if (html.includes('vue-rewrite-overlay')) {
    return html;
  }

  // 读取 CSS 内容 - 从 overlay 包目录读取
  const cssPaths = [
    pathJoin(process.cwd(), '..', 'packages', 'overlay', 'dist', 'overlay.css'),
  ];
  let cssContent = '';
  for (const p of cssPaths) {
    if (existsSync(p)) {
      cssContent = readFileSync(p, 'utf-8');
      console.log('>>> [inject] read CSS length:', cssContent.length, 'first 100:', cssContent.substring(0, 100));
      break;
    }
  }

  const script = `
  <script type="module">
    window.__VUE_REWRITE_WS_PORT__ = ${wsPort};
    window.__VUE_REWRITE_CSS_CONTENT__ = ${JSON.stringify(cssContent)};
  <\/script>
  <script type="module" src="/__vue-rewrite/overlay.js"><\/script>
  `;

  console.log('>>> [inject] script style content length:', cssContent.length);

  // Inject before closing </body> or at end of <head> if no body
  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`);
  } else if (html.includes('</head>')) {
    return html.replace('</head>', `${script}</head>`);
  } else {
    return html + script;
  }
}
