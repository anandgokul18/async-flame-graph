/**
 * Export utilities — Generate PNG and SVG from the flame graph canvas
 */

import type { FlameData, ProcessedSpan } from "./flameEngine";
import { formatDuration } from "./flameEngine";

const ROW_HEIGHT = 26;
const ROW_GAP = 2;
const FONT_SIZE = 11;
const TIMELINE_HEIGHT = 36;
const PADDING_TOP = 10;
const MIN_BAR_WIDTH = 2;
const ASYNC_INDICATOR_HEIGHT = 3;

// ─── PNG Export ─────────────────────────────────────────────────────────────

export function exportAsPNG(
  data: FlameData,
  focusedSpan: ProcessedSpan | null,
  searchQuery: string,
): void {
  const canvas = document.createElement('canvas');
  const width = 1920;
  const height = TIMELINE_HEIGHT + PADDING_TOP + (data.maxDepth + 1) * (ROW_HEIGHT + ROW_GAP) + 40;

  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // Render the flame graph
  renderFlameGraphToContext(ctx, width, height, data, focusedSpan, searchQuery);

  // Download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flame-graph-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ─── SVG Export ─────────────────────────────────────────────────────────────

export function exportAsSVG(
  data: FlameData,
  focusedSpan: ProcessedSpan | null,
  searchQuery: string,
): void {
  const width = 1920;
  const height = TIMELINE_HEIGHT + PADDING_TOP + (data.maxDepth + 1) * (ROW_HEIGHT + ROW_GAP) + 40;

  const svgParts: string[] = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);

  // Background
  svgParts.push(`<rect width="${width}" height="${height}" fill="#0D1117"/>`);

  // Fonts
  svgParts.push(`<style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&amp;display=swap');
    text { font-family: 'JetBrains Mono', monospace; }
  </style>`);

  const focusX = focusedSpan ? focusedSpan.x : 0;
  const focusW = focusedSpan ? focusedSpan.width : 1;

  // Timeline
  const focusStart = focusedSpan ? focusedSpan.startTime : 0;
  const focusDuration = focusedSpan ? focusedSpan.duration : data.totalDuration;
  const targetTicks = width / 120;
  const rawInterval = focusDuration / targetTicks;
  const niceIntervals = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 30, 60];
  let interval = niceIntervals[0];
  for (const ni of niceIntervals) {
    if (ni >= rawInterval) { interval = ni; break; }
  }

  // Timeline background
  svgParts.push(`<rect x="0" y="0" width="${width}" height="${TIMELINE_HEIGHT}" fill="#0D1117"/>`);
  svgParts.push(`<line x1="0" y1="${TIMELINE_HEIGHT - 0.5}" x2="${width}" y2="${TIMELINE_HEIGHT - 0.5}" stroke="#21262D" stroke-width="1"/>`);

  // Timeline ticks
  for (let t = 0; t <= focusDuration + interval; t += interval) {
    const normalizedT = t / focusDuration;
    const pixelX = normalizedT * width;
    if (pixelX < -20 || pixelX > width + 20) continue;

    svgParts.push(`<line x1="${pixelX}" y1="${TIMELINE_HEIGHT - 8}" x2="${pixelX}" y2="${TIMELINE_HEIGHT - 1}" stroke="#30363D" stroke-width="1"/>`);
    svgParts.push(`<text x="${pixelX}" y="${TIMELINE_HEIGHT - 12}" fill="#8B949E" font-size="${FONT_SIZE - 1}" text-anchor="middle">${formatDuration(focusStart + t)}</text>`);
  }

  // Search matches
  const searchMatches = new Set<string>();
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    for (const s of data.allSpans) {
      if (s.name.toLowerCase().includes(query)) {
        searchMatches.add(s.id);
      }
    }
  }

  // Render spans
  const allVisible = getAllSpans(data.root);
  for (const span of allVisible) {
    const normalizedX = focusW > 0 ? (span.x - focusX) / focusW : span.x;
    const normalizedW = focusW > 0 ? span.width / focusW : span.width;

    const pixelX = normalizedX * width;
    const pixelW = Math.max(MIN_BAR_WIDTH, normalizedW * width);
    const pixelY = TIMELINE_HEIGHT + PADDING_TOP + span.depth * (ROW_HEIGHT + ROW_GAP);

    if (pixelX + pixelW < 0 || pixelX > width) continue;
    if (pixelW < 0.5) continue;

    let opacity = 1;
    if (searchQuery && searchMatches.size > 0 && !searchMatches.has(span.id)) {
      opacity = 0.25;
    }

    const radius = pixelW > 6 ? 3 : 1;

    // Bar
    svgParts.push(`<rect x="${pixelX}" y="${pixelY}" width="${pixelW}" height="${ROW_HEIGHT}" rx="${radius}" fill="${span.color}" opacity="${opacity}"/>`);

    // Dark border
    svgParts.push(`<rect x="${pixelX}" y="${pixelY}" width="${pixelW}" height="${ROW_HEIGHT}" rx="${radius}" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="0.5" opacity="${opacity}"/>`);

    // Async indicator
    if (span.isAsync || span.isParallel) {
      svgParts.push(`<rect x="${pixelX}" y="${pixelY}" width="${pixelW}" height="${ASYNC_INDICATOR_HEIGHT}" fill="#00D4FF" opacity="${opacity}"/>`);
    }

    // Text label
    if (pixelW > 40) {
      let text = span.name;
      const timeStr = ` (${formatDuration(span.duration)})`;
      if (pixelW > 150) text = text + timeStr;

      // Rough truncation
      const charWidth = 6.5;
      const maxChars = Math.floor((pixelW - 8) / charWidth);
      if (text.length > maxChars) {
        text = text.slice(0, maxChars - 3) + '...';
      }

      const textX = pixelX + 4;
      const textY = pixelY + ROW_HEIGHT / 2 + 4;

      svgParts.push(`<text x="${textX}" y="${textY}" fill="#FFFFFF" font-size="${FONT_SIZE}" opacity="${opacity}" clip-path="url(#clip-${span.id})">${escapeXml(text)}</text>`);
    }
  }

  svgParts.push('</svg>');

  // Download
  const svgContent = svgParts.join('\n');
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flame-graph-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAllSpans(root: ProcessedSpan): ProcessedSpan[] {
  const result: ProcessedSpan[] = [];
  function traverse(span: ProcessedSpan) {
    result.push(span);
    for (const child of span.children) traverse(child);
  }
  traverse(root);
  return result;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderFlameGraphToContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: FlameData,
  focusedSpan: ProcessedSpan | null,
  searchQuery: string,
): void {
  // Background
  ctx.fillStyle = '#0D1117';
  ctx.fillRect(0, 0, width, height);

  const focusX = focusedSpan ? focusedSpan.x : 0;
  const focusW = focusedSpan ? focusedSpan.width : 1;
  const focusStart = focusedSpan ? focusedSpan.startTime : 0;
  const focusDuration = focusedSpan ? focusedSpan.duration : data.totalDuration;

  // Timeline
  ctx.fillStyle = '#0D1117';
  ctx.fillRect(0, 0, width, TIMELINE_HEIGHT);
  ctx.strokeStyle = '#21262D';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, TIMELINE_HEIGHT - 0.5);
  ctx.lineTo(width, TIMELINE_HEIGHT - 0.5);
  ctx.stroke();

  const targetTicks = width / 120;
  const rawInterval = focusDuration / targetTicks;
  const niceIntervals = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 30, 60];
  let interval = niceIntervals[0];
  for (const ni of niceIntervals) {
    if (ni >= rawInterval) { interval = ni; break; }
  }

  ctx.font = `${FONT_SIZE - 1}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  for (let t = 0; t <= focusDuration + interval; t += interval) {
    const normalizedT = t / focusDuration;
    const pixelX = normalizedT * width;
    if (pixelX < -20 || pixelX > width + 20) continue;

    ctx.strokeStyle = '#30363D';
    ctx.beginPath();
    ctx.moveTo(pixelX, TIMELINE_HEIGHT - 8);
    ctx.lineTo(pixelX, TIMELINE_HEIGHT - 1);
    ctx.stroke();

    ctx.fillStyle = '#8B949E';
    ctx.fillText(formatDuration(focusStart + t), pixelX, TIMELINE_HEIGHT - 10);
  }

  // Grid lines
  ctx.strokeStyle = 'rgba(48, 54, 61, 0.3)';
  ctx.lineWidth = 1;
  for (let t = 0; t <= focusDuration + interval; t += interval) {
    const normalizedT = t / focusDuration;
    const pixelX = normalizedT * width;
    if (pixelX < 0 || pixelX > width) continue;
    ctx.beginPath();
    ctx.moveTo(pixelX, TIMELINE_HEIGHT);
    ctx.lineTo(pixelX, height);
    ctx.stroke();
  }

  // Search matches
  const searchMatches = new Set<string>();
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    for (const s of data.allSpans) {
      if (s.name.toLowerCase().includes(query)) searchMatches.add(s.id);
    }
  }

  // Render spans
  const allVisible = getAllSpans(data.root);
  for (const span of allVisible) {
    const normalizedX = focusW > 0 ? (span.x - focusX) / focusW : span.x;
    const normalizedW = focusW > 0 ? span.width / focusW : span.width;

    const pixelX = normalizedX * width;
    const pixelW = Math.max(MIN_BAR_WIDTH, normalizedW * width);
    const pixelY = TIMELINE_HEIGHT + PADDING_TOP + span.depth * (ROW_HEIGHT + ROW_GAP);

    if (pixelX + pixelW < 0 || pixelX > width) continue;
    if (pixelW < 0.5) continue;

    let alpha = 1;
    if (searchQuery && searchMatches.size > 0 && !searchMatches.has(span.id)) {
      alpha = 0.25;
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = span.color;

    const radius = pixelW > 6 ? 3 : 1;
    ctx.beginPath();
    ctx.roundRect(pixelX, pixelY, pixelW, ROW_HEIGHT, radius);
    ctx.fill();

    // Dark border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(pixelX, pixelY, pixelW, ROW_HEIGHT, radius);
    ctx.stroke();

    // Async indicator
    if (span.isAsync || span.isParallel) {
      ctx.fillStyle = '#00D4FF';
      ctx.fillRect(pixelX, pixelY, pixelW, ASYNC_INDICATOR_HEIGHT);
    }

    // Text label
    if (pixelW > 40) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const textY = pixelY + ROW_HEIGHT / 2;
      const textX = pixelX + 4;
      const maxTextWidth = pixelW - 8;

      let text = span.name;
      const timeStr = ` (${formatDuration(span.duration)})`;
      if (pixelW > 150) text = text + timeStr;

      let measured = ctx.measureText(text);
      if (measured.width > maxTextWidth) {
        while (text.length > 3 && ctx.measureText(text + '...').width > maxTextWidth) {
          text = text.slice(0, -1);
        }
        text = text + '...';
      }

      ctx.fillText(text, textX, textY);
    }

    ctx.globalAlpha = 1;
  }
}
