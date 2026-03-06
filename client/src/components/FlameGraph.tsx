/**
 * FlameGraph — Custom canvas-based flame graph visualization
 * 
 * Design: Observatory dark console
 * Features: async/parallel paper-stack, zoom, pan, search, focus, tooltips
 * Time axis shows seconds (wall-clock time)
 * 
 * Paper-Stack: Parallel children are shown one at a time with a visual
 * stack indicator. Click the HTML overlay badge to cycle through siblings.
 */

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import type { FlameData, ProcessedSpan } from "@/lib/flameEngine";
import { formatDuration } from "@/lib/flameEngine";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROW_HEIGHT = 26;
const ROW_GAP = 2;
const MIN_BAR_WIDTH = 2;
const FONT_SIZE = 11;
const TIMELINE_HEIGHT = 36;
const PADDING_TOP = 10;

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlameGraphProps {
  data: FlameData;
  searchQuery: string;
  colorMode: 'self-time' | 'package';
  onSpanClick?: (span: ProcessedSpan) => void;
  onSpanHover?: (span: ProcessedSpan | null, x: number, y: number) => void;
  focusedSpan?: ProcessedSpan | null;
  activeParallelPages: Map<string, number>;
  onCycleParallelPage?: (groupId: string) => void;
}

export interface FlameGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
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
    if (span.width <= 0) return;

    const normalizedX = focusW > 0 ? (span.x - focusX) / focusW : span.x;
    const normalizedW = focusW > 0 ? span.width / focusW : span.width;

    const pixelX = (normalizedX * viewState.zoom + viewState.offsetX) * canvasWidth;
    const pixelW = normalizedW * viewState.zoom * canvasWidth;

    if (pixelX + pixelW < -50 || pixelX > canvasWidth + 50) return;
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

function getHitSpan(
  spans: ProcessedSpan[],
  mouseX: number,
  mouseY: number,
  viewState: ViewState,
  canvasWidth: number,
  focusedSpan?: ProcessedSpan | null,
): ProcessedSpan | null {
  const focusX = focusedSpan ? focusedSpan.x : 0;
  const focusW = focusedSpan ? focusedSpan.width : 1;

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

  ctx.strokeStyle = '#21262D';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, TIMELINE_HEIGHT - 0.5);
  ctx.lineTo(width, TIMELINE_HEIGHT - 0.5);
  ctx.stroke();

  const visibleDuration = focusDuration / viewState.zoom;
  const targetTicks = width / 120;
  const rawInterval = visibleDuration / targetTicks;

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

    ctx.strokeStyle = '#30363D';
    ctx.beginPath();
    ctx.moveTo(pixelX, TIMELINE_HEIGHT - 8);
    ctx.lineTo(pixelX, TIMELINE_HEIGHT - 1);
    ctx.stroke();

    ctx.fillStyle = '#8B949E';
    ctx.fillText(formatDuration(t), pixelX, TIMELINE_HEIGHT - 10);
  }
}

// ─── Paper Stack Drawing (canvas only — visual layers) ──────────────────────

function drawPaperStackLayers(
  ctx: CanvasRenderingContext2D,
  pixelX: number,
  pixelY: number,
  pixelW: number,
  totalCount: number,
) {
  const stackLayers = Math.min(totalCount - 1, 3);
  
  for (let i = stackLayers; i >= 1; i--) {
    const offsetX = i * 3;
    const offsetY = -i * 2;
    
    ctx.fillStyle = `rgba(33, 38, 45, ${0.6 + i * 0.1})`;
    ctx.strokeStyle = 'rgba(48, 54, 61, 0.6)';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.roundRect(
      pixelX + offsetX,
      pixelY + offsetY,
      Math.max(pixelW - offsetX, 20),
      ROW_HEIGHT,
      3
    );
    ctx.fill();
    ctx.stroke();
  }
}

// ─── Badge position info for HTML overlays ──────────────────────────────────

interface BadgeInfo {
  groupId: string;
  activeIndex: number;
  totalCount: number;
  x: number;
  y: number;
}

// ─── Main Component ──────────────────────────────────────────────────────────

