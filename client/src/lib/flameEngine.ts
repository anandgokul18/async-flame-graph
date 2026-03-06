/**
 * Flame Graph Engine — Core data processing for async/parallel telemetry
 * 
 * Design: "Observatory" dark data console
 * Key feature: Properly handles async/parallel children by using wall-clock time
 * instead of summing child durations.
 * 
 * Supports two rendering modes:
 *   1. Wall-Clock (to_dict): children show true wall-clock values, can overflow parent
 *   2. Scaled (to_scaled_dict): children proportionally scaled to fit within parent
 * 
 * Supports JSON formats:
 *   1. Span-based (with startTime/endTime or duration)
 *   2. Sample-based (with value/samples, converted via Hz)
 *   3. OpenTelemetry / Jaeger
 *   4. Flat profile (Grafana-style)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type RenderMode = 'wall-clock' | 'scaled';

export interface RawSpan {
  name: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  value?: number;
  samples?: number;
  self?: number;
  children?: RawSpan[];
  // Async / concurrency markers
  async?: boolean;
  parallel?: boolean;
  concurrent?: boolean;       // from profiler's divergence detection
  blocking?: boolean;         // whether child is actively awaited
  _wall_clock?: number;       // original wall-clock value from to_scaled_dict()
  // OpenTelemetry-style fields
  operationName?: string;
  spanID?: string;
  traceID?: string;
  references?: Array<{ refType: string; spanID: string }>;
  startTimeUnixNano?: number | string;
  endTimeUnixNano?: number | string;
  // Generic telemetry
  attributes?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  status?: { code?: number; message?: string };
}

export interface ProcessedSpan {
  id: string;
  name: string;
  startTime: number;   // in seconds
  endTime: number;      // in seconds
  duration: number;     // wall-clock duration in seconds
  selfTime: number;     // self time in seconds
  depth: number;
  children: ProcessedSpan[];
  isAsync: boolean;
  isParallel: boolean;
  isConcurrent: boolean;   // from profiler concurrent=true
  isBlocking: boolean;     // from profiler blocking field
  wallClockValue: number;  // original _wall_clock value (for scaled mode)
  scaledValue: number;     // the scaled value used for rendering width
  // Visual layout
  x: number;            // normalized x position (0-1)
  width: number;        // normalized width (0-1)
  y: number;            // row index
  color: string;
  // Metadata
  attributes?: Record<string, unknown>;
  parentId?: string;
}

export interface FlameData {
  root: ProcessedSpan;
  totalDuration: number;  // in seconds
  maxDepth: number;
  allSpans: ProcessedSpan[];
  asyncGroups: Map<string, ProcessedSpan[]>;
}

export interface ProcessingOptions {
  hz: number;
  mode: 'time' | 'samples';
  renderMode: RenderMode;
}

// ─── Color Generation ────────────────────────────────────────────────────────

const COLOR_PALETTES = {
  warm: [
    '#FF6B35', '#FF8C42', '#FFB347', '#FFD166', '#F4845F',
    '#F7B267', '#F79D65', '#F4722B', '#D4A373', '#E07A5F',
  ],
  cool: [
    '#00D4FF', '#00B4D8', '#0096C7', '#0077B6', '#48CAE4',
    '#90E0EF', '#00B7C2', '#1B98E0', '#247BA0', '#006D77',
  ],
  neutral: [
    '#6C757D', '#7B8794', '#8E99A4', '#A0AAB4', '#B2BAC2',
    '#8B8C89', '#9A9B97', '#A8A9A5', '#7D7F7C', '#6B6D6A',
  ],
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getSpanColor(name: string, selfTimeRatio: number): string {
  if (selfTimeRatio > 0.3) {
    return COLOR_PALETTES.warm[hashString(name) % COLOR_PALETTES.warm.length];
  } else if (selfTimeRatio > 0.1) {
    const mixed = [...COLOR_PALETTES.warm.slice(0, 3), ...COLOR_PALETTES.cool.slice(0, 3)];
    return mixed[hashString(name) % mixed.length];
  } else {
    return COLOR_PALETTES.cool[hashString(name) % COLOR_PALETTES.cool.length];
  }
}

export function getPackageColor(name: string): string {
  const allColors = [...COLOR_PALETTES.warm, ...COLOR_PALETTES.cool];
  const parts = name.split(/[./\\:@]/);
  const pkg = parts.length > 1 ? parts.slice(0, -1).join('.') : name;
  return allColors[hashString(pkg) % allColors.length];
}

// ─── ID Generation ───────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `span_${++idCounter}`;
}

// ─── Data Detection & Parsing ────────────────────────────────────────────────

type DataFormat = 'span-tree' | 'otel-spans' | 'jaeger' | 'sample-tree' | 'flat-profile' | 'unknown';

function detectFormat(data: unknown): DataFormat {
  if (!data) return 'unknown';

  // Array of spans (OpenTelemetry / Jaeger style)
  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first === 'object') {
      if ('startTimeUnixNano' in first || 'endTimeUnixNano' in first) return 'otel-spans';
      if ('traceID' in first && 'spanID' in first) return 'jaeger';
      if ('level' in first && 'value' in first && 'label' in first) return 'flat-profile';
    }
    return 'unknown';
  }

  // Object tree
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    // Has timing info -> span tree
    if ('startTime' in obj || 'endTime' in obj || 'duration' in obj ||
        'startTimeUnixNano' in obj || 'endTimeUnixNano' in obj) {
      return 'span-tree';
    }
    // Has value/samples -> sample tree (d3-flame-graph style)
    if ('value' in obj || 'samples' in obj) {
      return 'sample-tree';
    }
    // Has children -> likely a tree
    if ('children' in obj && 'name' in obj) {
      return 'span-tree';
    }
    // Nested resourceSpans (OTLP export)
    if ('resourceSpans' in obj) {
      return 'otel-spans';
    }
  }

  return 'unknown';
}

// ─── Detect if data uses to_scaled_dict format ──────────────────────────────

function hasScaledDictFields(raw: RawSpan): boolean {
  if (raw._wall_clock !== undefined) return true;
  if (raw.children) {
    return raw.children.some(c => hasScaledDictFields(c));
  }
  return false;
}

function hasConcurrentField(raw: RawSpan): boolean {
  if (raw.concurrent === true) return true;
  if (raw.children) {
    return raw.children.some(c => hasConcurrentField(c));
  }
  return false;
}

// ─── Processing Functions ────────────────────────────────────────────────────

function processSpanTree(
  raw: RawSpan,
  options: ProcessingOptions,
  depth: number = 0,
  parentStart: number = 0,
  parentId?: string,
): ProcessedSpan {
  const id = generateId();
  const name = raw.name || raw.operationName || 'unknown';

  // Determine timing
  let startTime: number;
  let endTime: number;

  if (raw.startTime !== undefined && raw.endTime !== undefined) {
    startTime = raw.startTime;
    endTime = raw.endTime;
  } else if (raw.startTimeUnixNano !== undefined && raw.endTimeUnixNano !== undefined) {
    startTime = Number(raw.startTimeUnixNano) / 1e9;
    endTime = Number(raw.endTimeUnixNano) / 1e9;
  } else if (raw.duration !== undefined) {
    startTime = raw.startTime ?? parentStart;
    endTime = startTime + raw.duration;
  } else if (raw.value !== undefined || raw.samples !== undefined) {
    // Sample-based: convert to time using Hz
    // In wall-clock mode, prefer _wall_clock over value if available
    const useWallClock = options.renderMode === 'wall-clock' && raw._wall_clock !== undefined;
    const samples = useWallClock ? raw._wall_clock! : (raw.value ?? raw.samples ?? 0);
    const duration = options.hz > 0 ? samples / options.hz : samples;
    startTime = parentStart;
    endTime = startTime + duration;
  } else {
    startTime = parentStart;
    endTime = parentStart;
  }

  const duration = endTime - startTime;

  // Detect concurrency: concurrent=true (profiler) OR async=true (manual) OR parallel=true
  const isConcurrent = raw.concurrent === true || raw.async === true || raw.parallel === true;
  const isBlocking = raw.blocking === true;
  const wallClockValue = raw._wall_clock !== undefined
    ? (options.hz > 0 ? raw._wall_clock / options.hz : raw._wall_clock)
    : duration;
  const scaledValue = duration;

  // Process children
  const children: ProcessedSpan[] = [];

  if (raw.children && raw.children.length > 0) {
    if (isConcurrent) {
      // CONCURRENT/ASYNC: Children start at the same time as parent
      for (const child of raw.children) {
        const processed = processSpanTree(child, options, depth + 1, startTime, id);
        children.push(processed);
      }
    } else {
      // SEQUENTIAL: Children are laid out one after another
      const childrenHaveTiming = raw.children.some(c =>
        (c.startTime !== undefined && c.endTime !== undefined) ||
        (c.startTimeUnixNano !== undefined && c.endTimeUnixNano !== undefined)
      );

      if (childrenHaveTiming) {
        for (const child of raw.children) {
          const processed = processSpanTree(child, options, depth + 1, startTime, id);
          children.push(processed);
        }
      } else {
        // Lay out sequentially
        let currentStart = startTime;
        for (const child of raw.children) {
          const processed = processSpanTree(child, options, depth + 1, currentStart, id);
          children.push(processed);
          currentStart = processed.endTime;
        }
      }
    }

    // Auto-detect parallel: if children overlap in time, they're parallel
    if (!isConcurrent && children.length > 1) {
      const sorted = [...children].sort((a, b) => a.startTime - b.startTime);
      let hasOverlap = false;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startTime < sorted[i - 1].endTime) {
          hasOverlap = true;
          break;
        }
      }
      if (hasOverlap) {
        for (const child of children) {
          (child as ProcessedSpan).isParallel = true;
        }
      }
    }
  }

  // Calculate self time
  let childCoveredTime: number;
  if (isConcurrent && children.length > 0) {
    const minStart = Math.min(...children.map(c => c.startTime));
    const maxEnd = Math.max(...children.map(c => c.endTime));
    childCoveredTime = maxEnd - minStart;
  } else {
    childCoveredTime = children.reduce((sum, c) => sum + c.duration, 0);
  }
  const selfTime = raw.self !== undefined
    ? (options.hz > 0 ? raw.self / options.hz : raw.self)
    : Math.max(0, duration - childCoveredTime);

  const span: ProcessedSpan = {
    id,
    name,
    startTime,
    endTime,
    duration,
    selfTime,
    depth,
    children,
    isAsync: isConcurrent,
    isParallel: false,
    isConcurrent,
    isBlocking: isBlocking,
    wallClockValue,
    scaledValue,
    x: 0,
    width: 0,
    y: depth,
    color: '',
    attributes: raw.attributes || raw.tags || undefined,
    parentId,
  };

  return span;
}

function processOtelSpans(data: unknown, options: ProcessingOptions): ProcessedSpan {
  let spans: RawSpan[] = [];

  if (Array.isArray(data)) {
    spans = data;
  } else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if ('resourceSpans' in obj) {
      const resourceSpans = obj.resourceSpans as Array<{
        scopeSpans?: Array<{ spans?: RawSpan[] }>;
        instrumentationLibrarySpans?: Array<{ spans?: RawSpan[] }>;
      }>;
      for (const rs of resourceSpans) {
        const scopeSpans = rs.scopeSpans || rs.instrumentationLibrarySpans || [];
        for (const ss of scopeSpans) {
          if (ss.spans) spans.push(...ss.spans);
        }
      }
    }
  }

  const spanMap = new Map<string, RawSpan>();
  const childMap = new Map<string, RawSpan[]>();

  for (const span of spans) {
    const sid = span.spanID || '';
    spanMap.set(sid, span);
    if (!span.children) span.children = [];
  }

  let rootSpan: RawSpan | undefined;

  for (const span of spans) {
    const refs = span.references || [];
    let parentId: string | undefined;
    for (const ref of refs) {
      if (ref.refType === 'CHILD_OF' || ref.refType === 'childOf') {
        parentId = ref.spanID;
        break;
      }
    }

    if (parentId && spanMap.has(parentId)) {
      const parent = spanMap.get(parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(span);
    } else {
      if (!rootSpan || (span.startTimeUnixNano && rootSpan.startTimeUnixNano &&
          Number(span.startTimeUnixNano) < Number(rootSpan.startTimeUnixNano))) {
        rootSpan = span;
      }
    }
  }

  if (!rootSpan && spans.length > 0) {
    rootSpan = spans[0];
  }

  if (!rootSpan) {
    return createEmptySpan();
  }

  return processSpanTree(rootSpan, options);
}

function processFlatProfile(data: Array<{ level: number; value: number; self: number; label: string }>, options: ProcessingOptions): ProcessedSpan {
  if (data.length === 0) return createEmptySpan();

  const stack: ProcessedSpan[] = [];
  let root: ProcessedSpan | undefined;

  for (const row of data) {
    const samples = row.value;
    const duration = options.hz > 0 ? samples / options.hz : samples;
    const selfSamples = row.self;
    const selfTime = options.hz > 0 ? selfSamples / options.hz : selfSamples;

    const span: ProcessedSpan = {
      id: generateId(),
      name: row.label,
      startTime: 0,
      endTime: duration,
      duration,
      selfTime,
      depth: row.level,
      children: [],
      isAsync: false,
      isParallel: false,
      isConcurrent: false,
      isBlocking: false,
      wallClockValue: duration,
      scaledValue: duration,
      x: 0,
      width: 0,
      y: row.level,
      color: '',
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= row.level) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].children.push(span);
      span.parentId = stack[stack.length - 1].id;
    } else {
      root = span;
    }

    stack.push(span);
  }

  return root || createEmptySpan();
}

function createEmptySpan(): ProcessedSpan {
  return {
    id: generateId(),
    name: 'empty',
    startTime: 0,
    endTime: 0,
    duration: 0,
    selfTime: 0,
    depth: 0,
    children: [],
    isAsync: false,
    isParallel: false,
    isConcurrent: false,
    isBlocking: false,
    wallClockValue: 0,
    scaledValue: 0,
    x: 0,
    width: 0,
    y: 0,
    color: '#6C757D',
  };
}

// ─── Layout Calculation ──────────────────────────────────────────────────────

/**
 * Wall-Clock layout: children of concurrent parents are rendered in parallel lanes.
 * Children can visually overflow the parent width (true wall-clock representation).
 */
