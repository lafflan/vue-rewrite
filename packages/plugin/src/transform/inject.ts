export function injectOverlayScript(html: string, wsPort: number): string {
  // Don't inject twice
  if (html.includes('vue-rewrite-overlay')) {
    return html;
  }

  const script = `
  <script type="module">
    window.__VUE_REWRITE_WS_PORT__ = ${wsPort};
  <\/script>
  <script type="module" src="/__vue-rewrite/overlay.js"><\/script>
  `;

  // Inject before closing </body> or at end of <head> if no body
  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`);
  } else if (html.includes('</head>')) {
    return html.replace('</head>', `${script}</head>`);
  } else {
    return html + script;
  }
}
