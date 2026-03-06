# Breadcrumb Feature Test

The breadcrumb is working. After clicking on "Fetch Analytics (External API)" span:
- Breadcrumb shows: root > HTTP GET /api/dashboard > Fetch Dashboard Data > Fetch Analytics (External API)
- The focused span is highlighted in amber in the toolbar: "Focused: Fetch Analyti..."
- The flame graph zoomed into the focused span's subtree
- Each breadcrumb segment is clickable to navigate back up the hierarchy
- The "root" button at the start allows resetting to the full view

All three features are visible:
1. Breadcrumb navigation - working
2. Export button in header - visible, need to test
3. Dual-value tooltip - need to test in Scaled mode