function calculateLayoutWallClock(span: ProcessedSpan, totalDuration: number): void {
  if (totalDuration <= 0) {
    span.x = 0;
    span.width = 1;
  } else {
    span.x = span.startTime / totalDuration;
    span.width = span.duration / totalDuration;
  }

  const selfRatio = span.duration > 0 ? span.selfTime / span.duration : 0;
  span.color = getSpanColor(span.name, selfRatio);

  if (span.children.length > 0) {
    const isParallelGroup = span.isAsync || span.isConcurrent || span.children.some(c => c.isParallel);

    if (isParallelGroup) {
      let laneOffset = 0;
      for (let i = 0; i < span.children.length; i++) {
        const child = span.children[i];
        adjustDepth(child, laneOffset);
        calculateLayoutWallClock(child, totalDuration);
        const childMaxDepth = getSubtreeDepth(child);
        laneOffset += (childMaxDepth - child.depth + 1);
      }
    } else {
      for (const child of span.children) {
        calculateLayoutWallClock(child, totalDuration);
      }
    }
  }
}

/**
 * Scaled layout: children of concurrent parents are proportionally scaled
 * to fit within the parent's width. The _wall_clock values are preserved
 * in wallClockValue for tooltip display.
 * 
 * This matches the to_scaled_dict() behavior:
 *   child_scale = parent.value / sum(children.value)
 *   Each child width = child.value * child_scale
 */
