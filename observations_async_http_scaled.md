# Async HTTP Request - Scaled Mode

The flame graph now shows proper nesting in Scaled mode:
- HTTP GET /api/dashboard (4.50s) - full width
- Authentic... | Fetch Dashboard Data (4.00s) | Res... - nested within root, side by side
- JWT... Per... | Query User Profile (DB) (800.0ms) | Fetch Analytics (External API) (2.90s) | Load Notification... - nested within Fetch Dashboard Data
- SQL Execute: SELECT... | Res... | HTTP POST analytics.service/query (2.50s) | Parse Analyti... | Redis GE... | Dese... - nested within their parents
- DNS... | TLS Ha... | Request/Response (2.10s) - nested within HTTP POST

Children are properly nested within their parent's x-range. The concurrent children (Query User Profile, Fetch Analytics, Load Notifications) are scaled to fit within Fetch Dashboard Data's width.

This is CORRECT and matches the expected d3-flame-graph behavior!
