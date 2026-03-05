# Observation 2 - Flame Graph with Sample Data

## What's Working Well
1. Timeline axis at top: 0s, 500ms, 1.00s, 1.50s, 2.00s, 2.50s, 3.00s, 3.50s, 4.00s, 4.50s - CORRECT
2. Root span "HTTP GET /api/dashboard (4.50s)" - full width cyan bar
3. "Authentication Middleware" + "Fetch Dashboard Data (4.00s)" shown as children at depth 1
4. Async children visible: 
   - "JWT... Per... Load Notifications... nal API) (2.90s)" - these are parallel tasks
   - "Redis GET... Dese... rvice/query (2.50s)" 
   - "DNS... TLS Han... Request/Response (2.10s)"
5. Grid lines visible in background
6. Table below shows "Fetch Dashboard Data" with Self=1.10s (correct! 4.0s - 2.9s parallel coverage = 1.1s)
7. Self time calculation now correctly uses max for async instead of sum

## Visual Issues
1. The parallel children are shown at different depth levels (depth 3, 4, 5) instead of at the SAME depth
   - This is because the children of "Fetch Dashboard Data" have their own children
   - Actually looking more carefully: Query User Profile, Fetch Analytics, Load Notifications all start at the same x position (0.3s) - CORRECT
   - They are at depth 2 (same level) - the bars below them are THEIR children
2. The bars look good with rounded corners and dark borders
3. Color coding: warm (orange/red) for high self-time, cool (cyan/blue) for low self-time

## The KEY async feature is working:
- "Fetch Dashboard Data" has async:true
- Its 3 children (Query User Profile, Fetch Analytics, Load Notifications) all start at 0.3s
- They overlap in time correctly
- Total time = 4.0s (not 0.8+2.9+0.5 = 4.2s)
- The flame graph shows them overlapping at the same depth level
