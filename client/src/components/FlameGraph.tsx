/**
 * FlameGraph — Custom canvas-based flame graph visualization
 * 
 * Design: Observatory dark console
 * Features: async/parallel lanes, zoom, pan, search, focus, tooltips
 * Time axis shows seconds (wall-clock time)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FlameData, ProcessedSpan } from "@/lib/flameEngine";
import { formatDuration } from "@/lib/flameEngine";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROW_HEIGHT = 26;
const ROW_GAP = 2;
const MIN_BAR_WIDTH = 2;
const FONT_SIZE = 11;
const TIMELINE_HEIGHT = 36;
const PADDING_TOP = 10;
const ASYNC_INDICATOR_HEIGHT = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlameGraphProps {
  data: FlameData;
  searchQuery: string;
  colorMode: 'self-time' | 'package';
  onSpanClick?: (span: ProcessedSpan) => void;
  onSpanHover?: (span: ProcessedSpan | null, x: number, y: number) => void;
  focusedSpan?: ProcessedSpan | null;
}

interface ViewState {
  offsetX: number;
  zoom: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getVisibleSpans(
  root: ProcessedSpan,
  viewState: ViewState,
  canvasWidth: number,
  focusedSpan?: ProcessedSpan | null,
): ProcessedSpan[] {
  const result: ProcessedSpan[] = [];
  const focusX = focusedSpan ? focusedSpan.x : 0;
  const focusW = focusedSpan ? focusedSpan.width : 1;

  function traverse(span: ProcessedSpan) {
    // Normalize position relative to focus
    const normalizedX = focusW > 0 ? (span.x - focusX) / focusW : span.x;
    const normalizedW = focusW > 0 ? span.width / focusW : span.width;

    const pixelX = (normalizedX * viewState.zoom + viewState.offsetX) * canvasWidth;
    const pixelW = normalizedW * viewState.zoom * canvasWidth;

    // Cull off-screen spans
    if (pixelX + pixelW < -50 || pixelX > canvasWidth + 50) return;
    // Cull too-small spans (but still traverse children)
    if (pixelW >= 0.5) {
      result.push(span);
    }

    for (const child of span.children) {
      traverse(child);
    }
  }

  traverse(root);
  return result;
}

function getSpanAtPosition(
  spans: ProcessedSpan[],
  mouseX: number,
  mouseY: number,
  viewState: ViewState,
  canvasWidth: number,
  focusedSpan?: ProcessedSpan | null,
): ProcessedSpan | null {
  const focusX = focusedSpan ? focusedSpan.x : 0;
  const focusW = focusedSpan ? focusedSpan.width : 1;

  // Check from top (deepest spans first for correct z-order)
  const sorted = [...spans].sort((a, b) => b.depth - a.depth);

  for (const span of sorted) {
    const normalizedX = focusW > 0 ? (span.x - focusX) / focusW : span.x;
    const normalizedW = focusW > 0 ? span.width / focusW : span.width;

    const pixelX = (normalizedX * viewState.zoom + viewState.offsetX) * canvasWidth;
    const pixelW = normalizedW * viewState.zoom * canvasWidth;
    const pixelY = TIMELINE_HEIGHT + PADDING_TOP + span.depth * (ROW_HEIGHT + ROW_GAP);

    if (
      mouseX >= pixelX &&
      mouseX <= pixelX + pixelW &&
      mouseY >= pixelY &&
      mouseY <= pixelY + ROW_HEIGHT
    ) {
      return span;
    }
  }
  return null;
}

// ─── Timeline Rendering ──────────────────────────────────────────────────────

function drawTimeline(
  ctx: CanvasRenderingContext2D,
  width: number,
  totalDuration: number,
  viewState: ViewState,
  focusedSpan?: ProcessedSpan | null,
) {
  const focusStart = focusedSpan ? focusedSpan.startTime : 0;
  const focusDuration = focusedSpan ? focusedSpan.duration : totalDuration;

  ctx.fillStyle = '#0D1117';
  ctx.fillRect(0, 0, width, TIMELINE_HEIGHT);

  // Bottom border
  ctx.strokeStyle = '#21262D';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, TIMELINE_HEIGHT - 0.5);
  ctx.lineTo(width, TIMELINE_HEIGHT - 0.5);
  ctx.stroke();

  // Calculate tick interval
  const visibleDuration = focusDuration / viewState.zoom;
  const targetTicks = width / 120;
  const rawInterval = visibleDuration / targetTicks;

  // Nice intervals
  const niceIntervals = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 30, 60];
  let interval = niceIntervals[0];
  for (const ni of niceIntervals) {
    if (ni >= rawInterval) {
      interval = ni;
      break;
    }
  }

  const visibleStart = focusStart + (-viewState.offsetX / viewState.zoom) * focusDuration;
  const visibleEnd = visibleStart + visibleDuration;

  const firstTick = Math.floor(visibleStart / interval) * interval;

  ctx.font = `${FONT_SIZE - 1}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  for (let t = firstTick; t <= visibleEnd + interval; t += interval) {
    const normalizedT = (t - focusStart) / focusDuration;
    const pixelX = (normalizedT * viewState.zoom + viewState.offsetX) * width;

    if (pixelX < -20 || pixelX > width + 20) continue;

    // Tick mark
    ctx.strokeStyle = '#30363D';
    ctx.beginPath();
    ctx.moveTo(pixelX, TIMELINE_HEIGHT - 8);
    ctx.lineTo(pixelX, TIMELINE_HEIGHT - 1);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#8B949E';
    ctx.fillText(formatDuration(t), pixelX, TIMELINE_HEIGHT - 10);
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FlameGraph({
  data,
  searchQuery,
  colorMode,
  onSpanClick,
  onSpanHover,
  focusedSpan,
}: FlameGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<ViewState>({ offsetX: 0, zoom: 1 });
  const [hoveredSpan, setHoveredSpan] = useState<ProcessedSpan | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, offsetX: 0 });
  const animFrameRef = useRef<number>(0);

  // Calculate canvas height based on max depth
  const canvasHeight = useMemo(() => {
    return TIMELINE_HEIGHT + PADDING_TOP + (data.maxDepth + 1) * (ROW_HEIGHT + ROW_GAP) + 20;
  }, [data.maxDepth]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        // Always use data-driven height for rendering
        setCanvasSize({ width: w, height: canvasHeight });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [canvasHeight]);

  // Get visible spans
  const visibleSpans = useMemo(() => {
    return getVisibleSpans(data.root, viewState, canvasSize.width, focusedSpan);
  }, [data.root, viewState, canvasSize.width, focusedSpan]);

  // Search matching
  const searchMatches = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    const query = searchQuery.toLowerCase();
    return new Set(
      data.allSpans
        .filter(s => s.name.toLowerCase().includes(query))
        .map(s => s.id)
    );
  }, [searchQuery, data.allSpans]);

  // ─── Rendering ─────────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw timeline
    drawTimeline(ctx, canvasSize.width, data.totalDuration, viewState, focusedSpan);

    const focusX = focusedSpan ? focusedSpan.x : 0;
    const focusW = focusedSpan ? focusedSpan.width : 1;

    // Draw subtle vertical grid lines
    {
      const focusStart = focusedSpan ? focusedSpan.startTime : 0;
      const focusDuration = focusedSpan ? focusedSpan.duration : data.totalDuration;
      const visibleDuration = focusDuration / viewState.zoom;
      const targetTicks = canvasSize.width / 120;
      const rawInterval = visibleDuration / targetTicks;
      const niceIntervals = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 30, 60];
      let interval = niceIntervals[0];
      for (const ni of niceIntervals) {
        if (ni >= rawInterval) { interval = ni; break; }
      }
      const visibleStart = focusStart + (-viewState.offsetX / viewState.zoom) * focusDuration;
      const visibleEnd = visibleStart + visibleDuration;
      const firstTick = Math.floor(visibleStart / interval) * interval;

      ctx.strokeStyle = 'rgba(48, 54, 61, 0.3)';
      ctx.lineWidth = 1;
      for (let t = firstTick; t <= visibleEnd + interval; t += interval) {
        const normalizedT = (t - focusStart) / focusDuration;
        const pixelX = (normalizedT * viewState.zoom + viewState.offsetX) * canvasSize.width;
        if (pixelX < 0 || pixelX > canvasSize.width) continue;
        ctx.beginPath();
        ctx.moveTo(pixelX, TIMELINE_HEIGHT);
        ctx.lineTo(pixelX, canvasSize.height);
        ctx.stroke();
      }
    }

    // Draw async group lane backgrounds FIRST (behind spans)
    for (const span of data.allSpans) {
      if (!span.isAsync || span.children.length < 2) continue;

      let minChildDepth = Infinity;
      let maxChildDepth = -Infinity;
      const collectDepthsBg = (s: ProcessedSpan) => {
        minChildDepth = Math.min(minChildDepth, s.depth);
        maxChildDepth = Math.max(maxChildDepth, s.depth);
        s.children.forEach(collectDepthsBg);
      };
      span.children.forEach(collectDepthsBg);

      if (minChildDepth <= maxChildDepth) {
        const laneTop = TIMELINE_HEIGHT + PADDING_TOP + minChildDepth * (ROW_HEIGHT + ROW_GAP) - 2;
        const laneBottom = TIMELINE_HEIGHT + PADDING_TOP + (maxChildDepth + 1) * (ROW_HEIGHT + ROW_GAP);

        // Subtle lane background
        ctx.fillStyle = 'rgba(0, 212, 255, 0.03)';
        ctx.fillRect(0, laneTop, canvasSize.width, laneBottom - laneTop);

        // Left edge indicator
        ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.fillRect(0, laneTop, 3, laneBottom - laneTop);

        // Draw lane separator lines between parallel children
        for (let i = 0; i < span.children.length; i++) {
          const child = span.children[i];
          if (i > 0) {
            const separatorY = TIMELINE_HEIGHT + PADDING_TOP + child.depth * (ROW_HEIGHT + ROW_GAP) - 1;
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, separatorY);
            ctx.lineTo(canvasSize.width, separatorY);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    // Draw spans
    for (const span of visibleSpans) {
      const normalizedX = focusW > 0 ? (span.x - focusX) / focusW : span.x;
      const normalizedW = focusW > 0 ? span.width / focusW : span.width;

      const pixelX = (normalizedX * viewState.zoom + viewState.offsetX) * canvasSize.width;
      const pixelW = Math.max(MIN_BAR_WIDTH, normalizedW * viewState.zoom * canvasSize.width);
      const pixelY = TIMELINE_HEIGHT + PADDING_TOP + span.depth * (ROW_HEIGHT + ROW_GAP);

      // Determine color
      let fillColor = span.color;
      let alpha = 1;

      if (searchQuery && searchMatches.size > 0) {
        if (!searchMatches.has(span.id)) {
          alpha = 0.25;
        }
      }

      if (hoveredSpan && hoveredSpan.id === span.id) {
        alpha = 0.85;
      }

      // Draw bar
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fillColor;

      // Rounded corners for wider bars
      const radius = pixelW > 6 ? 3 : 1;
      ctx.beginPath();
      ctx.roundRect(pixelX, pixelY, pixelW, ROW_HEIGHT, radius);
      ctx.fill();

      // Subtle dark border for depth
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(pixelX, pixelY, pixelW, ROW_HEIGHT, radius);
      ctx.stroke();

      // Async indicator (small colored strip at top)
      if (span.isAsync || span.isParallel) {
        ctx.fillStyle = '#00D4FF';
        ctx.fillRect(pixelX, pixelY, pixelW, ASYNC_INDICATOR_HEIGHT);
      }

      // Hover highlight
      if (hoveredSpan && hoveredSpan.id === span.id) {
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(pixelX, pixelY, pixelW, ROW_HEIGHT, radius);
        ctx.stroke();
      }

      // Focus highlight
      if (focusedSpan && focusedSpan.id === span.id) {
        ctx.strokeStyle = '#FFB020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(pixelX, pixelY, pixelW, ROW_HEIGHT, radius);
        ctx.stroke();
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

        // Truncate text
        let text = span.name;
        const timeStr = ` (${formatDuration(span.duration)})`;

        if (pixelW > 150) {
          text = text + timeStr;
        }

        // Measure and truncate
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

    // (Lane backgrounds already drawn before spans)
  }, [canvasSize, data, viewState, visibleSpans, hoveredSpan, searchQuery, searchMatches, focusedSpan]);

  // Render on state change
  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  // ─── Event Handlers ────────────────────────────────────────────────────────

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging.current) {
      const dx = (e.clientX - dragStart.current.x) / canvasSize.width;
      setViewState(prev => ({
        ...prev,
        offsetX: dragStart.current.offsetX + dx,
      }));
      return;
    }

    const span = getSpanAtPosition(
      visibleSpans, mouseX, mouseY, viewState, canvasSize.width, focusedSpan
    );
    setHoveredSpan(span);
    onSpanHover?.(span, e.clientX, e.clientY);

    canvas.style.cursor = span ? 'pointer' : 'default';
  }, [visibleSpans, viewState, canvasSize.width, focusedSpan, onSpanHover]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, offsetX: viewState.offsetX };
  }, [viewState.offsetX]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging.current) {
      const dx = Math.abs(e.clientX - dragStart.current.x);
      isDragging.current = false;

      // If barely moved, treat as click
      if (dx < 3) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const span = getSpanAtPosition(
          visibleSpans, mouseX, mouseY, viewState, canvasSize.width, focusedSpan
        );
        if (span) {
          onSpanClick?.(span);
        }
      }
    }
  }, [visibleSpans, viewState, canvasSize.width, focusedSpan, onSpanClick]);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    setHoveredSpan(null);
    onSpanHover?.(null, 0, 0);
  }, [onSpanHover]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / canvasSize.width;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

    setViewState(prev => {
      const newZoom = Math.max(1, Math.min(500, prev.zoom * zoomFactor));
      // Zoom towards mouse position
      const newOffsetX = mouseX - (mouseX - prev.offsetX) * (newZoom / prev.zoom);

      return {
        zoom: newZoom,
        offsetX: newOffsetX,
      };
    });
  }, [canvasSize.width]);

  // Reset view
  useEffect(() => {
    setViewState({ offsetX: 0, zoom: 1 });
  }, [data]);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ overflow: 'auto' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          width: canvasSize.width,
          height: Math.max(canvasSize.height, canvasHeight),
          display: 'block',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
    </div>
  );
}
