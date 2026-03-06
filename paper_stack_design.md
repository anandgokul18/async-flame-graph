# Paper Stack Design

## Problem
In Wall-Clock mode, concurrent children are rendered in separate lanes (stacked vertically),
which causes the flame graph to become very tall and overflow when there are many parallel tasks.

## Solution: Paper Stack View
Instead of showing ALL parallel children simultaneously in separate lanes, show only ONE
parallel child at a time (the "active page"), with a visual paper-stack indicator showing
there are more pages behind it.

## How It Works

### Data Model Changes (flameEngine.ts)
1. Add `parallelGroupId` to ProcessedSpan — identifies which parallel group this span belongs to
2. Add `parallelSiblingCount` — how many siblings in the parallel group
3. Add `parallelIndex` — this span's index within the parallel group (0-based)
4. In Wall-Clock layout: instead of assigning separate lanes to each parallel child,
   only layout the ACTIVE child (based on state) at the parent's depth + 1

### State Management
- `activeParallelPages: Map<string, number>` — maps parallelGroupId → active child index
- When user clicks the stack indicator, increment the active index (wrapping around)

### Visual Rendering (FlameGraph.tsx)
1. For each concurrent parent span, only render the active child's subtree
2. Draw a "paper stack" indicator in the top-right corner of the active child:
   - 2-3 offset rectangles behind the main bar (like stacked papers)
   - A small badge showing "2/3" (current page / total pages)
3. Clicking the stack indicator cycles to the next child
4. The inactive children's subtrees are completely hidden (not rendered)

### Layout Changes
- calculateLayoutWallClock: instead of laneOffset for each child, only layout the active child
  at depth + 1 (no extra lanes needed)
- Pass `activeParallelPages` map to the layout function so it knows which child is active
- This dramatically reduces the height of the flame graph

### Interaction
- Click on the paper stack corner → cycle to next parallel sibling
- The stack indicator should be visually distinct (slightly offset rectangles + counter badge)
- Tooltip should mention "Parallel child X of Y — click stack to cycle"
