/**
 * Toolbar — Flame graph control bar
 * Design: Observatory console — supports light/dark mode via CSS variables
 * Features: search, view mode toggle, render mode toggle, color mode, zoom controls, area-zoom, reset
 */

import {
  Search,
  RotateCcw,
  Palette,
  LayoutList,
  Flame,
  Columns,
  X,
  AlignLeft,
  AlignRight,
  ZoomIn,
  ZoomOut,
  Clock,
  Scale,
  Scan,
} from "lucide-react";
import type { RenderMode } from "@/lib/flameEngine";

export type ViewMode = 'flame' | 'table' | 'both';
export type ColorMode = 'self-time' | 'package';
export type TextAlign = 'left' | 'right';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  textAlign: TextAlign;
  onTextAlignChange: (align: TextAlign) => void;
  renderMode: RenderMode;
  onRenderModeChange: (mode: RenderMode) => void;
  focusedSpanName: string | null;
  onResetFocus: () => void;
  totalDuration: number;
  spanCount: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  zoomLevel?: number;
  areaZoomActive?: boolean;
  onToggleAreaZoom?: () => void;
}

function formatZoom(zoom: number): string {
  if (zoom >= 100) return `${Math.round(zoom)}x`;
  if (zoom >= 10) return `${zoom.toFixed(1)}x`;
  return `${zoom.toFixed(1)}x`;
}

