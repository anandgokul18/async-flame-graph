/**
 * Toolbar — Flame graph control bar
 * Design: Observatory dark console
 * Features: search, view mode toggle, color mode, reset
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
} from "lucide-react";

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
  focusedSpanName: string | null;
  onResetFocus: () => void;
  totalDuration: number;
  spanCount: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
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
  focusedSpanName,
  onResetFocus,
  totalDuration,
  spanCount,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#0D1117] border-b border-[#21262D]">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6E7681]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search functions..."
          className="w-full pl-8 pr-8 py-1.5 rounded bg-[#161B22] border border-[#21262D] text-[#E6EDF3] font-mono text-[11px] placeholder-[#6E7681] focus:border-[#00D4FF] focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6E7681] hover:text-[#E6EDF3]"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#21262D]" />

      {/* View mode toggle */}
      <div className="flex items-center bg-[#161B22] rounded border border-[#21262D]">
        <button
          onClick={() => onViewModeChange('table')}
          className={`p-1.5 rounded-l transition-colors ${
            viewMode === 'table'
              ? 'bg-[#21262D] text-[#E6EDF3]'
              : 'text-[#6E7681] hover:text-[#8B949E]'
          }`}
          title="Top Table"
        >
          <LayoutList size={14} />
        </button>
        <button
          onClick={() => onViewModeChange('flame')}
          className={`p-1.5 transition-colors ${
            viewMode === 'flame'
              ? 'bg-[#21262D] text-[#E6EDF3]'
              : 'text-[#6E7681] hover:text-[#8B949E]'
          }`}
          title="Flame Graph"
        >
          <Flame size={14} />
        </button>
        <button
          onClick={() => onViewModeChange('both')}
          className={`p-1.5 rounded-r transition-colors ${
            viewMode === 'both'
              ? 'bg-[#21262D] text-[#E6EDF3]'
              : 'text-[#6E7681] hover:text-[#8B949E]'
          }`}
          title="Both"
        >
          <Columns size={14} />
        </button>
      </div>

      {/* Color mode */}
      <button
        onClick={() => onColorModeChange(colorMode === 'self-time' ? 'package' : 'self-time')}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] transition-colors ${
          colorMode === 'package'
            ? 'bg-[#21262D] text-[#E6EDF3]'
            : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22]'
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
        className="p-1.5 rounded text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22] transition-colors"
        title={`Text align: ${textAlign}`}
      >
        {textAlign === 'left' ? <AlignLeft size={13} /> : <AlignRight size={13} />}
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-[#21262D]" />

      {/* Zoom controls */}
      <div className="flex items-center bg-[#161B22] rounded border border-[#21262D]">
        <button
          onClick={onZoomOut}
          className="p-1.5 rounded-l text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={onResetZoom}
          className="px-2 py-1.5 text-[10px] font-mono text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors border-x border-[#21262D]"
          title="Reset zoom"
        >
          1:1
        </button>
        <button
          onClick={onZoomIn}
          className="p-1.5 rounded-r text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#21262D]" />

      {/* Focus status / Reset */}
      {focusedSpanName ? (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#FFB020]/10 border border-[#FFB020]/20">
          <span className="text-[10px] text-[#FFB020] truncate max-w-[120px]">
            Focused: {focusedSpanName}
          </span>
          <button
            onClick={onResetFocus}
            className="text-[#FFB020] hover:text-[#FFD166]"
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <button
          onClick={onResetFocus}
          className="p-1.5 rounded text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22] transition-colors"
          title="Reset view"
        >
          <RotateCcw size={13} />
        </button>
      )}

      {/* Stats */}
      <div className="ml-auto flex items-center gap-3 text-[10px] text-[#6E7681]">
        <span>{spanCount} spans</span>
        <span className="font-mono text-[#8B949E]">
          {totalDuration > 0 ? `${totalDuration.toFixed(3)}s total` : ''}
        </span>
      </div>
    </div>
  );
}