function calculateLayoutScaled(span: ProcessedSpan, totalDuration: number): void {
  if (totalDuration <= 0) {
    span.x = 0;
    span.width = 1;
  } else {
    span.x = span.startTime / totalDuration;
    span.width = span.duration / totalDuration;
  }

  const selfRatio = span.duration > 0 ? span.selfTime / span.duration : 0;
  span.color = getSpanColor(span.name, selfRatio);

  if (span.children.length > 0) {
    const isParallelGroup = span.isAsync || span.isConcurrent || span.children.some(c => c.isParallel);

    if (isParallelGroup) {
      // Scale children to fit within parent width
      const childSum = span.children.reduce((sum, c) => sum + c.duration, 0);
      const scale = childSum > 0 ? span.duration / childSum : 1;

      // Lay out children sequentially within parent's width (scaled to fit)
      let currentX = span.startTime;
      for (const child of span.children) {
        const scaledDuration = child.duration * scale;
        // Preserve wall-clock for tooltip
        child.wallClockValue = child.duration;
        // Override start/end for scaled layout
        const origStart = child.startTime;
        const origEnd = child.endTime;
        child.startTime = currentX;
        child.endTime = currentX + scaledDuration;
        child.scaledValue = scaledDuration;
        // Recursively layout (children of this child use their own proportions)
        calculateLayoutScaled(child, totalDuration);
        // Restore original times for tooltip display
        child.startTime = origStart;
        child.endTime = origEnd;
        // But keep the scaled x/width
        child.x = currentX / totalDuration;
        child.width = scaledDuration / totalDuration;
        currentX += scaledDuration;
      }

      // In scaled mode, children are sequential (no lane offsets needed)
      // But we still need to set depth correctly
      for (const child of span.children) {
        // All children at same depth (sequential in scaled view)
        // No lane offset needed
      }
    } else {
      for (const child of span.children) {
        calculateLayoutScaled(child, totalDuration);
      }
    }
  }
}