export default function Toolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  colorMode,
  onColorModeChange,
  textAlign,
  onTextAlignChange,
  renderMode,
  onRenderModeChange,
  focusedSpanName,
  onResetFocus,
  totalDuration,
  spanCount,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoomLevel = 1,
  areaZoomActive,
  onToggleAreaZoom,
}: ToolbarProps) {
  const isZoomed = zoomLevel > 1.01;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-fg-bg border-b border-fg-border">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search functions..."
          className="w-full pl-8 pr-8 py-1.5 rounded bg-fg-panel border border-fg-border text-fg-text font-mono text-[11px] placeholder:text-fg-text-muted focus:border-fg-accent focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-text-muted hover:text-fg-text"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-fg-border" />

      {/* View mode toggle */}
      <div className="flex items-center bg-fg-panel rounded border border-fg-border">
        <button
          onClick={() => onViewModeChange('table')}
          className={`p-1.5 rounded-l transition-colors ${
            viewMode === 'table'
              ? 'bg-fg-active text-fg-text'
              : 'text-fg-text-muted hover:text-fg-text-secondary'
          }`}
          title="Top Table"
        >
          <LayoutList size={14} />
        </button>
        <button
          onClick={() => onViewModeChange('flame')}
          className={`p-1.5 transition-colors ${
            viewMode === 'flame'
              ? 'bg-fg-active text-fg-text'
              : 'text-fg-text-muted hover:text-fg-text-secondary'
          }`}
          title="Flame Graph"
        >
          <Flame size={14} />
        </button>
        <button
          onClick={() => onViewModeChange('both')}
          className={`p-1.5 rounded-r transition-colors ${
            viewMode === 'both'
              ? 'bg-fg-active text-fg-text'
              : 'text-fg-text-muted hover:text-fg-text-secondary'
          }`}
          title="Both"
        >
          <Columns size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-fg-border" />

      {/* Render mode toggle: Wall-Clock vs Scaled */}
      <div className="flex items-center bg-fg-panel rounded border border-fg-border">
        <button
          onClick={() => onRenderModeChange('wall-clock')}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-l text-[11px] transition-colors ${
            renderMode === 'wall-clock'
              ? 'bg-fg-active text-fg-accent'
              : 'text-fg-text-muted hover:text-fg-text-secondary'
          }`}
          title="Wall-Clock mode (to_dict): Shows true parallel durations. Children can overflow parent width."
        >
          <Clock size={12} />
          <span className="hidden sm:inline">Wall-Clock</span>
        </button>
        <button
          onClick={() => onRenderModeChange('scaled')}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-r text-[11px] transition-colors ${
            renderMode === 'scaled'
              ? 'bg-fg-active text-fg-amber'
              : 'text-fg-text-muted hover:text-fg-text-secondary'
          }`}
          title="Scaled mode (to_scaled_dict): Children proportionally fit within parent. Hover for wall-clock values."
        >
          <Scale size={12} />
          <span className="hidden sm:inline">Scaled</span>
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-fg-border" />

      {/* Color mode */}
      <button
        onClick={() => onColorModeChange(colorMode === 'self-time' ? 'package' : 'self-time')}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] transition-colors ${
          colorMode === 'package'
            ? 'bg-fg-active text-fg-text'
            : 'text-fg-text-secondary hover:text-fg-text hover:bg-fg-panel'
        }`}
        title={`Color by: ${colorMode === 'self-time' ? 'Self Time' : 'Package'}`}
      >
        <Palette size={13} />
        <span className="hidden sm:inline">
          {colorMode === 'self-time' ? 'By Heat' : 'By Package'}
        </span>
      </button>

      {/* Text align */}
      <button
        onClick={() => onTextAlignChange(textAlign === 'left' ? 'right' : 'left')}
        className="p-1.5 rounded text-fg-text-secondary hover:text-fg-text hover:bg-fg-panel transition-colors"
        title={`Text align: ${textAlign}`}
      >
        {textAlign === 'left' ? <AlignLeft size={13} /> : <AlignRight size={13} />}
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-fg-border" />

      {/* Zoom controls */}
      <div className="flex items-center bg-fg-panel rounded border border-fg-border">
        <button
          onClick={onZoomOut}
          className={`p-1.5 rounded-l transition-colors ${
            isZoomed
              ? 'text-fg-text hover:bg-fg-active'
              : 'text-fg-text-dimmed cursor-not-allowed'
          }`}
          title="Zoom out (÷2)"
          disabled={!isZoomed}
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={onResetZoom}
          className={`px-2 py-1.5 text-[10px] font-mono transition-colors border-x border-fg-border min-w-[42px] text-center ${
            isZoomed
              ? 'text-fg-accent hover:bg-fg-active font-bold'
              : 'text-fg-text-muted hover:text-fg-text-secondary hover:bg-fg-active'
          }`}
          title={isZoomed ? `Current zoom: ${formatZoom(zoomLevel)} — Click to reset` : 'Zoom level: 1x'}
        >
          {isZoomed ? formatZoom(zoomLevel) : '1:1'}
        </button>
        <button
          onClick={onZoomIn}
          className="p-1.5 text-fg-text-secondary hover:text-fg-text hover:bg-fg-active transition-colors"
          title="Zoom in (×2)"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={onToggleAreaZoom}
          className={`p-1.5 rounded-r transition-colors border-l border-fg-border ${
            areaZoomActive
              ? 'bg-fg-accent-bg text-fg-accent border-fg-accent-border'
              : 'text-fg-text-secondary hover:text-fg-text hover:bg-fg-active'
          }`}
          title={areaZoomActive ? 'Area zoom active — drag on the flame graph to select a region' : 'Area zoom — drag to select a region to zoom into'}
        >
          <Scan size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-fg-border" />

      {/* Focus status / Reset */}
      {focusedSpanName ? (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-fg-amber-bg border border-fg-amber-border">
          <span className="text-[10px] text-fg-amber truncate max-w-[120px]">
            Focused: {focusedSpanName}
          </span>
          <button
            onClick={onResetFocus}
            className="text-fg-amber hover:opacity-80"
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <button
          onClick={onResetFocus}
          className="p-1.5 rounded text-fg-text-secondary hover:text-fg-text hover:bg-fg-panel transition-colors"
          title="Reset view"
        >
          <RotateCcw size={13} />
        </button>
      )}

      {/* Stats */}
      <div className="ml-auto flex items-center gap-3 text-[10px] text-fg-text-muted">
        <span>{spanCount} spans</span>
        <span className="font-mono text-fg-text-secondary">
          {totalDuration > 0 ? `${totalDuration.toFixed(3)}s total` : ''}
        </span>
      </div>
    </div>
  );
}
