# Observation 7 - Full Width Flame Graph (Panel Closed)

The flame graph looks excellent with the panel closed. Full width view shows:

Row 0: HTTP GET /api/dashboard (4.50s) - full width cyan
Row 1: Authenticatio... + Fetch Dashboard Data (4.00s) + Resp...
Row 2: JWT... Perm... + Query User Profile (DB) (800.0ms) - LANE 1
Row 3: SQL Execute: SELECT FROM... + Resu...
Row 4: Fetch Analytics (External API) (2.90s) - LANE 2
Row 5: HTTP POST analytics.service/query (2.50s) + Parse Analytics Res...
Row 6: DNS... TLS Handshake + Request/Response (2.10s)
Row 7: Load Notifications (Redi...) - LANE 3
Row 8: Redis GET not... + Deseria...

The parallel lanes are clearly visible with each async child getting its own row group.
The timeline at top shows 0s to 4.5s with nice tick marks.
Color coding: hot (red/orange) for high self-time, cool (cyan/blue) for containers.

The table below shows all 20 spans sorted by self-time, with async indicators.

This is looking very good. Now I need to:
1. Make sure the tooltip works when hovering
2. Verify the seconds/samples toggle works
3. Add some final polish
