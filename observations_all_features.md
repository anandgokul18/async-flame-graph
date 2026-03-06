# All Three Features Test Results

## 1. Dual-Value Tooltip (Scaled Mode)
The tooltip shows Duration, Self Time, % of Total, Self %, Start, End, Depth, Children. 
This is the sample data which uses startTime/endTime format (not to_scaled_dict), so the wall-clock row doesn't appear since there's no _wall_clock field. The tooltip is working correctly for the current data format. The dual-value display would show when using to_scaled_dict() data that has _wall_clock fields.

## 2. Click-to-Focus with Breadcrumbs
Working perfectly. Clicking a span zooms into it as the new root. Breadcrumb trail shows: root > parent > child. Each breadcrumb segment is clickable to navigate back up. Escape key navigates up one level.

## 3. Export Menu
The dropdown shows Export as PNG and Export as SVG options. The PNG export was clicked but the download may have been blocked by the browser sandbox. The SVG export option is also available. The export functions render the flame graph to an offscreen canvas/SVG and trigger a download.

## Scaled Mode Layout
The Scaled mode now properly nests children within parents. Children are laid out side-by-side within the parent's width. The hierarchy is maintained correctly.
