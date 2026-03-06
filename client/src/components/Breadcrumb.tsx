/**
 * Breadcrumb — Navigation trail for focused span hierarchy
 * Design: Observatory dark console with glass-panel styling
 * Shows the path from root to the currently focused span
 */

import { ChevronRight, Home } from "lucide-react";
import type { ProcessedSpan } from "@/lib/flameEngine";

interface BreadcrumbProps {
  path: ProcessedSpan[];
  onNavigate: (span: ProcessedSpan | null) => void;
}

export default function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  if (path.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-[#161B22] border-b border-[#21262D] overflow-x-auto flex-shrink-0">
      {/* Root button */}
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors flex-shrink-0"
        title="Go to root"
      >
        <Home size={10} />
        <span>root</span>
      </button>

      {/* Path segments */}
      {path.map((span, index) => {
        const isLast = index === path.length - 1;
        // Truncate long names
        const displayName = span.name.length > 40
          ? span.name.slice(0, 37) + '...'
          : span.name;

        return (
          <div key={span.id} className="flex items-center gap-0.5 flex-shrink-0">
            <ChevronRight size={10} className="text-[#30363D]" />
            <button
              onClick={() => isLast ? undefined : onNavigate(span)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors truncate max-w-[200px] ${
                isLast
                  ? 'text-[#FFB020] bg-[#FFB020]/10 border border-[#FFB020]/20 cursor-default'
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] cursor-pointer'
              }`}
              title={span.name}
            >
              {displayName}
            </button>
          </div>
        );
      })}
    </div>
  );
}
