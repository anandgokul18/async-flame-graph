# Wall-Clock Mode Fix Observations

## to_scaled_dict() data in Wall-Clock mode
The flame graph now shows:
- root@ (4.00s) - full width, cyan
- invoke_analect@confucius.py (4.00s) - nested within root
- gather@asyncio (4.00s) - nested within invoke_analect
- do_retrieval@tools.py (2.00s) - in its own lane, using _wall_clock value
- do_llm_call@llm.py (3.00s) - in its own lane, using _wall_clock value
- do_tool_exec@tools.py (4.00s) - in its own lane, using _wall_clock value

This is CORRECT! The parallel children are in separate lanes with their true wall-clock durations.
The _wall_clock values (200, 300, 400 samples / 100 Hz = 2.00s, 3.00s, 4.00s) are properly used.

## Both modes working correctly now!
- Scaled: children nested within parent, concurrent children scaled to fit side-by-side
- Wall-Clock: children in parallel lanes with true durations from _wall_clock