function adjustDepth(span: ProcessedSpan, offset: number): void {
  span.depth += offset;
  span.y = span.depth;
  for (const child of span.children) {
    adjustDepth(child, offset);
  }
}

function getSubtreeDepth(span: ProcessedSpan): number {
  if (span.children.length === 0) return span.depth;
  return Math.max(span.depth, ...span.children.map(getSubtreeDepth));
}

function collectAllSpans(span: ProcessedSpan, result: ProcessedSpan[] = []): ProcessedSpan[] {
  result.push(span);
  for (const child of span.children) {
    collectAllSpans(child, result);
  }
  return result;
}

function calculateMaxDepth(span: ProcessedSpan): number {
  if (span.children.length === 0) return span.depth;
  return Math.max(span.depth, ...span.children.map(calculateMaxDepth));
}

// ─── Main Processing Entry Point ─────────────────────────────────────────────

export function processFlameData(rawJson: unknown, options: ProcessingOptions): FlameData {
  idCounter = 0;
  const format = detectFormat(rawJson);

  let root: ProcessedSpan;

  switch (format) {
    case 'span-tree':
    case 'sample-tree':
      root = processSpanTree(rawJson as RawSpan, options);
      break;
    case 'otel-spans':
    case 'jaeger':
      root = processOtelSpans(rawJson, options);
      break;
    case 'flat-profile':
      root = processFlatProfile(rawJson as Array<{ level: number; value: number; self: number; label: string }>, options);
      break;
    default:
      if (typeof rawJson === 'object' && rawJson !== null) {
        root = processSpanTree(rawJson as RawSpan, options);
      } else {
        root = createEmptySpan();
      }
  }

  const totalDuration = root.duration;

  // Apply layout based on render mode
  if (options.renderMode === 'scaled') {
    calculateLayoutScaled(root, totalDuration);
  } else {
    calculateLayoutWallClock(root, totalDuration);
  }

  const allSpans = collectAllSpans(root);
  const maxDepth = calculateMaxDepth(root);

  // Group async spans
  const asyncGroups = new Map<string, ProcessedSpan[]>();
  for (const span of allSpans) {
    if (span.isAsync || span.isParallel || span.isConcurrent) {
      const groupKey = span.parentId || 'root';
      if (!asyncGroups.has(groupKey)) {
        asyncGroups.set(groupKey, []);
      }
      asyncGroups.get(groupKey)!.push(span);
    }
  }

  return {
    root,
    totalDuration,
    maxDepth,
    allSpans,
    asyncGroups,
  };
}

