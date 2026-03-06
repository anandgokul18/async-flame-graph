# Root Cause Analysis

Found the issue on line 93-95: When to_scaled_dict() data is loaded, the auto-detection sets renderMode to 'scaled'. But then when the user clicks Wall-Clock, the renderMode changes to 'wall-clock', which triggers the useEffect on line 79. The processFlameData call on line 97 passes the new renderMode.

The problem is in processSpanTree: when renderMode is 'wall-clock' and the data has _wall_clock fields, I made the fix to use _wall_clock values. But there's a subtle issue — the concurrent parent (gather@asyncio) has value=400 and its children have _wall_clock values of 200, 300, 400. In wall-clock mode, the children should use their _wall_clock values (200, 300, 400 ticks = 2s, 3s, 4s at 100Hz) and render in parallel lanes.

But the parent gather@asyncio also has value=400 (4s). So the total duration should be 4s (max of children), and children should render in parallel lanes starting at the same x position.

Let me check: with the fix, the children should get duration = _wall_clock / hz. So:
- do_retrieval: _wall_clock=200, duration = 200/100 = 2s
- do_llm_call: _wall_clock=300, duration = 300/100 = 3s  
- do_tool_exec: _wall_clock=400, duration = 400/100 = 4s

And since gather@asyncio has concurrent=true, they should all start at the same time and render in parallel lanes. The parent duration is 400/100 = 4s.

This should work. Let me check if the issue is that the auto-detection on line 93-95 is overriding the user's manual selection. Yes! That's the bug. Every time the useEffect runs (including when renderMode changes), it re-detects and forces renderMode back to 'scaled' because the data has _wall_clock fields. This creates a loop where clicking Wall-Clock sets renderMode to 'wall-clock', which triggers the effect, which sets it back to 'scaled'.
