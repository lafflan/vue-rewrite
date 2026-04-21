<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useSelectionStore } from '../stores/selection';
import { useCanvasStore } from '../stores/canvas';

const selectionStore = useSelectionStore();
const canvasStore = useCanvasStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);

// Animation state
const highlights = ref<Map<string, { x: number; y: number; width: number; height: number; opacity: number }>>(new Map());
let animationFrame: number | null = null;

const canvasStyle = computed(() => ({
  position: 'fixed' as const,
  inset: 0,
  pointerEvents: 'none' as const,
  zIndex: 999998,
}));

function setupCanvas() {
  if (!canvasRef.value) return;

  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvasRef.value.width = w * dpr;
  canvasRef.value.height = h * dpr;
  canvasRef.value.style.width = `${w}px`;
  canvasRef.value.style.height = `${h}px`;

  ctx.value = canvasRef.value.getContext('2d');
  if (ctx.value) {
    ctx.value.scale(dpr, dpr);
  }
}

function render() {
  if (!ctx.value || !canvasRef.value) return;

  // 仅刷新当前需要绘制的元素位置（高性能：避免全量扫描）
  const idsToRefresh = new Set<string>();
  if (selectionStore.selectedId) idsToRefresh.add(selectionStore.selectedId);
  if (selectionStore.hoveredId) idsToRefresh.add(selectionStore.hoveredId);
  canvasStore.moves.forEach((_, id) => idsToRefresh.add(id));

  idsToRefresh.forEach((id) => {
    const el = document.querySelector(`[data-vr-id="${id}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) updateElementHighlight(id, rect);
    }
  });

  const c = ctx.value;
  const width = canvasRef.value.width / (window.devicePixelRatio || 1);
  const height = canvasRef.value.height / (window.devicePixelRatio || 1);

  // Clear canvas
  c.clearRect(0, 0, width, height);

  // Apply transform
  c.save();
  c.translate(canvasStore.transform.x, canvasStore.transform.y);
  c.scale(canvasStore.transform.scale, canvasStore.transform.scale);

  // Draw selection highlight
  if (selectionStore.hasSelection && selectionStore.selectedId) {
    const rect = highlights.value.get(selectionStore.selectedId);
    if (rect) {
      drawHighlight(c, rect, '#3b82f6', 2);
    }
  }

  // Draw hover highlight
  if (selectionStore.hoveredId && selectionStore.hoveredId !== selectionStore.selectedId) {
    const rect = highlights.value.get(selectionStore.hoveredId);
    if (rect) {
      drawHighlight(c, { ...rect, opacity: 0.3 }, '#94a3b8', 1);
    }
  }

  // Draw move previews
  canvasStore.moves.forEach((move) => {
    drawHighlight(c, {
      x: move.currentRect.left,
      y: move.currentRect.top,
      width: move.currentRect.width,
      height: move.currentRect.height,
      opacity: 0.5,
    }, '#f59e0b', 2);
  });

  c.restore();

  animationFrame = requestAnimationFrame(render);
}

function drawHighlight(
  c: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number; opacity: number },
  color: string,
  lineWidth: number
) {
  c.save();
  c.globalAlpha = rect.opacity;
  c.strokeStyle = color;
  c.lineWidth = lineWidth;
  c.setLineDash([4, 4]);

  // Draw rect
  c.strokeRect(rect.x, rect.y, rect.width, rect.height);

  // Draw corner handles for selection
  if (lineWidth > 1) {
    const handleSize = 8;
    c.setLineDash([]);

    // Top-left
    c.fillStyle = color;
    c.fillRect(rect.x - handleSize / 2, rect.y - handleSize / 2, handleSize, handleSize);

    // Top-right
    c.fillRect(rect.x + rect.width - handleSize / 2, rect.y - handleSize / 2, handleSize, handleSize);

    // Bottom-left
    c.fillRect(rect.x - handleSize / 2, rect.y + rect.height - handleSize / 2, handleSize, handleSize);

    // Bottom-right
    c.fillRect(rect.x + rect.width - handleSize / 2, rect.y + rect.height - handleSize / 2, handleSize, handleSize);
  }

  c.restore();
}

function updateElementHighlight(id: string, rect: DOMRect) {
  highlights.value.set(id, {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    opacity: 1,
  });
}

function removeElementHighlight(id: string) {
  highlights.value.delete(id);
}

// Listen for element highlights from DOM queries
function queryElementHighlights() {
  const elements = document.querySelectorAll('[data-vr-id]');

  elements.forEach((el) => {
    const id = el.getAttribute('data-vr-id');
    if (id) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        updateElementHighlight(id, rect);
      }
    }
  });
}

let resizeObserver: ResizeObserver | null = null;
let mutationObserver: MutationObserver | null = null;

onMounted(() => {
  setupCanvas();
  render();

  // Initial query
  queryElementHighlights();

  // Watch for element changes
  resizeObserver = new ResizeObserver(() => {
    queryElementHighlights();
  });

  mutationObserver = new MutationObserver(() => {
    queryElementHighlights();
  });

  // Observe body for added/removed elements
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-vr-id'],
  });

  window.addEventListener('resize', setupCanvas);
});

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  resizeObserver?.disconnect();
  mutationObserver?.disconnect();
  window.removeEventListener('resize', setupCanvas);
});
</script>

<template>
  <canvas ref="canvasRef" :style="canvasStyle"></canvas>
</template>