const FlameGraph = forwardRef<FlameGraphHandle, FlameGraphProps>(function FlameGraph({
  data,
  searchQuery,
  colorMode,
  onSpanClick,
  onSpanHover,
  focusedSpan,
  activeParallelPages,
  onCycleParallelPage,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<ViewState>({ offsetX: 0, zoom: 1 });
  const [hoveredSpan, setHoveredSpan] = useState<ProcessedSpan | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, offsetX: 0 });
  const animFrameRef = useRef<number>(0);
  const [badges, setBadges] = useState<BadgeInfo[]>([]);

  // Calculate canvas height based on max depth
  const canvasHeight = useMemo(() => {
    return TIMELINE_HEIGHT + PADDING_TOP + (data.maxDepth + 1) * (ROW_HEIGHT + ROW_GAP) + 20;
  }, [data.maxDepth]);

  // Actual pixel height for canvas buffer (match CSS height)
  const actualHeight = Math.max(canvasSize.height, canvasHeight);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
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
    const q = searchQuery.toLowerCase();
    const matches = new Set<string>();
    for (const span of visibleSpans) {
      if (span.name.toLowerCase().includes(q)) {
        matches.add(span.id);
      }
    }
    return matches;
  }, [visibleSpans, searchQuery]);

  // ─── Canvas Rendering ─────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvasSize.width;
    const h = actualHeight;

    // Clear
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, w, h);

    // Timeline
    drawTimeline(ctx, w, data.totalDuration, viewState, focusedSpan);

    const focusX = focusedSpan ? focusedSpan.x : 0;
    const focusW = focusedSpan ? focusedSpan.width : 1;

    // Collect badge positions
    const newBadges: BadgeInfo[] = [];

    // Draw spans
    for (const span of visibleSpans) {
      const normalizedX = focusW > 0 ? (span.x - focusX) / focusW : span.x;
      const normalizedW = focusW > 0 ? span.width / focusW : span.width;

      const pixelX = (normalizedX * viewState.zoom + viewState.offsetX) * w;
      const pixelW = Math.max(MIN_BAR_WIDTH, normalizedW * viewState.zoom * w);
      const pixelY = TIMELINE_HEIGHT + PADDING_TOP + span.depth * (ROW_HEIGHT + ROW_GAP);

      // Draw paper-stack background layers BEFORE the main bar
      if (
        span.parallelGroupId !== undefined &&
        span.parallelSiblingCount !== undefined &&
        span.parallelSiblingCount > 1 &&
        span.parallelIndex !== undefined &&
        pixelW > 30
      ) {
        drawPaperStackLayers(ctx, pixelX, pixelY, pixelW, span.parallelSiblingCount);
      }

      // Bar color
      let barColor = span.color;
      const isHovered = hoveredSpan?.id === span.id;
      const isSearchMatch = searchQuery && searchMatches.has(span.id);
      const isSearchDimmed = searchQuery && !searchMatches.has(span.id);

      if (isSearchDimmed) {
        ctx.globalAlpha = 0.25;
      }

      // Main bar
      const r = 3;
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(pixelX, pixelY, pixelW, ROW_HEIGHT, r);
      ctx.fill();

      // Border
      ctx.strokeStyle = isHovered
        ? 'rgba(0, 212, 255, 0.8)'
        : isSearchMatch
          ? 'rgba(255, 215, 0, 0.8)'
          : 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = isHovered || isSearchMatch ? 2 : 1;
      ctx.stroke();

      // Async indicator
      if (span.isConcurrent) {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.7)';
        ctx.fillRect(pixelX, pixelY + ROW_HEIGHT - 3, pixelW, 3);
      }

      // Collect badge info for HTML overlay
      if (
        span.parallelGroupId !== undefined &&
        span.parallelSiblingCount !== undefined &&
        span.parallelSiblingCount > 1 &&
        span.parallelIndex !== undefined &&
        pixelW > 30
      ) {
        const activeIdx = activeParallelPages.get(span.parallelGroupId) ?? 0;
        newBadges.push({
          groupId: span.parallelGroupId,
          activeIndex: activeIdx,
          totalCount: span.parallelSiblingCount,
          x: pixelX + pixelW - 40,
          y: pixelY + 3,
        });
      }

      // Text label
      if (pixelW > 20) {
        ctx.fillStyle = '#E6EDF3';
        ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const textY = pixelY + ROW_HEIGHT / 2;
        const textX = pixelX + 4;
        const hasBadge = span.parallelGroupId !== undefined &&
          span.parallelSiblingCount !== undefined &&
          span.parallelSiblingCount > 1 &&
          pixelW > 30;
        const badgeReserve = hasBadge ? 50 : 0;
        const maxTextWidth = pixelW - 8 - badgeReserve;

        if (maxTextWidth > 20) {
          let text = span.name;
          const timeStr = ` (${formatDuration(span.duration)})`;

          if (pixelW > 150 + badgeReserve) {
            text = text + timeStr;
          }

          const measured = ctx.measureText(text);
          if (measured.width > maxTextWidth) {
            while (text.length > 3 && ctx.measureText(text + '...').width > maxTextWidth) {
              text = text.slice(0, -1);
            }
            text = text + '...';
          }

          ctx.fillText(text, textX, textY);
        }
      }

      ctx.globalAlpha = 1;
    }

    setBadges(newBadges);
  }, [canvasSize, actualHeight, data, viewState, visibleSpans, hoveredSpan, searchQuery, searchMatches, focusedSpan, activeParallelPages]);

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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (isDragging.current) {
      const dx = (e.clientX - dragStart.current.x) / canvasSize.width;
      setViewState(prev => ({
        ...prev,
        offsetX: dragStart.current.offsetX + dx,
      }));
      return;
    }

    const hit = getHitSpan(
      visibleSpans, mouseX, mouseY, viewState, canvasSize.width, focusedSpan
    );
    setHoveredSpan(hit);
    onSpanHover?.(hit, e.clientX, e.clientY);

    canvas.style.cursor = hit ? 'pointer' : 'default';
  }, [visibleSpans, viewState, canvasSize.width, focusedSpan, onSpanHover]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, offsetX: viewState.offsetX };
  }, [viewState.offsetX]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging.current) {
      const dx = Math.abs(e.clientX - dragStart.current.x);
      isDragging.current = false;

      if (dx < 3) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const hit = getHitSpan(
          visibleSpans, mouseX, mouseY, viewState, canvasSize.width, focusedSpan
        );

        if (hit) {
          onSpanClick?.(hit);
        }
      }
    }
  }, [visibleSpans, viewState, canvasSize.width, focusedSpan, onSpanClick]);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    setHoveredSpan(null);
    onSpanHover?.(null, 0, 0);
  }, [onSpanHover]);

  // ─── Imperative zoom controls (exposed via ref) ────────────────────────

  const zoomIn = useCallback(() => {
    setViewState(prev => {
      const newZoom = Math.min(500, prev.zoom * 1.4);
      const center = 0.5;
      const newOffsetX = center - (center - prev.offsetX) * (newZoom / prev.zoom);
      return { zoom: newZoom, offsetX: newOffsetX };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setViewState(prev => {
      const newZoom = Math.max(1, prev.zoom / 1.4);
      const center = 0.5;
      const newOffsetX = center - (center - prev.offsetX) * (newZoom / prev.zoom);
      return { zoom: newZoom, offsetX: newOffsetX };
    });
  }, []);

  const resetZoom = useCallback(() => {
    setViewState({ offsetX: 0, zoom: 1 });
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn,
    zoomOut,
    resetZoom,
  }), [zoomIn, zoomOut, resetZoom]);

  // Reset view
  useEffect(() => {
    setViewState({ offsetX: 0, zoom: 1 });
  }, [data]);

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ overflow: 'auto' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={actualHeight}
        style={{
          width: canvasSize.width,
          height: actualHeight,
          display: 'block',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {/* HTML overlay badges for paper-stack cycling — much more reliable than canvas hit detection */}
      {badges.map((badge) => (
        <button
          key={badge.groupId}
          onClick={(e) => {
            e.stopPropagation();
            onCycleParallelPage?.(badge.groupId);
          }}
          className="absolute flex items-center justify-center select-none"
          style={{
            left: badge.x,
            top: badge.y,
            height: 18,
            minWidth: 32,
            padding: '0 6px',
            borderRadius: 9,
            background: 'rgba(0, 212, 255, 0.9)',
            color: '#0D1117',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer',
            zIndex: 10,
            border: '1px solid rgba(0, 212, 255, 0.4)',
            transition: 'transform 0.1s ease, background 0.1s ease',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(0, 212, 255, 1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(0, 212, 255, 0.9)';
          }}
          title={`Click to cycle through ${badge.totalCount} parallel tasks (${badge.activeIndex + 1}/${badge.totalCount})`}
        >
          {badge.activeIndex + 1}/{badge.totalCount}
        </button>
      ))}
    </div>
  );
});

export default FlameGraph;
