# TODO

- [x] Remove onWheel zoom handler from FlameGraph canvas
- [x] Add zoom in/out/reset buttons to Toolbar
- [x] Compressed hash-fragment URL sharing (pako gzip + base64url)
- [x] Support concurrent/blocking/_wall_clock fields from profiler
- [x] Wall-Clock / Scaled mode toggle
- [x] FIX: Scaled mode nested hierarchy layout

## New Features
- [ ] Dual-value tooltips: show both scaled duration and _wall_clock in Scaled mode
- [ ] Click-to-focus subtree: click a span to zoom into it as new root
- [ ] Breadcrumb trail: show navigation path back to root when focused
- [ ] Export as PNG: render current flame graph view to downloadable PNG
- [ ] Export as SVG: render current flame graph view to downloadable SVG

## Paper Stack View for Parallel Children
- [ ] Add parallelGroupId and parallelIndex to ProcessedSpan to track which parallel group a span belongs to
- [ ] Track active parallel child index per group in state (Map<groupId, activeIndex>)
- [ ] In wall-clock layout: instead of separate lanes, only layout the active child's subtree at full parent width
- [ ] Draw paper-stack visual indicator (stacked pages effect) in the corner of parallel spans
- [ ] Show "2/3" or similar counter on the stack indicator
- [ ] Click on stack corner to cycle to next parallel sibling
- [ ] Recalculate depths when cycling (since different children may have different subtree depths)
- [ ] Update tooltip to show "Parallel child 2 of 3" info
- [ ] Keep Scaled mode unchanged (children already fit within parent)
