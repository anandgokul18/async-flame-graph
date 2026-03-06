# Layout Bug Analysis: Scaled Mode Children Not Nested

## Problem
In Scaled mode, all children start from x=0 (left edge) instead of being nested within their parent span. The d3-flame-graph style shows children indented within the parent bar.

## Root Cause
In `calculateLayoutScaled()`, for NON-parallel groups (the `else` branch on line 576), children simply recurse with `calculateLayoutScaled(child, totalDuration)`. But the child's `startTime` was set during `processSpanTree` as sequential offsets from the parent's start. The x position is calculated as `span.startTime / totalDuration`.

The issue is that for sample-based data (value-only, no startTime/endTime), the `processSpanTree` function lays out children sequentially starting from `parentStart`. This means child.startTime = parentStart, not relative to the parent. So x = parentStart / totalDuration = 0 for the root's first child, which is correct.

Wait, looking more carefully at the screenshot: the user says everything starts from the left side. Looking at the first screenshot, the bars like `_bootstrap@runtime/lib/python3.12/threading.py` DO start from x=0 and span the full width. But in the second screenshot (correct behavior), they also start from x=0 because they ARE the root's direct children with nearly the same duration.

The real issue might be deeper in the tree. Let me look at the `_run@runtime/lib/python3.12/asyncio/events.py` row in both screenshots. In the first (broken), its children all start from x=0. In the second (correct), the children are properly nested within the parent's x range.

The bug is in `calculateLayoutScaled` for the non-parallel branch. When a non-concurrent parent has children, the children's x positions should be relative to the parent's x position. Currently, children use their absolute startTime which was set during processSpanTree. For sample-tree data, the sequential layout sets child startTimes correctly, but the x calculation `span.startTime / totalDuration` uses the absolute time, which should work.

Actually, the real problem is: for sample-tree data without explicit startTime/endTime, the children are laid out sequentially in processSpanTree. But the x/width in calculateLayoutScaled is computed from startTime/totalDuration. If the root has value=1772 (17.72s at 100Hz), and its first child has value=1727, then child.startTime=0, child.duration=17.27s. The child's x=0/17.72=0, width=17.27/17.72. That's correct.

But the child's children... if child1 has value=1727 and its children sum to more than 1727 (because of concurrent children), then in scaled mode we need to scale them down. The issue is that in the non-parallel branch, children just recurse with calculateLayoutScaled, which computes x = child.startTime / totalDuration. The child.startTime was set in processSpanTree as sequential offsets. So if parent starts at 0 and has duration 17.27, and its first child starts at 0 with duration 17.27, that child's first grandchild also starts at 0 with its own duration. This should be correct for the non-parallel case.

BUT: for the parallel case (line 541-574), the code overrides child.x and child.width. It sets child.x = currentX / totalDuration. But then it recursively calls calculateLayoutScaled(child, totalDuration) BEFORE setting child.x. The recursive call sets child.x based on child.startTime, but then we override it. However, the recursive call also processes grandchildren, and those grandchildren use child.startTime (the original, not the scaled one) for their own positioning.

THIS IS THE BUG: When we scale a concurrent parent's children to fit, we change their effective x positions. But the grandchildren still use the original (unscaled) startTime values, so they don't get nested within the scaled parent positions.

## Fix
Need to propagate the scaled x offset to grandchildren. When laying out concurrent children in scaled mode, we need to pass the scaled offset down to recursive calls.
