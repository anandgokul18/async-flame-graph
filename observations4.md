# Observation 4 - Flame Only View

The flame graph in flame-only mode shows much better. I can clearly see:

1. Depth 0: "HTTP GET /api/dashboard (4.50s)" - full width cyan
2. Depth 1: "Authentic..." (small, left) + "Fetch Dashboard Data (4.00s)" (large, right) + "Res..." (tiny, far right)
3. Depth 2: Three overlapping bars at same depth:
   - "JWT... Per... Load Notifications... nal API) (2.90s)" - this is actually 3 separate bars overlapping
   - Looking more carefully at the rendering, the bars at depth 2 are:
     a. A bar from 0.3s to ~3.2s (Fetch Analytics External API) - longest, orange
     b. A bar from 0.3s to ~1.1s (Query User Profile DB) - medium, behind the first
     c. A bar from 0.3s to ~0.8s (Load Notifications Redis) - shortest, behind both
   - They all start at same x=0.3s - CORRECT async behavior
4. Depth 3: Children bars visible:
   - "Redis GET... Dese... rvice/query (2.50s)" - children of Fetch Analytics
   - "DNS... TLS Han... Request/Response (2.10s)" - deeper children
5. Depth 4: "Parse Analyti..." at the end

The overlapping at depth 2 is the KEY feature - this is exactly what the user wanted.
In d3-flame-graph, these would be stacked sequentially making total = 0.8+2.9+0.5 = 4.2s
But here they overlap correctly showing total = 4.0s (wall clock time)

Issue: The overlapping bars at depth 2 are hard to distinguish visually. 
Need to add visual separation - maybe different lane heights or subtle borders between parallel tasks.
