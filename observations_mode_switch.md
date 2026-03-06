# Mode Switch Observations

Issue: When switching from Scaled to Wall-Clock mode with to_scaled_dict() data, the visualization looks the same. The children (do_retrieval 880ms, do_llm_call 1.33s, do_tool_exec 1.77s) are still shown side-by-side sequentially instead of in parallel lanes with their true wall-clock durations (2s, 3s, 4s).

The problem is that when switching modes, the data is re-processed from the raw JSON. The fix I made to processSpanTree should use _wall_clock values in wall-clock mode. But looking at the screenshot, the durations shown in the table are still the scaled values (880ms, 1.33s, 1.77s), not the wall-clock values (2s, 3s, 4s).

Need to check: Is the renderMode being passed correctly when re-processing? The data re-processing happens in Home.tsx when renderMode changes.

Also need to verify: The concurrent parent (gather@asyncio) should show children in parallel lanes in wall-clock mode, but they're still sequential.
