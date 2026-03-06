# Scaled Layout Fix Observations

## to_scaled_dict() sample data
The flame graph now shows proper nesting:
- root@ (4.00s) - full width, cyan
- invoke_analect@confucius.py (4.00s) - nested within root, slightly narrower, orange
- gather@asyncio (4.00s) - nested within invoke_analect, orange
- do_retrieval@tools.py (880.0ms), do_llm_call@llm.py (1.33s), do_tool_exec@tools.py (1.77s) - all nested within gather@asyncio, laid out side by side (scaled to fit)

This is CORRECT! The children are properly nested within their parent's x-range.
The concurrent children (do_retrieval, do_llm_call, do_tool_exec) are scaled to fit within gather@asyncio's width.

## Need to also test with to_dict() Wall-Clock mode
And test with the Async HTTP Request sample.