// ─── Auto-detect recommended render mode ─────────────────────────────────────

export function detectRecommendedMode(rawJson: unknown): { hasScaled: boolean; hasConcurrent: boolean; recommended: RenderMode } {
  if (!rawJson || typeof rawJson !== 'object') {
    return { hasScaled: false, hasConcurrent: false, recommended: 'wall-clock' };
  }
  const raw = rawJson as RawSpan;
  const hasScaled = hasScaledDictFields(raw);
  const hasConcurrent = hasConcurrentField(raw);
  return {
    hasScaled,
    hasConcurrent,
    recommended: hasScaled ? 'scaled' : 'wall-clock',
  };
}

// ─── Sample Data Generator ───────────────────────────────────────────────────

export function generateSampleData(): RawSpan {
  return {
    name: "HTTP GET /api/dashboard",
    startTime: 0,
    endTime: 4.5,
    children: [
      {
        name: "Authentication Middleware",
        startTime: 0,
        endTime: 0.3,
        children: [
          {
            name: "JWT Token Validation",
            startTime: 0,
            endTime: 0.15,
          },
          {
            name: "Permission Check",
            startTime: 0.15,
            endTime: 0.3,
          }
        ]
      },
      {
        name: "Fetch Dashboard Data",
        startTime: 0.3,
        endTime: 4.3,
        async: true,
        children: [
          {
            name: "Query User Profile (DB)",
            startTime: 0.3,
            endTime: 1.1,
            children: [
              {
                name: "Connection Pool Acquire",
                startTime: 0.3,
                endTime: 0.4,
              },
              {
                name: "SQL Execute: SELECT * FROM users",
                startTime: 0.4,
                endTime: 0.95,
              },
              {
                name: "Result Deserialization",
                startTime: 0.95,
                endTime: 1.1,
              }
            ]
          },
          {
            name: "Fetch Analytics (External API)",
            startTime: 0.3,
            endTime: 3.2,
            children: [
              {
                name: "HTTP POST analytics.service/query",
                startTime: 0.3,
                endTime: 2.8,
                children: [
                  {
                    name: "DNS Resolution",
                    startTime: 0.3,
                    endTime: 0.45,
                  },
                  {
                    name: "TLS Handshake",
                    startTime: 0.45,
                    endTime: 0.7,
                  },
                  {
                    name: "Request/Response",
                    startTime: 0.7,
                    endTime: 2.8,
                  }
                ]
              },
              {
                name: "Parse Analytics Response",
                startTime: 2.8,
                endTime: 3.2,
              }
            ]
          },
          {
            name: "Load Notifications (Redis)",
            startTime: 0.3,
            endTime: 0.8,
            children: [
              {
                name: "Redis GET notifications:user:123",
                startTime: 0.3,
                endTime: 0.6,
              },
              {
                name: "Deserialize Notification List",
                startTime: 0.6,
                endTime: 0.8,
              }
            ]
          }
        ]
      },
      {
        name: "Response Serialization",
        startTime: 4.3,
        endTime: 4.45,
      },
      {
        name: "Compression (gzip)",
        startTime: 4.45,
        endTime: 4.5,
      }
    ]
  };
}

