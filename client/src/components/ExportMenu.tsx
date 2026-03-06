/**
 * ExportMenu — Export flame graph as PNG or SVG
 * Design: Observatory dark console dropdown
 */

import { useState, useRef, useEffect } from "react";
import { Download, Image, FileCode } from "lucide-react";

interface ExportMenuProps {
  onExportPNG: () => void;
  onExportSVG: () => void;
}

export default function ExportMenu({ onExportPNG, onExportSVG }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium bg-[#161B22] border border-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#00D4FF]/30 transition-colors"
        title="Export flame graph"
      >
        <Download size={12} />
        <span className="hidden sm:inline">Export</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg glass-panel border border-[#21262D] shadow-xl overflow-hidden">
          <button
            onClick={() => { onExportPNG(); setOpen(false); }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-[11px] text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
          >
            <Image size={13} className="text-[#00D4FF]" />
            <div>
              <div className="font-medium">Export as PNG</div>
              <div className="text-[9px] text-[#6E7681]">Raster image for sharing</div>
            </div>
          </button>
          <div className="h-px bg-[#21262D]" />
          <button
            onClick={() => { onExportSVG(); setOpen(false); }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-[11px] text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
          >
            <FileCode size={13} className="text-[#FFB020]" />
            <div>
              <div className="font-medium">Export as SVG</div>
              <div className="text-[9px] text-[#6E7681]">Vector graphic, editable</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
