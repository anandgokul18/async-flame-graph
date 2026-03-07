/**
 * SpanTooltip — Frosted glass tooltip for span details
 * Design: Observatory console — supports light/dark mode via CSS variables
 * Shows both scaled and wall-clock values in Scaled mode
 */

import { useEffect, useRef, useState } from "react";
import type { ProcessedSpan } from "@/lib/flameEngine";
import type { RenderMode } from "@/lib/flameEngine";
import { formatDuration } from "@/lib/flameEngine";

interface SpanTooltipProps {
  span: ProcessedSpan | null;
  x: number;
  y: number;
  totalDuration: number;
  renderMode: RenderMode;
}

export default function SpanTooltip({ span, x, y, totalDuration, renderMode }: SpanTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!span || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const padding = 12;

    let left = x + padding;
    let top = y + padding;

    if (left + rect.width > window.innerWidth - padding) {
      left = x - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight - padding) {
      top = y - rect.height - padding;
    }

    setPosition({ left: Math.max(padding, left), top: Math.max(padding, top) });
  }, [span, x, y]);

  if (!span) return null;

  const percentage = totalDuration > 0 ? (span.duration / totalDuration * 100) : 0;
  const selfPercentage = totalDuration > 0 ? (span.selfTime / totalDuration * 100) : 0;
  const hasWallClock = span.wallClockValue > 0 && Math.abs(span.wallClockValue - span.duration) > 0.0001;
  const isScaled = renderMode === 'scaled';

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 pointer-events-none glass-panel rounded-lg px-4 py-3 shadow-xl max-w-sm"
      style={{
        left: position.left,
        top: position.top,
        transition: 'left 0.08s ease-out, top 0.08s ease-out',
      }}
    >
      {/* Name */}
      <div className="font-mono text-xs font-semibold text-fg-text mb-2 break-all leading-relaxed">
        {span.name}
      </div>

      {/* Scaled mode dual-value banner */}
      {isScaled && hasWallClock && (
        <div className="mb-2 px-2.5 py-2 rounded-md bg-fg-amber-bg border border-fg-amber-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-fg-amber" />
            <span className="text-[10px] text-fg-amber font-semibold uppercase tracking-wider">Scaled View</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-[10px] text-fg-text-secondary">Displayed</div>
            <div className="text-[10px] font-mono text-fg-accent font-medium text-right">
              {formatDuration(span.duration)}
            </div>
            <div className="text-[10px] text-fg-text-secondary">Actual (wall-clock)</div>
            <div className="text-[10px] font-mono text-fg-amber font-medium text-right">
              {formatDuration(span.wallClockValue)}
            </div>
          </div>
        </div>
      )}

      {/* Timing details */}
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-fg-text-secondary">Duration</span>
          <span className="font-mono text-fg-accent font-medium">
            {formatDuration(span.duration)}
            {isScaled && hasWallClock && (
              <span className="text-fg-text-secondary ml-1">(scaled)</span>
            )}
          </span>
        </div>

        {/* Show wall-clock if different from duration (scaled mode) */}
        {hasWallClock && (
          <div className="flex justify-between gap-6 text-[11px]">
            <span className="text-fg-text-secondary">Wall-Clock</span>
            <span className="font-mono text-fg-amber font-medium">
              {formatDuration(span.wallClockValue)}
              {isScaled && (
                <span className="text-fg-text-secondary ml-1">(actual)</span>
              )}
            </span>
          </div>
        )}

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-fg-text-secondary">Self Time</span>
          <span className="font-mono text-fg-amber font-medium">
            {formatDuration(span.selfTime)}
          </span>
        </div>

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-fg-text-secondary">% of Total</span>
          <span className="font-mono text-fg-text">
            {percentage.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-fg-text-secondary">Self %</span>
          <span className="font-mono text-fg-text">
            {selfPercentage.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-fg-text-secondary">Start</span>
          <span className="font-mono text-fg-text">
            {formatDuration(span.startTime)}
          </span>
        </div>

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-fg-text-secondary">End</span>
          <span className="font-mono text-fg-text">
            {formatDuration(span.endTime)}
          </span>
        </div>

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-fg-text-secondary">Depth</span>
          <span className="font-mono text-fg-text">
            {span.depth}
          </span>
        </div>

        {span.children.length > 0 && (
          <div className="flex justify-between gap-6 text-[11px]">
            <span className="text-fg-text-secondary">Children</span>
            <span className="font-mono text-fg-text">
              {span.children.length}
            </span>
          </div>
        )}

        {/* Concurrency / Async / Blocking indicators */}
        {(span.isAsync || span.isParallel || span.isConcurrent) && (
          <div className="mt-1.5 pt-1.5 border-t border-fg-border">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="inline-block w-2 h-2 rounded-full bg-fg-accent" />
              <span className="text-fg-accent font-medium">
                {span.isConcurrent ? 'Concurrent' : span.isAsync ? 'Async' : 'Parallel'} Execution
              </span>
            </div>
          </div>
        )}

        {span.isBlocking && (
          <div className="flex items-center gap-1.5 text-[11px] mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-orange-500 font-medium">Blocking (awaited)</span>
          </div>
        )}

        {!span.isBlocking && (span.isAsync || span.isConcurrent) && span.children.length === 0 && (
          <div className="flex items-center gap-1.5 text-[11px] mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-fg-text-secondary" />
            <span className="text-fg-text-secondary font-medium">Fire-and-forget</span>
          </div>
        )}
      </div>

      {/* Attributes */}
      {span.attributes && Object.keys(span.attributes).length > 0 && (
        <div className="mt-2 pt-2 border-t border-fg-border">
          <div className="text-[10px] text-fg-text-secondary mb-1">Attributes</div>
          {Object.entries(span.attributes).slice(0, 5).map(([key, val]) => (
            <div key={key} className="flex justify-between gap-4 text-[10px]">
              <span className="text-fg-text-muted truncate">{key}</span>
              <span className="font-mono text-fg-text truncate">{String(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
