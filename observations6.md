# Observation 6 - Lane Rendering with Backgrounds

The flame graph now shows parallel tasks in separate lanes with clear visual structure:

Row 0: HTTP GET /api/dashboard (4.50s) - full width cyan bar
Row 1: Authentication Middleware (left) + Fetch Dashboard Data (4.00s) (right) + Response/Compression (far right)
Row 2: JWT... Per... + Query User Profile (DB) (800.0ms) - LANE 1 (first parallel child)
Row 3: SQL Execute: SELECT... + Res... - children of Query User Profile
Row 4: Fetch Analytics (External API) (2.90s) - LANE 2 (second parallel child)
Row 5: HTTP POST analytics.service/query (2.50s) + Parse Analytics
Row 6: DNS... TLS Han... Request/Response (2.10s)
Row 7: Load Notifications... - LANE 3 (third parallel child)
Row 8: Redis GET... Dese... - children of Load Notifications

The lane backgrounds and separators are subtle but visible. The cyan left-edge indicator marks the async group.

The visualization correctly shows:
1. All 3 parallel tasks start at x=0.3s (same horizontal position)
2. Each gets its own vertical lane with children below
3. Total time = 4.0s (wall clock, not sum)
4. Self time of Fetch Dashboard Data = 1.10s (correct)

Next: Need to close the left panel and check the flame-only view for the full experience.
