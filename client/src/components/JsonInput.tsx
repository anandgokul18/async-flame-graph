/**
 * JsonInput — Code-editor style JSON input panel
 * Design: Observatory dark console
 * Features: syntax validation, line numbers, sample data loading
 */

import { useCallback, useRef, useState } from "react";
import {
  generateSampleData,
  generateSampleDataSamples,
  generateSampleWallClock,
  generateSampleScaled,
} from "@/lib/flameEngine";
import {
  AlertCircle,
  CheckCircle2,
  FileJson,
  Upload,
  Trash2,
  ChevronDown,
} from "lucide-react";

interface JsonInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  hz: number;
  onHzChange: (hz: number) => void;
}

export default function JsonInput({
  value,
  onChange,
  error,
  hz,
  onHzChange,
}: JsonInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSamples, setShowSamples] = useState(false);

  const lineCount = value ? value.split('\n').length : 1;

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      try {
        const parsed = JSON.parse(textarea.value);
        const formatted = JSON.stringify(parsed, null, 2);
        onChange(formatted);
      } catch {
        // Not valid JSON yet
      }
    }, 0);
  }, [onChange]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        onChange(JSON.stringify(parsed, null, 2));
      } catch {
        onChange(text);
      }
    };
    reader.readAsText(file);
  }, [onChange]);

  const loadSample = useCallback((type: 'time' | 'samples' | 'wall-clock' | 'scaled') => {
    let data;
    switch (type) {
      case 'time':
        data = generateSampleData();
        break;
      case 'samples':
        data = generateSampleDataSamples();
        break;
      case 'wall-clock':
        data = generateSampleWallClock();
        break;
      case 'scaled':
        data = generateSampleScaled();
        break;
    }
    onChange(JSON.stringify(data, null, 2));
    setShowSamples(false);
  }, [onChange]);

  const formatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // Can't format invalid JSON
    }
  }, [value, onChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262D] bg-[#0D1117]">
        <div className="flex items-center gap-2">
          <FileJson size={14} className="text-[#8B949E]" />
          <span className="text-[11px] font-medium text-[#E6EDF3]">Telemetry JSON</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            title="Upload JSON file"
          >
            <Upload size={13} />
          </button>
          <button
            onClick={() => { onChange(''); }}
            className="p-1.5 rounded hover:bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            title="Clear"
          >
            <Trash2 size={13} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            >
              Samples <ChevronDown size={11} />
            </button>
            {showSamples && (
              <div className="absolute right-0 top-full mt-1 z-50 glass-panel rounded-md shadow-xl py-1 min-w-[240px]">
                <div className="px-3 py-1 text-[9px] text-[#6E7681] uppercase tracking-wider">
                  Time-based
                </div>
                <button
                  onClick={() => loadSample('time')}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
                >
                  Async HTTP Request (startTime/endTime)
                </button>
                <button
                  onClick={() => loadSample('samples')}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
                >
                  CPU Profile (sample-based values)
                </button>
                <div className="my-1 border-t border-[#21262D]" />
                <div className="px-3 py-1 text-[9px] text-[#6E7681] uppercase tracking-wider">
                  Profiler Formats
                </div>
                <button
                  onClick={() => loadSample('wall-clock')}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
                >
                  <span className="text-[#00D4FF]">to_dict()</span>
                  <span className="text-[#6E7681] ml-1">— Wall-clock (concurrent=true)</span>
                </button>
                <button
                  onClick={() => loadSample('scaled')}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
                >
                  <span className="text-[#FFB020]">to_scaled_dict()</span>
                  <span className="text-[#6E7681] ml-1">— Scaled (_wall_clock)</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Hz Configuration */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[#21262D] bg-[#0D1117]/80">
        <label className="text-[11px] text-[#8B949E] whitespace-nowrap">
          Sample Rate
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={hz}
            onChange={(e) => onHzChange(Math.max(1, parseInt(e.target.value) || 100))}
            className="w-20 px-2 py-1 rounded bg-[#161B22] border border-[#21262D] text-[#E6EDF3] font-mono text-[11px] focus:border-[#00D4FF] focus:outline-none transition-colors"
          />
          <span className="text-[11px] text-[#8B949E]">Hz</span>
        </div>
        <span className="text-[10px] text-[#6E7681]">
          (1 sample = {(1000 / hz).toFixed(2)}ms)
        </span>
      </div>

      {/* Editor area */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex overflow-auto">
          {/* Line numbers */}
          <div className="flex-shrink-0 w-10 bg-[#0D1117] border-r border-[#21262D] select-none overflow-hidden">
            <div className="py-2 px-1">
              {Array.from({ length: Math.max(lineCount, 20) }, (_, i) => (
                <div
                  key={i}
                  className="text-[11px] font-mono text-[#6E7681] text-right pr-1 leading-[1.6]"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            className="json-input flex-1 bg-transparent text-[#E6EDF3] p-2 focus:outline-none w-full"
            placeholder={`Paste your telemetry JSON here...

Supported formats:
• Span tree: { name, startTime, endTime, children: [...] }
• Sample tree: { name, value, children: [...] }
• Profiler to_dict(): { name, value, concurrent: true, children: [...] }
• Profiler to_scaled_dict(): { name, value, _wall_clock, children: [...] }
• OpenTelemetry spans
• Flat profile: [{ level, value, self, label }]

Tip: Use "concurrent": true or "async": true
     to enable parallel child rendering.`}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#21262D] bg-[#0D1117]">
        <div className="flex items-center gap-2">
          {error ? (
            <>
              <AlertCircle size={12} className="text-red-400" />
              <span className="text-[10px] text-red-400 truncate max-w-[250px]">{error}</span>
            </>
          ) : value ? (
            <>
              <CheckCircle2 size={12} className="text-green-400" />
              <span className="text-[10px] text-green-400">Valid JSON</span>
            </>
          ) : (
            <span className="text-[10px] text-[#6E7681]">Waiting for input...</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {value && (
            <button
              onClick={formatJson}
              className="text-[10px] text-[#8B949E] hover:text-[#00D4FF] transition-colors"
            >
              Format
            </button>
          )}
          <span className="text-[10px] text-[#6E7681]">
            {lineCount} lines
          </span>
        </div>
      </div>
    </div>
  );
}
