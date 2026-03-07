/**
 * FlameGraph — Custom canvas-based flame graph visualization
 * 
 * Design: Observatory dark console
 * Features: async/parallel paper-stack, zoom, pan, search, focus, tooltips
 * Time axis shows seconds (wall-clock time)
 * 
 * Paper-Stack: Parallel children are shown one at a time with a visual
 * stack indicator. Badge is placed on the PARENT bar (the concurrent node)
 * to ensure it's always visible regardless of child size.
 * Click the HTML overlay badge to cycle through siblings.
 * 
 * DPR-aware: Canvas buffer is scaled by devicePixelRatio for crisp rendering
 * on retina/HiDPI displays.
 * 
 * Zoom: Virtual zoom via viewState { offsetX, zoom }.
 *   - offsetX is in normalized [0..1] space (fraction of total width)
 *   - zoom is a multiplier (1 = fit all, 10 = 10x magnification)
 *   - Custom scrollbar maps to the virtual viewport
 *   - Area-zoom: drag a rectangle to zoom into a region
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
const SCROLLBAR_HEIGHT = 14;
const SCROLLBAR_TRACK_COLOR = 'rgba(33, 38, 45, 0.8)';
const SCROLLBAR_THUMB_COLOR = 'rgba(0, 212, 255, 0.35)';
const SCROLLBAR_THUMB_HOVER_COLOR = 'rgba(0, 212, 255, 0.55)';
const SCROLLBAR_THUMB_ACTIVE_COLOR = 'rgba(0, 212, 255, 0.7)';

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
  areaZoomActive?: boolean;
  onAreaZoomComplete?: () => void;
}

export interface FlameGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  getZoomLevel: () => number;
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

// ─── Custom Scrollbar Drawing ───────────────────────────────────────────────

function drawScrollbar(
  ctx: CanvasRenderingContext2D,
  width: number,
  canvasHeight: number,
  viewState: ViewState,
  isHovered: boolean,
  isActive: boolean,
) {
  if (viewState.zoom <= 1) return; // No scrollbar needed at 1x

  const y = canvasHeight - SCROLLBAR_HEIGHT;

  // Track
  ctx.fillStyle = SCROLLBAR_TRACK_COLOR;
  ctx.fillRect(0, y, width, SCROLLBAR_HEIGHT);

  // Top border
  ctx.strokeStyle = '#30363D';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y + 0.5);
  ctx.lineTo(width, y + 0.5);
  ctx.stroke();

  // Thumb
  const thumbWidth = Math.max(30, width / viewState.zoom);
  const thumbX = (-viewState.offsetX / viewState.zoom) * width;
  const thumbPad = 2;

  ctx.fillStyle = isActive
    ? SCROLLBAR_THUMB_ACTIVE_COLOR
    : isHovered
      ? SCROLLBAR_THUMB_HOVER_COLOR
      : SCROLLBAR_THUMB_COLOR;

  ctx.beginPath();
  ctx.roundRect(
    Math.max(0, Math.min(thumbX, width - thumbWidth)),
    y + thumbPad,
    thumbWidth,
    SCROLLBAR_HEIGHT - thumbPad * 2,
    4
  );
  ctx.fill();
}

function getScrollbarThumbRect(
  width: number,
  canvasHeight: number,
  viewState: ViewState,
): { x: number; y: number; w: number; h: number } | null {
  if (viewState.zoom <= 1) return null;
  const y = canvasHeight - SCROLLBAR_HEIGHT;
  const thumbWidth = Math.max(30, width / viewState.zoom);
  const thumbX = (-viewState.offsetX / viewState.zoom) * width;
  return {
    x: Math.max(0, Math.min(thumbX, width - thumbWidth)),
    y: y + 2,
    w: thumbWidth,
    h: SCROLLBAR_HEIGHT - 4,
  };
}

// ─── Badge position info for HTML overlays ──────────────────────────────────

interface BadgeInfo {
  groupId: string;
  activeIndex: number;
  totalCount: number;
  x: number;
  y: number;
  activeChildName: string;
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
  areaZoomActive,
  onAreaZoomComplete,
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

  // Scrollbar state
  const isScrollbarHovered = useRef(false);
  const isScrollbarDragging = useRef(false);
  const scrollbarDragStart = useRef({ mouseX: 0, offsetX: 0 });

  // Area-zoom state
  const [areaZoomRect, setAreaZoomRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const isAreaZoomDragging = useRef(false);
  const areaZoomStart = useRef({ x: 0, y: 0 });

  // Get device pixel ratio for crisp rendering
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

  // Calculate canvas height based on max depth (CSS pixels)
  const canvasHeight = useMemo(() => {
    return TIMELINE_HEIGHT + PADDING_TOP + (data.maxDepth + 1) * (ROW_HEIGHT + ROW_GAP) + 20;
  }, [data.maxDepth]);

  // CSS pixel height (add scrollbar space when zoomed)
  const cssHeight = Math.max(canvasSize.height, canvasHeight) + (viewState.zoom > 1 ? SCROLLBAR_HEIGHT : 0);

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

  // ─── Canvas Rendering (DPR-aware) ────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas buffer to DPR-scaled size
    const bufferW = Math.round(canvasSize.width * dpr);
    const bufferH = Math.round(cssHeight * dpr);

    if (canvas.width !== bufferW || canvas.height !== bufferH) {
      canvas.width = bufferW;
      canvas.height = bufferH;
    }

    // Scale all drawing by DPR so we draw in CSS-pixel coordinates
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Use CSS-pixel dimensions for all drawing
    const w = canvasSize.width;
    const h = cssHeight;

    // Clear
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, w, h);

    // Timeline
    drawTimeline(ctx, w, data.totalDuration, viewState, focusedSpan);

    const focusX = focusedSpan ? focusedSpan.x : 0;
    const focusW = focusedSpan ? focusedSpan.width : 1;

    // Collect badge positions — we place badges on PARENT bars (concurrent nodes)
    const newBadges: BadgeInfo[] = [];
    const badgeGroupIds = new Set<string>();

    // Draw spans
    for (const span of visibleSpans) {
      const normalizedX = focusW > 0 ? (span.x - focusX) / focusW : span.x;
      const normalizedW = focusW > 0 ? span.width / focusW : span.width;

      const pixelX = (normalizedX * viewState.zoom + viewState.offsetX) * w;
      const pixelW = Math.max(MIN_BAR_WIDTH, normalizedW * viewState.zoom * w);
      const pixelY = TIMELINE_HEIGHT + PADDING_TOP + span.depth * (ROW_HEIGHT + ROW_GAP);

      // Check if this span is a concurrent PARENT
      const isParallelParent = span.isConcurrent && span.children.length > 1 &&
        span.children.some(c => c.parallelGroupId === span.id);

      // Draw paper-stack background layers on the PARENT bar
      if (isParallelParent && pixelW > 30) {
        drawPaperStackLayers(ctx, pixelX, pixelY, pixelW, span.children.length);
      }

      // Also draw paper-stack layers on child if it's wide enough
      if (
        span.parallelGroupId !== undefined &&
        span.parallelSiblingCount !== undefined &&
        span.parallelSiblingCount > 1 &&
        span.parallelIndex !== undefined &&
        pixelW > 60
      ) {
        drawPaperStackLayers(ctx, pixelX, pixelY, pixelW, span.parallelSiblingCount);
      }

      // Bar color
      const barColor = span.color;
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

      // Async indicator (cyan bottom bar on concurrent parents)
      if (span.isConcurrent) {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.7)';
        ctx.fillRect(pixelX, pixelY + ROW_HEIGHT - 3, pixelW, 3);
      }

      // Collect badge info for HTML overlay — placed on the PARENT bar
      if (isParallelParent && pixelW > 30 && !badgeGroupIds.has(span.id)) {
        const groupId = span.id;
        const defaultIdx = span.children.reduce((maxI, c, i, arr) => c.duration > arr[maxI].duration ? i : maxI, 0);
        const activeIdx = activeParallelPages.has(groupId) ? activeParallelPages.get(groupId)! : defaultIdx;
        const safeIdx = Math.min(activeIdx, span.children.length - 1);
        const activeChild = span.children[safeIdx];
        badgeGroupIds.add(groupId);
        newBadges.push({
          groupId,
          activeIndex: activeIdx,
          totalCount: span.children.length,
          x: pixelX + pixelW - 40,
          y: pixelY + 3,
          activeChildName: activeChild ? activeChild.name : '',
        });
      }

      // Determine if this span has a badge on it (for text truncation)
      const hasBadgeOnThisSpan = isParallelParent && pixelW > 30;

      // Text label
      if (pixelW > 20) {
        ctx.fillStyle = '#E6EDF3';
        ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const textPad = 4;
        const badgeReserve = hasBadgeOnThisSpan ? 48 : 0;
        const maxTextWidth = pixelW - textPad * 2 - badgeReserve;

        if (maxTextWidth > 10) {
          const label = `${span.name} (${formatDuration(span.duration)})`;
          let displayText = label;

          const measured = ctx.measureText(label);
          if (measured.width > maxTextWidth) {
            let truncated = label;
            while (ctx.measureText(truncated + '…').width > maxTextWidth && truncated.length > 0) {
              truncated = truncated.slice(0, -1);
            }
            displayText = truncated + '…';
          }

          ctx.fillText(displayText, pixelX + textPad, pixelY + ROW_HEIGHT / 2);
        }
      }

      if (isSearchDimmed) {
        ctx.globalAlpha = 1;
      }
    }

    // Draw custom scrollbar
    drawScrollbar(ctx, w, cssHeight, viewState, isScrollbarHovered.current, isScrollbarDragging.current);

    // Draw area-zoom selection rectangle
    if (areaZoomRect) {
      const x = Math.min(areaZoomRect.startX, areaZoomRect.endX);
      const y = Math.min(areaZoomRect.startY, areaZoomRect.endY);
      const rw = Math.abs(areaZoomRect.endX - areaZoomRect.startX);
      const rh = Math.abs(areaZoomRect.endY - areaZoomRect.startY);

      // Semi-transparent overlay outside selection
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      // Top
      ctx.fillRect(0, 0, w, y);
      // Bottom
      ctx.fillRect(0, y + rh, w, h - y - rh);
      // Left
      ctx.fillRect(0, y, x, rh);
      // Right
      ctx.fillRect(x + rw, y, w - x - rw, rh);

      // Selection border
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, rw, rh);
      ctx.setLineDash([]);

      // Selection fill
      ctx.fillStyle = 'rgba(0, 212, 255, 0.08)';
      ctx.fillRect(x, y, rw, rh);

      // Label
      if (rw > 60) {
        ctx.font = `bold 11px 'JetBrains Mono', monospace`;
        ctx.fillStyle = 'rgba(0, 212, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Release to zoom', x + rw / 2, y - 4);
      }
    }

    setBadges(newBadges);
  }, [canvasSize.width, cssHeight, dpr, data, viewState, focusedSpan, visibleSpans,
    hoveredSpan, searchQuery, searchMatches, activeParallelPages, areaZoomRect]);

  // Render on state change
  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  // ─── Helper: clamp offsetX so viewport stays within [0..1] ────────────

  const clampOffset = useCallback((offsetX: number, zoom: number): number => {
    if (zoom <= 1) return 0;
    // The visible window in normalized space is [(-offsetX/zoom), (-offsetX/zoom + 1/zoom)]
    // We want: -offsetX/zoom >= 0  =>  offsetX <= 0
    // We want: -offsetX/zoom + 1/zoom <= 1  =>  offsetX >= -(zoom - 1)/zoom * zoom = 1 - zoom
    // So: (1 - zoom) <= offsetX <= 0
    return Math.max(1 - zoom, Math.min(0, offsetX));
  }, []);

  // ─── Helper: find smallest visible span in a pixel region ─────────────

  const findSmallestSpanInRegion = useCallback((
    x1: number, x2: number, y1: number, y2: number,
  ): ProcessedSpan | null => {
    const focusX = focusedSpan ? focusedSpan.x : 0;
    const focusW = focusedSpan ? focusedSpan.width : 1;
    let smallest: ProcessedSpan | null = null;
    let smallestW = Infinity;

    for (const span of visibleSpans) {
      const normalizedX = focusW > 0 ? (span.x - focusX) / focusW : span.x;
      const normalizedW = focusW > 0 ? span.width / focusW : span.width;

      const pixelX = (normalizedX * viewState.zoom + viewState.offsetX) * canvasSize.width;
      const pixelW = normalizedW * viewState.zoom * canvasSize.width;
      const pixelY = TIMELINE_HEIGHT + PADDING_TOP + span.depth * (ROW_HEIGHT + ROW_GAP);

      // Check if span overlaps with the selection rectangle
      if (pixelX + pixelW >= x1 && pixelX <= x2 && pixelY + ROW_HEIGHT >= y1 && pixelY <= y2) {
        if (pixelW < smallestW) {
          smallestW = pixelW;
          smallest = span;
        }
      }
    }
    return smallest;
  }, [visibleSpans, viewState, canvasSize.width, focusedSpan]);

  // ─── Event Handlers (all in CSS-pixel coordinates) ────────────────────────

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Area-zoom dragging
    if (areaZoomActive && isAreaZoomDragging.current) {
      setAreaZoomRect(prev => prev ? {
        ...prev,
        endX: mouseX,
        endY: mouseY,
      } : null);
      canvas.style.cursor = 'crosshair';
      return;
    }

    // Scrollbar interaction
    if (isScrollbarDragging.current) {
      const dx = mouseX - scrollbarDragStart.current.mouseX;
      const normalizedDx = (dx / canvasSize.width) * viewState.zoom;
      const newOffsetX = clampOffset(scrollbarDragStart.current.offsetX - normalizedDx, viewState.zoom);
      setViewState(prev => ({ ...prev, offsetX: newOffsetX }));
      canvas.style.cursor = 'grabbing';
      return;
    }

    // Check if hovering over scrollbar
    const thumbRect = getScrollbarThumbRect(canvasSize.width, cssHeight, viewState);
    if (thumbRect && mouseY >= thumbRect.y - 2 && mouseY <= thumbRect.y + thumbRect.h + 2) {
      isScrollbarHovered.current = true;
      canvas.style.cursor = 'pointer';
      // Trigger re-render for hover effect
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(render);
      return;
    } else if (isScrollbarHovered.current) {
      isScrollbarHovered.current = false;
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(render);
    }

    // Area-zoom mode cursor
    if (areaZoomActive) {
      canvas.style.cursor = 'crosshair';
      return;
    }

    // Normal pan dragging
    if (isDragging.current) {
      const dx = (e.clientX - dragStart.current.x) / canvasSize.width;
      const newOffsetX = clampOffset(dragStart.current.offsetX + dx, viewState.zoom);
      setViewState(prev => ({
        ...prev,
        offsetX: newOffsetX,
      }));
      return;
    }

    const hit = getHitSpan(
      visibleSpans, mouseX, mouseY, viewState, canvasSize.width, focusedSpan
    );
    setHoveredSpan(hit);
    onSpanHover?.(hit, e.clientX, e.clientY);

    canvas.style.cursor = hit ? 'pointer' : 'default';
  }, [visibleSpans, viewState, canvasSize.width, cssHeight, focusedSpan, onSpanHover,
    clampOffset, areaZoomActive, render]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check scrollbar click
    const thumbRect = getScrollbarThumbRect(canvasSize.width, cssHeight, viewState);
    if (thumbRect && mouseY >= thumbRect.y - 2 && mouseY <= thumbRect.y + thumbRect.h + 2) {
      if (mouseX >= thumbRect.x && mouseX <= thumbRect.x + thumbRect.w) {
        // Clicked on thumb — start dragging
        isScrollbarDragging.current = true;
        scrollbarDragStart.current = { mouseX, offsetX: viewState.offsetX };
      } else {
        // Clicked on track — jump to position
        const trackFraction = mouseX / canvasSize.width;
        const newOffsetX = clampOffset(-trackFraction * viewState.zoom + 0.5, viewState.zoom);
        setViewState(prev => ({ ...prev, offsetX: newOffsetX }));
      }
      return;
    }

    // Area-zoom mode
    if (areaZoomActive) {
      isAreaZoomDragging.current = true;
      areaZoomStart.current = { x: mouseX, y: mouseY };
      setAreaZoomRect({ startX: mouseX, startY: mouseY, endX: mouseX, endY: mouseY });
      return;
    }

    // Normal pan
    isDragging.current = true;
    dragStart.current = { x: e.clientX, offsetX: viewState.offsetX };
  }, [viewState, canvasSize.width, cssHeight, clampOffset, areaZoomActive]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Scrollbar drag end
    if (isScrollbarDragging.current) {
      isScrollbarDragging.current = false;
      return;
    }

    // Area-zoom drag end
    if (isAreaZoomDragging.current && areaZoomRect) {
      isAreaZoomDragging.current = false;

      const x1 = Math.min(areaZoomRect.startX, areaZoomRect.endX);
      const x2 = Math.max(areaZoomRect.startX, areaZoomRect.endX);
      const y1 = Math.min(areaZoomRect.startY, areaZoomRect.endY);
      const y2 = Math.max(areaZoomRect.startY, areaZoomRect.endY);
      const selW = x2 - x1;

      setAreaZoomRect(null);

      if (selW < 10) {
        // Too small — cancel
        onAreaZoomComplete?.();
        return;
      }

      // Find smallest span in the selection region
      const smallest = findSmallestSpanInRegion(x1, x2, y1, y2);

      const focusX = focusedSpan ? focusedSpan.x : 0;
      const focusW = focusedSpan ? focusedSpan.width : 1;

      if (smallest) {
        // Calculate zoom so that the smallest span covers at least 15% of screen
        const normalizedW = focusW > 0 ? smallest.width / focusW : smallest.width;
        const currentPixelW = normalizedW * viewState.zoom * canvasSize.width;
        const targetPixelW = canvasSize.width * 0.15; // 15% of screen
        const zoomMultiplier = targetPixelW / currentPixelW;
        const newZoom = Math.min(500, viewState.zoom * zoomMultiplier);

        // Center on the selection center
        const selCenterPixel = (x1 + x2) / 2;
        const selCenterNorm = (selCenterPixel / canvasSize.width - viewState.offsetX) / viewState.zoom;
        const newOffsetX = clampOffset(0.5 - selCenterNorm * newZoom, newZoom);

        setViewState({ zoom: newZoom, offsetX: newOffsetX });
      } else {
        // No spans in selection — just zoom to the selected horizontal region
        const leftNorm = (x1 / canvasSize.width - viewState.offsetX) / viewState.zoom;
        const rightNorm = (x2 / canvasSize.width - viewState.offsetX) / viewState.zoom;
        const regionW = rightNorm - leftNorm;
        const newZoom = Math.min(500, 1 / regionW);
        const centerNorm = (leftNorm + rightNorm) / 2;
        const newOffsetX = clampOffset(0.5 - centerNorm * newZoom, newZoom);

        setViewState({ zoom: newZoom, offsetX: newOffsetX });
      }

      onAreaZoomComplete?.();
      return;
    }

    // Normal click/pan end
    if (isDragging.current) {
      const dx = Math.abs(e.clientX - dragStart.current.x);
      isDragging.current = false;

      if (dx < 3) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const hit = getHitSpan(
          visibleSpans, mouseX, mouseY, viewState, canvasSize.width, focusedSpan
        );

        if (hit) {
          onSpanClick?.(hit);
        }
      }
    }
  }, [visibleSpans, viewState, canvasSize.width, focusedSpan, onSpanClick,
    areaZoomRect, findSmallestSpanInRegion, clampOffset, onAreaZoomComplete]);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    isScrollbarDragging.current = false;
    if (isAreaZoomDragging.current) {
      isAreaZoomDragging.current = false;
      setAreaZoomRect(null);
      onAreaZoomComplete?.();
    }
    setHoveredSpan(null);
    onSpanHover?.(null, 0, 0);
  }, [onSpanHover, onAreaZoomComplete]);

  // ─── Imperative zoom controls (exposed via ref) ────────────────────────

  const zoomIn = useCallback(() => {
    setViewState(prev => {
      const newZoom = Math.min(500, prev.zoom * 2);
      // Zoom centered on the current viewport center
      const viewportCenterNorm = (-prev.offsetX + 0.5) / prev.zoom;
      const newOffsetX = clampOffset(0.5 - viewportCenterNorm * newZoom, newZoom);
      return { zoom: newZoom, offsetX: newOffsetX };
    });
  }, [clampOffset]);

  const zoomOut = useCallback(() => {
    setViewState(prev => {
      const newZoom = Math.max(1, prev.zoom / 2);
      const viewportCenterNorm = (-prev.offsetX + 0.5) / prev.zoom;
      const newOffsetX = clampOffset(0.5 - viewportCenterNorm * newZoom, newZoom);
      return { zoom: newZoom, offsetX: newOffsetX };
    });
  }, [clampOffset]);

  const resetZoom = useCallback(() => {
    setViewState({ offsetX: 0, zoom: 1 });
  }, []);

  const getZoomLevel = useCallback(() => viewState.zoom, [viewState.zoom]);

  useImperativeHandle(ref, () => ({
    zoomIn,
    zoomOut,
    resetZoom,
    getZoomLevel,
  }), [zoomIn, zoomOut, resetZoom, getZoomLevel]);

  // Reset view
  useEffect(() => {
    setViewState({ offsetX: 0, zoom: 1 });
  }, [data]);

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ overflow: 'auto' }}>
      <canvas
        ref={canvasRef}
        width={Math.round(canvasSize.width * dpr)}
        height={Math.round(cssHeight * dpr)}
        style={{
          width: canvasSize.width,
          height: cssHeight,
          display: 'block',
          cursor: areaZoomActive ? 'crosshair' : undefined,
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {/* HTML overlay badges for paper-stack cycling — placed on PARENT bars */}
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
          title={`Click to cycle through ${badge.totalCount} parallel tasks (${badge.activeIndex + 1}/${badge.totalCount})\nActive: ${badge.activeChildName}`}
        >
          {badge.activeIndex + 1}/{badge.totalCount}
        </button>
      ))}
    </div>
  );
});

export default FlameGraph;
