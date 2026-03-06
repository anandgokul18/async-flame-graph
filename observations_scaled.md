# Scaled Mode Observations

Switching to Scaled mode works correctly:
- The three children now render side-by-side within the parent's width (not in parallel lanes)
- do_retrieval@tools.py (2.00s) takes ~22% of the width (200/900)
- do_llm_call@llm.py (3.00s) takes ~33% of the width (300/900)
- do_tool_exec@tools.py (4.00s) takes ~44% of the width (400/900)
- They fit perfectly within the gather@asyncio parent bar
- The "Scaled" button is now highlighted (active)
- Total still shows 4.000s correctly

Both modes are working as expected. The toggle between Wall-Clock and Scaled is functional.
