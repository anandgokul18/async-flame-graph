# Mode Switching Now Works!

Switching from Scaled to Wall-Clock mode with to_scaled_dict() data now works correctly:

Wall-Clock mode shows:
- do_retrieval@tools.py (2.00s) — uses _wall_clock=200 at 100Hz = 2s
- do_llm_call@llm.py (3.00s) — uses _wall_clock=300 at 100Hz = 3s
- do_tool_exec@tools.py (4.00s) — uses _wall_clock=400 at 100Hz = 4s
- All three render in PARALLEL LANES (stacked vertically, starting at same x position)
- Total remains 4.00s (max of children, not sum)

Scaled mode shows:
- do_retrieval@tools.py (880.0ms) — uses scaled value=88 at 100Hz
- do_llm_call@llm.py (1.33s) — uses scaled value=133 at 100Hz
- do_tool_exec@tools.py (1.77s) — uses scaled value=177 at 100Hz
- All three render SEQUENTIALLY (side by side, fitting within parent width)

The toggle correctly switches between both views. The auto-detection no longer overrides user's manual selection.
