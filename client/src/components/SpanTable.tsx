/**
 * SpanTable — Aggregated top-table view of all spans
 * Design: Observatory dark console
 * Shows symbols sorted by self time with search/focus integration
 */

import { useMemo, useState } from "react";
import type { ProcessedSpan } from "@/lib/flameEngine";
import { formatDuration } from "@/lib/flameEngine";
import { Search, Focus, Layers } from "lucide-react";

interface SpanTableProps {
  spans: ProcessedSpan[];
  totalDuration: number;
  searchQuery: string;
  onFocusSpan: (span: ProcessedSpan) => void;
  onSearchSpan: (name: string) => void;
}

interface AggregatedSpan {
  name: string;
  totalTime: number;
  selfTime: number;
  count: number;
  maxDuration: number;
  minDuration: number;
  isAsync: boolean;
  representative: ProcessedSpan;
}

type SortKey = 'self' | 'total' | 'name' | 'count';
type SortDir = 'asc' | 'desc';

export default function SpanTable({
  spans,
  totalDuration,
  searchQuery,
  onFocusSpan,
  onSearchSpan,
}: SpanTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('self');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Aggregate spans by name
  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedSpan>();

    for (const span of spans) {
      const existing = map.get(span.name);
      if (existing) {
        existing.totalTime += span.duration;
        existing.selfTime += span.selfTime;
        existing.count += 1;
        existing.maxDuration = Math.max(existing.maxDuration, span.duration);
        existing.minDuration = Math.min(existing.minDuration, span.duration);
        existing.isAsync = existing.isAsync || span.isAsync || span.isParallel;
      } else {
        map.set(span.name, {
          name: span.name,
          totalTime: span.duration,
          selfTime: span.selfTime,
          count: 1,
          maxDuration: span.duration,
          minDuration: span.duration,
          isAsync: span.isAsync || span.isParallel,
          representative: span,
        });
      }
    }

    return Array.from(map.values());
  }, [spans]);

  // Filter and sort
  const sorted = useMemo(() => {
    let filtered = aggregated;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = aggregated.filter(s => s.name.toLowerCase().includes(q));
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'self': cmp = a.selfTime - b.selfTime; break;
        case 'total': cmp = a.totalTime - b.totalTime; break;
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'count': cmp = a.count - b.count; break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [aggregated, searchQuery, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return <span className="ml-1 text-[#00D4FF]">{sortDir === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-[11px] font-mono">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#161B22] border-b border-[#21262D]">
            <th className="w-8 px-2 py-2" />
            <th
              className="text-left px-3 py-2 text-[#8B949E] font-medium cursor-pointer hover:text-[#E6EDF3] select-none"
              onClick={() => handleSort('name')}
            >
              Symbol <SortIndicator column="name" />
            </th>
            <th
              className="text-right px-3 py-2 text-[#8B949E] font-medium cursor-pointer hover:text-[#E6EDF3] w-24 select-none"
              onClick={() => handleSort('self')}
            >
              Self <SortIndicator column="self" />
            </th>
            <th
              className="text-right px-3 py-2 text-[#8B949E] font-medium cursor-pointer hover:text-[#E6EDF3] w-24 select-none"
              onClick={() => handleSort('total')}
            >
              Total <SortIndicator column="total" />
            </th>
            <th
              className="text-right px-3 py-2 text-[#8B949E] font-medium cursor-pointer hover:text-[#E6EDF3] w-16 select-none"
              onClick={() => handleSort('count')}
            >
              Count <SortIndicator column="count" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => {
            const selfPct = totalDuration > 0 ? (item.selfTime / totalDuration * 100) : 0;
            const totalPct = totalDuration > 0 ? (item.totalTime / totalDuration * 100) : 0;

            return (
              <tr
                key={idx}
                className="border-b border-[#21262D]/50 hover:bg-[#161B22] transition-colors group"
              >
                <td className="px-1 py-1.5">
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onSearchSpan(item.name)}
                      className="p-0.5 rounded hover:bg-[#30363D] text-[#8B949E] hover:text-[#00D4FF]"
                      title="Search in flame graph"
                    >
                      <Search size={12} />
                    </button>
                    <button
                      onClick={() => onFocusSpan(item.representative)}
                      className="p-0.5 rounded hover:bg-[#30363D] text-[#8B949E] hover:text-[#FFB020]"
                      title="Focus in flame graph"
                    >
                      <Focus size={12} />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: item.representative.color }}
                    />
                    <span className="text-[#E6EDF3] truncate max-w-[300px]">
                      {item.name}
                    </span>
                    {item.isAsync && (
                      <Layers size={10} className="text-[#00D4FF] flex-shrink-0" />
                    )}
                  </div>
                </td>
                <td className="text-right px-3 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#FFB020]"
                        style={{ width: `${Math.min(100, selfPct)}%` }}
                      />
                    </div>
                    <span className="text-[#FFB020] w-16 text-right">
                      {formatDuration(item.selfTime)}
                    </span>
                  </div>
                </td>
                <td className="text-right px-3 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#00D4FF]"
                        style={{ width: `${Math.min(100, totalPct)}%` }}
                      />
                    </div>
                    <span className="text-[#E6EDF3] w-16 text-right">
                      {formatDuration(item.totalTime)}
                    </span>
                  </div>
                </td>
                <td className="text-right px-3 py-1.5 text-[#8B949E]">
                  {item.count}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="text-center py-8 text-[#8B949E] text-xs">
          No matching spans found
        </div>
      )}
    </div>
  );
}
