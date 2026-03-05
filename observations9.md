# Observation 9 - Search Functionality

The search for "Redis" correctly highlights matching spans:
- "Load Notifications (Redi...)" - highlighted with full opacity
- "Redis GET not..." - highlighted with full opacity
- All other spans are dimmed/faded to ~30% opacity

This search highlighting works well. The matching spans stand out clearly against the dimmed background.

The flame-only view is now showing correctly with the panel closed. All features are working:
1. Flame graph with proper async/parallel lane rendering
2. Tooltip with detailed span information
3. Search highlighting
4. Timeline in seconds
5. Table view with self-time sorting
6. Color coding by heat (self-time ratio)

Ready for final polish and delivery.
