/**
 * Home — Main page for the Async Flame Graph Viewer
 * 
 * Design: "Observatory" dark data console
 * Layout: Collapsible left panel (JSON input) + full-width flame graph + bottom table
 * Key feature: Proper async/parallel visualization with wall-clock time
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Flame,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Link2,
  Check,
} from "lucide-react";
import FlameGraph from "@/components/FlameGraph";
import type { FlameGraphHandle } from "@/components/FlameGraph";
import SpanTooltip from "@/components/SpanTooltip";
import SpanTable from "@/components/SpanTable";
import JsonInput from "@/components/JsonInput";
import Toolbar, { type ViewMode, type ColorMode, type TextAlign } from "@/components/Toolbar";
import { processFlameData, formatDuration, generateSampleData } from "@/lib/flameEngine";
import type { FlameData, ProcessedSpan } from "@/lib/flameEngine";
import { parseUrlState, buildShareUrl, syncUrlState, getCompressionInfo } from "@/lib/urlCodec";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317962886/FDYfY7epknZCTg7EfFmBWa/hero-bg-Xups4ahTbG6j4WWTCBp4Av.webp";
const EMPTY_STATE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317962886/FDYfY7epknZCTg7EfFmBWa/empty-state-ju4EJPW4H52F5c24VJcxKe.webp";

export default function Home() {
  // ─── URL-driven initial state (compressed hash fragment or legacy query params) ─
  const initialState = useMemo(() => parseUrlState(), []);

  // ─── State ─────────────────────────────────────────────────────────────────
  const [jsonInput, setJsonInput] = useState(initialState.json);
  const [hz, setHz] = useState(initialState.hz);
  const [panelOpen, setPanelOpen] = useState(!initialState.json); // auto-close panel if data was passed via URL
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [flameData, setFlameData] = useState<FlameData | null>(null);

  // Toolbar state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [colorMode, setColorMode] = useState<ColorMode>('self-time');
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
  const [focusedSpan, setFocusedSpan] = useState<ProcessedSpan | null>(null);

  // Tooltip state
  const [tooltipSpan, setTooltipSpan] = useState<ProcessedSpan | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Info panel
  const [showInfo, setShowInfo] = useState(false);

  // Share URL state
  const [showCopied, setShowCopied] = useState(false);

  // Flame graph ref for zoom controls
  const flameGraphRef = useRef<FlameGraphHandle>(null);

  // ─── Sync state to URL hash (debounced, compressed) ───────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      syncUrlState({ json: jsonInput, hz });
    }, 500);
    return () => clearTimeout(timer);
  }, [jsonInput, hz]);

  // ─── Process JSON ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jsonInput.trim()) {
      setFlameData(null);
      setJsonError(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      setJsonError(null);

      const data = processFlameData(parsed, { hz, mode: 'time' });
      setFlameData(data);
      setFocusedSpan(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
      setFlameData(null);
    }
  }, [jsonInput, hz]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSpanClick = useCallback((span: ProcessedSpan) => {
    setFocusedSpan(prev => prev?.id === span.id ? null : span);
  }, []);

  const handleSpanHover = useCallback((span: ProcessedSpan | null, x: number, y: number) => {
    setTooltipSpan(span);
    setTooltipPos({ x, y });
  }, []);

  const handleResetFocus = useCallback(() => {
    setFocusedSpan(null);
  }, []);

  const handleSearchSpan = useCallback((name: string) => {
    setSearchQuery(name);
  }, []);

  const handleFocusSpan = useCallback((span: ProcessedSpan) => {
    setFocusedSpan(span);
    setViewMode(prev => prev === 'table' ? 'both' : prev);
  }, []);

  const loadSampleAndShow = useCallback(() => {
    const data = generateSampleData();
    setJsonInput(JSON.stringify(data, null, 2));
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape: reset focus
      if (e.key === 'Escape') {
        setFocusedSpan(null);
        setSearchQuery('');
      }
      // Cmd/Ctrl + F: focus search (when not in textarea)
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        const active = document.activeElement;
        if (active?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const searchInput = document.querySelector('input[placeholder="Search functions..."]') as HTMLInputElement;
          searchInput?.focus();
        }
      }
      // Cmd/Ctrl + B: toggle panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setPanelOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#0D1117] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#21262D] bg-[#0D1117] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="p-1.5 rounded hover:bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            title={panelOpen ? 'Close panel (Ctrl+B)' : 'Open panel (Ctrl+B)'}
          >
            {panelOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-[#00D4FF]" />
            <h1 className="text-sm font-semibold text-[#E6EDF3] tracking-tight">
              Async Flame Graph Viewer
            </h1>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20">
            <Zap size={10} className="text-[#00D4FF]" />
            <span className="text-[9px] font-medium text-[#00D4FF] uppercase tracking-wider">
              Async-Aware
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {jsonInput.trim() && (
            <button
              onClick={() => {
                const url = buildShareUrl({ json: jsonInput, hz });
                navigator.clipboard.writeText(url).then(() => {
                  setShowCopied(true);
                  setTimeout(() => setShowCopied(false), 2000);
                });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium transition-all ${
                showCopied
                  ? 'bg-green-500/15 border border-green-500/30 text-green-400'
                  : 'bg-[#161B22] border border-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#00D4FF]/30'
              }`}
              title="Copy shareable URL with compressed data (gzip + base64url in hash fragment)"
            >
              {showCopied ? <Check size={12} /> : <Link2 size={12} />}
              {showCopied ? 'Copied!' : 'Share URL'}
            </button>
          )}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1.5 rounded hover:bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            title="About"
          >
            <Info size={15} />
          </button>
        </div>
      </header>

      {/* Info Panel */}
      {showInfo && (
        <div className="px-4 py-3 border-b border-[#21262D] bg-[#161B22]">
          <div className="max-w-3xl">
            <h3 className="text-xs font-semibold text-[#E6EDF3] mb-2">How to use</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#8B949E]">
              <div>
                <p className="mb-1.5">
                  <span className="text-[#E6EDF3] font-medium">1.</span> Paste your telemetry JSON in the left panel
                </p>
                <p className="mb-1.5">
                  <span className="text-[#E6EDF3] font-medium">2.</span> Set the sample rate (Hz) if using sample-based data
                </p>
                <p className="mb-1.5">
                  <span className="text-[#E6EDF3] font-medium">3.</span> Click spans to focus, use toolbar zoom buttons, drag to pan
                </p>
              </div>
              <div>
                <p className="mb-1.5 font-medium text-[#00D4FF]">Async/Parallel Support:</p>
                <p className="mb-1">
                  Add <code className="px-1 py-0.5 rounded bg-[#21262D] text-[#E6EDF3] font-mono text-[10px]">"async": true</code> to
                  parent spans to render children in parallel lanes.
                </p>
                <p className="text-[10px] text-[#6E7681]">
                  Children with overlapping timestamps are auto-detected as parallel.
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#21262D] text-[10px] text-[#6E7681]">
              Shortcuts: <kbd className="px-1 py-0.5 rounded bg-[#21262D] text-[#8B949E]">Esc</kbd> Reset &middot;
              <kbd className="px-1 py-0.5 rounded bg-[#21262D] text-[#8B949E] ml-1">Ctrl+F</kbd> Search &middot;
              <kbd className="px-1 py-0.5 rounded bg-[#21262D] text-[#8B949E] ml-1">Ctrl+B</kbd> Toggle Panel &middot;
              <kbd className="px-1 py-0.5 rounded bg-[#21262D] text-[#8B949E] ml-1">+/-</kbd> Zoom
            </div>
            <div className="mt-2 pt-2 border-t border-[#21262D] text-[10px] text-[#6E7681]">
              <p className="font-medium text-[#E6EDF3] mb-1">Sharing via URL:</p>
              <p className="mb-1">Data is <span className="text-[#00D4FF]">gzip-compressed</span> and stored in the URL hash fragment, supporting payloads up to ~2MB:</p>
              <code className="block mt-1 px-2 py-1 rounded bg-[#21262D] text-[#E6EDF3] font-mono text-[9px] break-all">
                https://domain/#hz=50&d=<span className="text-[#8B949E]">{'<gzip+base64url>'}</span>
              </code>
              <p className="mt-1.5">Click <span className="text-[#00D4FF]">Share URL</span> in the header to copy a shareable link with your current data.</p>
              <p className="mt-0.5 text-[#6E7681]">Legacy format (<code className="text-[#8B949E]">?json=&hz=</code>) is also supported for backward compatibility.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - JSON Input */}
        {panelOpen && (
          <div
            className="flex-shrink-0 border-r border-[#21262D] bg-[#0D1117] flex flex-col"
            style={{ width: '380px' }}
          >
            <JsonInput
              value={jsonInput}
              onChange={setJsonInput}
              error={jsonError}
              hz={hz}
              onHzChange={setHz}
            />
          </div>
        )}

        {/* Right Panel - Visualization */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {flameData ? (
            <>
              {/* Toolbar */}
              <Toolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                colorMode={colorMode}
                onColorModeChange={setColorMode}
                textAlign={textAlign}
                onTextAlignChange={setTextAlign}
                focusedSpanName={focusedSpan?.name || null}
                onResetFocus={handleResetFocus}
                totalDuration={flameData.totalDuration}
                spanCount={flameData.allSpans.length}
                onZoomIn={() => flameGraphRef.current?.zoomIn()}
                onZoomOut={() => flameGraphRef.current?.zoomOut()}
                onResetZoom={() => flameGraphRef.current?.resetZoom()}
              />

              {/* Visualization area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Flame Graph */}
                {(viewMode === 'flame' || viewMode === 'both') && (
                  <div className={`overflow-auto bg-[#0D1117] ${viewMode === 'both' ? 'flex-[2]' : 'flex-1'} min-h-[250px]`}>
                    <FlameGraph
                      ref={flameGraphRef}
                      data={flameData}
                      searchQuery={searchQuery}
                      colorMode={colorMode}
                      onSpanClick={handleSpanClick}
                      onSpanHover={handleSpanHover}
                      focusedSpan={focusedSpan}
                    />
                  </div>
                )}

                {/* Resizable divider */}
                {viewMode === 'both' && (
                  <div className="h-px bg-[#21262D] flex-shrink-0 relative group cursor-row-resize">
                    <div className="absolute inset-x-0 -top-1 -bottom-1 group-hover:bg-[#00D4FF]/10 transition-colors" />
                  </div>
                )}

                {/* Table */}
                {(viewMode === 'table' || viewMode === 'both') && (
                  <div
                    className={`border-t border-[#21262D] bg-[#0D1117] ${
                      viewMode === 'both' ? 'flex-1 min-h-[150px]' : 'flex-1'
                    } overflow-hidden`}
                  >
                    <SpanTable
                      spans={flameData.allSpans}
                      totalDuration={flameData.totalDuration}
                      searchQuery={searchQuery}
                      onFocusSpan={handleFocusSpan}
                      onSearchSpan={handleSearchSpan}
                    />
                  </div>
                )}
              </div>

              {/* Tooltip */}
              <SpanTooltip
                span={tooltipSpan}
                x={tooltipPos.x}
                y={tooltipPos.y}
                totalDuration={flameData.totalDuration}
              />
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
              {/* Background */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `url(${HERO_BG})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0D1117]/60 via-[#0D1117]/80 to-[#0D1117]" />

              {/* Content */}
              <div className="relative z-10 text-center max-w-md px-6">
                <div className="mb-6">
                  <img
                    src={EMPTY_STATE_IMG}
                    alt="Empty state"
                    className="w-48 h-auto mx-auto opacity-40"
                  />
                </div>
                <h2 className="text-lg font-semibold text-[#E6EDF3] mb-2">
                  Paste Telemetry Data
                </h2>
                <p className="text-sm text-[#8B949E] mb-6 leading-relaxed">
                  Open the left panel and paste your JSON telemetry log to visualize
                  it as an async-aware flame graph with wall-clock time.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={loadSampleAndShow}
                    className="px-4 py-2 rounded-md bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] text-sm font-medium hover:bg-[#00D4FF]/20 transition-colors"
                  >
                    Load Sample Data
                  </button>
                  {!panelOpen && (
                    <button
                      onClick={() => setPanelOpen(true)}
                      className="text-xs text-[#6E7681] hover:text-[#8B949E] transition-colors"
                    >
                      or open the input panel (Ctrl+B)
                    </button>
                  )}
                </div>

                {/* Format hints */}
                <div className="mt-8 text-left">
                  <p className="text-[10px] text-[#6E7681] uppercase tracking-wider mb-3 text-center">
                    Supported Formats
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Span Tree', desc: 'startTime + endTime' },
                      { label: 'Sample Tree', desc: 'value + children' },
                      { label: 'OpenTelemetry', desc: 'OTLP spans' },
                      { label: 'Flat Profile', desc: 'level + value + self' },
                    ].map(fmt => (
                      <div
                        key={fmt.label}
                        className="px-3 py-2 rounded bg-[#161B22]/60 border border-[#21262D]/50"
                      >
                        <div className="text-[11px] font-medium text-[#E6EDF3]">{fmt.label}</div>
                        <div className="text-[10px] text-[#6E7681]">{fmt.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
