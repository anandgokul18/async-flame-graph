# Visual Comparison

## Screenshot 1 (Broken - Scaled mode)
- root@ (17.72s) spans full width
- _bootstrap@...threading.py (17.27s) starts at x=0, nearly full width — CORRECT (it's root's child)
- _bootstrap_inner@...threading.py (17.27s) starts at x=0, nearly full width — CORRECT (nested, same duration)
- run@...threading.py (17.27s) starts at x=0 — CORRECT
- _work... run_loop@...await_utils.py (17.16s) — there's a small yellow bar at left, then run_loop starts offset — CORRECT
- run_forever@...base_events.py (17.16s) starts at x=0 — WRONG, should be offset like parent
- _run_once@...base_events.py (17.16s) starts at x=0 — WRONG
- _run@...events.py (17.16s) starts at x=0 — WRONG
- Then the concurrent row: _execute_..., _ex..., _maybe_retire_connection..., async_wrappe..., ainvoke_trac..., run_entry_repl@... — these are laid out side by side — CORRECT for concurrent
- invoke_analect@... (13.77s) starts at x=0 — WRONG, should be nested within its parent

## Screenshot 2 (Correct - Wall-Clock mode, but showing proper nesting)
- root@ (17.72s) spans full width
- SKI... _bootstrap@...threading.py (17.27s) — starts slightly offset (there's a small "SKI..." bar before it)
- _bootstrap_inner@...threading.py — starts at same offset
- run@...threading.py — same offset
- _work... run_loop@...await_utils.py — offset correctly
- run@... run_forever@...base_events.py — offset correctly
- ref... _run_once@...base_events.py — offset correctly
- _run@...events.py — offset correctly
- Then concurrent children: awa..., get..., _execute_update_with_batching@..., etc. — properly nested within parent's x range
- Below that: wai..., mkd..., _execute_..., new_func@..., sleep@... — properly nested

## Key Difference
In the broken version, the concurrent children's sub-children (like invoke_analect) start from x=0 instead of being nested within their parent's x range. The non-concurrent children deeper in the tree also start from x=0.

The fundamental issue: when processSpanTree lays out sequential children, it starts them from parentStart=0 for the root. But for sample-tree data, ALL children start from 0 because the root starts at 0 and each child chain starts from the parent's start time. The x position should be relative to the parent, not absolute.

Actually wait — in the correct screenshot (2), the Wall-Clock mode doesn't have this issue because it uses absolute startTime/endTime. But in Scaled mode, the issue is that when concurrent children are scaled to fit within parent, their sub-children don't inherit the scaled offset.

The core fix: calculateLayoutScaled needs to propagate parent x-offset to children properly, especially after scaling concurrent children.