export function generateSampleDataSamples(): RawSpan {
  return {
    name: "main",
    value: 450,
    children: [
      {
        name: "init",
        value: 50,
        children: [
          { name: "loadConfig", value: 20 },
          { name: "setupLogger", value: 15 },
          { name: "connectDB", value: 15 },
        ]
      },
      {
        name: "processRequest",
        value: 350,
        async: true,
        children: [
          {
            name: "validateInput",
            value: 30,
          },
          {
            name: "queryDatabase",
            value: 200,
            children: [
              { name: "buildQuery", value: 20 },
              { name: "executeQuery", value: 150 },
              { name: "parseResults", value: 30 },
            ]
          },
          {
            name: "callExternalAPI",
            value: 180,
            children: [
              { name: "serializeRequest", value: 10 },
              { name: "httpCall", value: 150 },
              { name: "deserializeResponse", value: 20 },
            ]
          }
        ]
      },
      {
        name: "sendResponse",
        value: 50,
        children: [
          { name: "serialize", value: 30 },
          { name: "compress", value: 20 },
        ]
      }
    ]
  };
}

/**
 * Sample data matching the profiler's to_dict() format (wall-clock, concurrent=true)
 * Children sum > parent (200+300+400=900 vs parent=400) — true parallelism
 */
export function generateSampleWallClock(): RawSpan {
  return {
    name: "root@",
    value: 400,
    children: [
      {
        name: "invoke_analect@confucius.py",
        value: 400,
        children: [
          {
            name: "gather@asyncio",
            value: 400,
            concurrent: true,
            children: [
              { name: "do_retrieval@tools.py", value: 200, blocking: true },
              { name: "do_llm_call@llm.py", value: 300, blocking: true },
              { name: "do_tool_exec@tools.py", value: 400, blocking: false },
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Sample data matching the profiler's to_scaled_dict() format (proportionally scaled)
 * Children fit within parent, _wall_clock preserves originals
 * Scale: 400/900 ≈ 0.44
 */
export function generateSampleScaled(): RawSpan {
  return {
    name: "root@",
    value: 400,
    children: [
      {
        name: "invoke_analect@confucius.py",
        value: 400,
        children: [
          {
            name: "gather@asyncio",
            value: 400,
            concurrent: true,
            children: [
              { name: "do_retrieval@tools.py", value: 88, _wall_clock: 200, blocking: true },
              { name: "do_llm_call@llm.py", value: 133, _wall_clock: 300, blocking: true },
              { name: "do_tool_exec@tools.py", value: 177, _wall_clock: 400, blocking: false },
            ]
          }
        ]
      }
    ]
  };
}

// ─── Formatting Helpers ──────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  if (seconds < 0.001) return `${(seconds * 1_000_000).toFixed(0)}µs`;
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)}ms`;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs.toFixed(1)}s`;
}

export function formatSamples(samples: number): string {
  if (samples < 1000) return `${samples}`;
  if (samples < 1_000_000) return `${(samples / 1000).toFixed(1)}K`;
  return `${(samples / 1_000_000).toFixed(1)}M`;
}
