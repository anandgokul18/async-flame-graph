/**
 * SpanTooltip — Frosted glass tooltip for span details
 * Design: Observatory dark console with glass-panel effect
 * Shows wall-clock values and blocking/concurrent status
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
      <div className="font-mono text-xs font-semibold text-[#E6EDF3] mb-2 break-all leading-relaxed">
        {span.name}
      </div>

      {/* Render mode indicator */}
      {renderMode === 'scaled' && (
        <div className="mb-2 px-2 py-1 rounded bg-[#FFB020]/10 border border-[#FFB020]/20">
          <span className="text-[10px] text-[#FFB020] font-medium">Scaled View</span>
        </div>
      )}

      {/* Timing details */}
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-[#8B949E]">Duration</span>
          <span className="font-mono text-[#00D4FF] font-medium">
            {formatDuration(span.duration)}
          </span>
        </div>

        {/* Show wall-clock if different from duration (scaled mode) */}
        {hasWallClock && (
          <div className="flex justify-between gap-6 text-[11px]">
            <span className="text-[#8B949E]">Wall-Clock</span>
            <span className="font-mono text-[#FFB020] font-medium">
              {formatDuration(span.wallClockValue)}
            </span>
          </div>
        )}

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-[#8B949E]">Self Time</span>
          <span className="font-mono text-[#FFB020] font-medium">
            {formatDuration(span.selfTime)}
          </span>
        </div>

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-[#8B949E]">% of Total</span>
          <span className="font-mono text-[#E6EDF3]">
            {percentage.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-[#8B949E]">Self %</span>
          <span className="font-mono text-[#E6EDF3]">
            {selfPercentage.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-[#8B949E]">Start</span>
          <span className="font-mono text-[#E6EDF3]">
            {formatDuration(span.startTime)}
          </span>
        </div>

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-[#8B949E]">End</span>
          <span className="font-mono text-[#E6EDF3]">
            {formatDuration(span.endTime)}
          </span>
        </div>

        <div className="flex justify-between gap-6 text-[11px]">
          <span className="text-[#8B949E]">Depth</span>
          <span className="font-mono text-[#E6EDF3]">
            {span.depth}
          </span>
        </div>

        {span.children.length > 0 && (
          <div className="flex justify-between gap-6 text-[11px]">
            <span className="text-[#8B949E]">Children</span>
            <span className="font-mono text-[#E6EDF3]">
              {span.children.length}
            </span>
          </div>
        )}

        {/* Concurrency / Async / Blocking indicators */}
        {(span.isAsync || span.isParallel || span.isConcurrent) && (
          <div className="mt-1.5 pt-1.5 border-t border-[#21262D]">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#00D4FF]" />
              <span className="text-[#00D4FF] font-medium">
                {span.isConcurrent ? 'Concurrent' : span.isAsync ? 'Async' : 'Parallel'} Execution
              </span>
            </div>
          </div>
        )}

        {span.isBlocking && (
          <div className="flex items-center gap-1.5 text-[11px] mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#FF6B35]" />
            <span className="text-[#FF6B35] font-medium">Blocking (awaited)</span>
          </div>
        )}

        {!span.isBlocking && (span.isAsync || span.isConcurrent) && span.children.length === 0 && (
          <div className="flex items-center gap-1.5 text-[11px] mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#8B949E]" />
            <span className="text-[#8B949E] font-medium">Fire-and-forget</span>
          </div>
        )}
      </div>

      {/* Attributes */}
      {span.attributes && Object.keys(span.attributes).length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#21262D]">
          <div className="text-[10px] text-[#8B949E] mb-1">Attributes</div>
          {Object.entries(span.attributes).slice(0, 5).map(([key, val]) => (
            <div key={key} className="flex justify-between gap-4 text-[10px]">
              <span className="text-[#6E7681] truncate">{key}</span>
              <span className="font-mono text-[#E6EDF3] truncate">{String(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
